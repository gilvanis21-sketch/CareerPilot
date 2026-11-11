import "server-only";
import nodemailer from "nodemailer";

export type Provider = "GMAIL" | "OUTLOOK";

const HOSTS: Record<Provider, { host: string; port: number; secure: boolean }> = {
  GMAIL: { host: "smtp.gmail.com", port: 465, secure: true },
  OUTLOOK: { host: "smtp.office365.com", port: 587, secure: false },
};

/**
 * Serveur SMTP fictif pour les tests. Actif uniquement si MAIL_HOST_OVERRIDE est défini ET que l'on n'est pas en
 * production, sauf pour la recette automatisée qui tourne sur un build de production et doit poser
 * ALLOW_MAIL_OVERRIDE=I_AM_RUNNING_TESTS. Ne JAMAIS définir ces variables en exploitation.
 */
const overrideAllowed = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_MAIL_OVERRIDE === "I_AM_RUNNING_TESTS";
function target(provider: Provider) {
  if (process.env.MAIL_HOST_OVERRIDE && overrideAllowed()) {
    return { host: process.env.MAIL_HOST_OVERRIDE, port: Number(process.env.MAIL_PORT_OVERRIDE ?? 2525), secure: false, ignoreTLS: true };
  }
  return HOSTS[provider];
}

function transport(provider: Provider, address: string, password: string) {
  const t = target(provider);
  return nodemailer.createTransport({
    ...t,
    requireTLS: provider === "OUTLOOK" && !("ignoreTLS" in t),
    auth: process.env.MAIL_HOST_OVERRIDE && overrideAllowed() ? undefined : { user: address, pass: password },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
  });
}

/** Mail applicatif (réinitialisation de mot de passe) via SMTP_HOST/PORT/USER/PASS/FROM. */
export const systemMailConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_FROM);
export async function sendSystemMail(a: { to: string; subject: string; text: string }) {
  if (!systemMailConfigured()) throw new Error("SMTP non configuré");
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
  });
  await t.sendMail({ from: process.env.SMTP_FROM, to: a.to, subject: a.subject, text: a.text });
}

/** Vérifie les identifiants AVANT de les enregistrer. */
export async function verifyAccount(provider: Provider, address: string, password: string) {
  await transport(provider, address, password).verify();
}

export async function sendMail(a: { provider: Provider; address: string; password: string; to: string; subject: string; text: string; fromName?: string }) {
  const info = await transport(a.provider, a.address, a.password).sendMail({
    from: a.fromName ? { name: a.fromName, address: a.address } : a.address, // toujours l'adresse de l'étudiant
    to: a.to, subject: a.subject, text: a.text,
  });
  return { messageId: info.messageId };
}

/** Message d'erreur lisible, sans fuite d'identifiants. */
export function friendlyMailError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/535|Invalid login|AUTH|Username and Password/i.test(m)) return "Identifiants refusés. Gmail : utilisez un mot de passe d'application (validation en 2 étapes requise).";
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(m)) return "Serveur de messagerie injoignable.";
  return "Échec de l'envoi : " + m.slice(0, 120);
}
