"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { hashPassword, passwordSchema } from "@/lib/auth/password";
import { logActivity } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { sendSystemMail, systemMailConfigured } from "@/services/mailer";
import type { FormState } from "./actions";

/** Réponse identique que le compte existe ou non (pas d'énumération d'utilisateurs). */
export async function forgotAction(_: FormState, fd: FormData): Promise<FormState & { sent?: boolean; devLink?: string }> {
  if (!rateLimit(`forgot:${await clientIp()}`, 10, 60_000)) return { error: "Trop de tentatives." };
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  if (!email.success) return { error: "Email invalide." };
  const user = await db.user.findUnique({ where: { email: email.data } });
  if (!rateLimit(`forgot-acct:${email.data}`, 3, 15 * 60_000)) return { sent: true }; // même réponse : pas d'indice
  let devLink: string | undefined;
  if (user && !user.deletedAt) {
    const token = randomToken();
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) } });
    const base = process.env.APP_URL;
    if (!base) console.error("[reset] APP_URL non défini : lien de réinitialisation impossible à construire");
    else {
      const link = `${base.replace(/\/$/, "")}/reset/${token}`;
      if (systemMailConfigured()) {
        try { await sendSystemMail({ to: user.email, subject: "Réinitialisation de votre mot de passe", text: `Bonjour,\n\nPour choisir un nouveau mot de passe (lien valable 1 heure) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.` }); }
        catch (e) { console.error("[reset] échec d'envoi du mail :", e instanceof Error ? e.message : e); }
      } else if (process.env.NODE_ENV !== "production") { console.log("[reset] lien :", link); devLink = link; }
      else console.error("[reset] SMTP_HOST/SMTP_FROM non configurés : aucun mail envoyé");
    }
    await logActivity("auth.reset_requested", { userId: user.id });
  }
  return { sent: true, devLink };
}

export async function resetAction(token: string, _: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`reset:${await clientIp()}`, 10, 60_000)) return { error: "Trop de tentatives." };
  const pw = passwordSchema.safeParse(fd.get("password"));
  if (!pw.success) return { fieldErrors: { password: pw.error.issues.map((i) => i.message) } };
  const t = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!t || t.usedAt || t.expiresAt < new Date()) return { error: "Lien invalide ou expiré." };
  await db.$transaction([
    db.user.update({ where: { id: t.userId }, data: { passwordHash: await hashPassword(pw.data) } }),
    db.passwordResetToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: t.userId } }), // révoque toutes les sessions
  ]);
  await logActivity("auth.password_reset", { userId: t.userId });
  redirect("/login");
}
