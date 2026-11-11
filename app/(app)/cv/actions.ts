"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { saveResume, deleteResume } from "@/lib/storage";
import { extractText, parseResumeText } from "@/services/cv-parser";
import { logActivity } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const MAX = 5 * 1024 * 1024;

export type CvState = { error?: string; ok?: string } | undefined;

export async function uploadCvAction(_: CvState, fd: FormData): Promise<CvState> {
  const user = await requireUser();
  if (!rateLimit(`cv:${user.id}`, 10, 60_000)) return { error: "Trop d'imports rapprochés." };
  const file = fd.get("cv");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier." };
  if (file.size > MAX) return { error: "Fichier trop volumineux (5 Mo max)." };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext];
  if (!mime) return { error: "Formats acceptés : PDF ou DOCX." };

  const buf = Buffer.from(await file.arrayBuffer());
  let text: string;
  try { text = await extractText(buf, mime); } catch (e) {
    return { error: e instanceof Error ? e.message : "Lecture du fichier impossible." };
  }
  if (text.trim().length < 20) return { error: "Aucun texte exploitable (PDF scanné ?)." };

  const parsed = parseResumeText(text);
  const rel = await saveResume(user.id, buf, `.${ext}`);
  try {
    // Anciennes versions conservées (traçabilité), supprimables depuis la page.
    await db.$transaction([
      db.resume.updateMany({ where: { userId: user.id }, data: { isActive: false } }),
      db.resume.create({
        data: {
          userId: user.id, fileName: file.name.slice(0, 120), mimeType: mime, sizeBytes: file.size,
          storagePath: rel, extractedText: text, parsedJson: parsed as object,
        },
      }),
    ]);
  } catch (e) {
    await deleteResume(rel).catch(() => {}); // pas de fichier orphelin
    throw e;
  }

  // Pré-remplissage du profil uniquement pour les champs vides : l'utilisateur garde la main.
  const p = await db.studentProfile.findUniqueOrThrow({ where: { userId: user.id } });
  await db.studentProfile.update({
    where: { id: p.id },
    data: {
      firstName: p.firstName ?? parsed.firstName,
      lastName: p.lastName ?? parsed.lastName,
      phone: p.phone ?? parsed.phone,
      formation: p.formation ?? parsed.formation,
      studyYear: p.studyYear ?? parsed.studyYear,
    },
  });
  const existing = new Set((await db.skill.findMany({ where: { profileId: p.id } })).map((s) => s.name.toLowerCase()));
  const langs = parsed.languages.map((name) => ({ name, category: "langue" }));
  const techs = parsed.skills.map((name) => ({ name, category: "technologie" }));
  await db.skill.createMany({
    data: [...techs, ...langs].filter((s) => !existing.has(s.name.toLowerCase())).map((s) => ({ ...s, profileId: p.id, fromResume: true })),
    skipDuplicates: true,
  });
  await logActivity("cv.upload", { userId: user.id, meta: { size: file.size, ext } });
  revalidatePath("/cv"); revalidatePath("/profile");
  return { ok: `CV analysé : ${parsed.skills.length} technologies détectées. Vérifiez votre profil.` };
}

export async function deleteCvAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const r = await db.resume.findFirst({ where: { id, userId: user.id } }); // isolation par userId
  if (!r) return;
  await deleteResume(r.storagePath);
  await db.resume.delete({ where: { id } });
  await logActivity("cv.delete", { userId: user.id, entityId: id });
  revalidatePath("/cv");
}
