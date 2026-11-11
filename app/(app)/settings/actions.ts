"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, destroySession, destroyOtherSessions } from "@/lib/auth/session";
import { verifyPassword, hashPassword, passwordSchema } from "@/lib/auth/password";
import { deleteUserFiles } from "@/lib/storage";
import { logActivity } from "@/lib/log";

export type SettingsState = { error?: string; ok?: string } | undefined;

export async function savePrefsAction(_: SettingsState, fd: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const days = z.array(z.coerce.number().int().min(1).max(60)).max(5)
    .safeParse(String(fd.get("followUpDays") ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  if (!days.success) return { error: "Jours de relance invalides (ex : 7, 15)." };
  const aiConsent = fd.get("aiConsent") === "on";
  await db.studentProfile.update({ where: { userId: user.id }, data: { followUpDays: days.data, anonymizeForAi: fd.get("anonymize") === "on" } });
  if (aiConsent !== !!user.aiConsentAt) {
    await db.user.update({ where: { id: user.id }, data: { aiConsentAt: aiConsent ? new Date() : null } });
    await logActivity(aiConsent ? "consent.ai_granted" : "consent.ai_revoked", { userId: user.id });
  }
  revalidatePath("/settings");
  return { ok: "Préférences enregistrées ✓" };
}

export async function changePasswordAction(_: SettingsState, fd: FormData): Promise<SettingsState> {
  const user = await requireUser();
  if (!(await verifyPassword(String(fd.get("current")), user.passwordHash))) return { error: "Mot de passe actuel incorrect." };
  const pw = passwordSchema.safeParse(fd.get("next"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(pw.data) } });
  await destroyOtherSessions(user.id); // révoque les autres appareils
  await logActivity("auth.password_changed", { userId: user.id });
  return { ok: "Mot de passe modifié ✓" };
}

export async function deleteAccountAction(_: SettingsState, fd: FormData): Promise<SettingsState> {
  const user = await requireUser();
  if (fd.get("confirm") !== "SUPPRIMER") return { error: "Tapez SUPPRIMER pour confirmer." };
  if (!(await verifyPassword(String(fd.get("password")), user.passwordHash))) return { error: "Mot de passe incorrect." };
  await db.user.delete({ where: { id: user.id } }); // cascade : profil, CV, candidatures, etc. (d'abord la base : si elle échoue, rien n'est perdu)
  await deleteUserFiles(user.id);
  await logActivity("account.deleted", { userId: null, meta: { ref: user.id.slice(0, 6) } }); // trace non nominative
  await destroySession();
  redirect("/login");
}
