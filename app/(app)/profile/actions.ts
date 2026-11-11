"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/log";

const csv = (s: string) => [...new Set(s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 50);

const schema = z.object({
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  phone: z.string().trim().max(30),
  formation: z.string().trim().max(200),
  studyYear: z.enum(["B1", "B2", "B3", "B4", ""]),
  goal: z.enum(["STAGE", "ALTERNANCE"]),
  locations: z.string().max(500),
  keywords: z.string().max(500),
  skills: z.string().max(2000),
  dailySendLimit: z.coerce.number().int().min(1).max(50),
});

export type ProfileState = { error?: string; ok?: boolean } | undefined;

export async function saveProfileAction(_: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const r = schema.safeParse(Object.fromEntries(fd));
  if (!r.success) return { error: "Certains champs sont invalides." };
  const d = r.data;
  const profile = await db.studentProfile.update({
    where: { userId: user.id },
    data: {
      firstName: d.firstName || null, lastName: d.lastName || null, phone: d.phone || null,
      formation: d.formation || null, studyYear: d.studyYear || null, goal: d.goal,
      locations: csv(d.locations), keywords: csv(d.keywords), dailySendLimit: d.dailySendLimit,
    },
  });
  // Les compétences saisies remplacent la liste : l'étudiant est la source de vérité.
  const names = csv(d.skills);
  const current = await db.skill.findMany({ where: { profileId: profile.id } });
  const have = new Set(current.map((s) => s.name));
  await db.$transaction([
    db.skill.deleteMany({ where: { profileId: profile.id, name: { notIn: names } } }),
    db.skill.createMany({ data: names.filter((n) => !have.has(n)).map((name) => ({ name, profileId: profile.id, category: "technologie" })), skipDuplicates: true }),
  ]);
  await logActivity("profile.update", { userId: user.id });
  revalidatePath("/profile");
  return { ok: true };
}
