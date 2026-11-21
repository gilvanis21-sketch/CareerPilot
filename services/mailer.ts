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

type MailArgs = { provider: Provider; address: string; to: string; subject: string; text: string; fromName?: string };

/**
 * Envoi par OAuth2 : API Gmail (gmail.send) ou Microsoft Graph (Mail.Send), sans SMTP ni mot de passe.
 * Le message part de l'adresse connectée ; il apparaît dans « Envoyés ».
 */
export async function sendMailOAuth(a: MailArgs & { accessToken: string }) {
  const headers = { authorization: `Bearer ${a.accessToken}`, "content-type": "application/json" };
  if (a.provider === "GMAIL") {
    const built = await nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" }).sendMail({
      from: a.fromName ? { name: a.fromName, address: a.address } : a.address, to: a.to, subject: a.subject, text: a.text,
    });
    const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST", headers, body: JSON.stringify({ raw: (built.message as Buffer).toString("base64url") }), signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) throw new Error(`Gmail API ${r.status} ${await apiError(r)}`);
    return { messageId: ((await r.json().catch(() => ({}))) as { id?: string }).id ?? "" };
  }
  const r = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST", headers, signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ message: { subject: a.subject, body: { contentType: "Text", content: a.text }, toRecipients: [{ emailAddress: { address: a.to } }] }, saveToSentItems: true }),
  });
  if (!r.ok) throw new Error(`Graph API ${r.status} ${await apiError(r)}`);
  return { messageId: "" }; // Graph répond 202 sans identifiant
}

async function apiError(r: Response): Promise<string> {
  const j = (await r.json().catch(() => undefined)) as { error?: { message?: string; code?: string } | string } | undefined;
  const e = j?.error;
  return (typeof e === "string" ? e : e?.message ?? e?.code ?? "").slice(0, 150);
}

export async function sendMail(a: MailArgs & { password: string }) {
  const info = await transport(a.provider, a.address, a.password).sendMail({
    from: a.fromName ? { name: a.fromName, address: a.address } : a.address, // toujours l'adresse de l'étudiant
    to: a.to, subject: a.subject, text: a.text,
  });
  return { messageId: info.messageId };
}

/** Message d'erreur lisible, sans fuite d'identifiants. */
export function friendlyMailError(e: unknown, provider?: Provider): string {
  const m = e instanceof Error ? e.message : String(e);
  // Outlook.com / Hotmail / Live : Microsoft a coupé l'authentification SMTP par mot de passe (5.7.3 / 5.7.139 / SmtpClientAuthentication).
  if (/OAuth reconnect/.test(m)) return "L'autorisation de votre messagerie a expiré ou a été retirée : reconnectez-la dans Paramètres.";
  if (/(Gmail|Graph) API (401|403)/.test(m)) return "Votre messagerie a refusé l'envoi (autorisation insuffisante ou retirée) : reconnectez-la dans Paramètres.";
  if (/(Gmail|Graph) API 429/.test(m)) return "Limite d'envoi du fournisseur atteinte : réessayez plus tard.";
  if (provider === "OUTLOOK" && /5\.7\.(3|139)|SmtpClientAuthentication|basic auth|Authentication unsuccessful/i.test(m))
    return "Microsoft refuse la connexion par mot de passe (SMTP AUTH désactivé). Un compte Outlook/Hotmail personnel ne peut plus se connecter ainsi : utilisez Gmail (mot de passe d'application), ou un compte Microsoft 365 dont l'administrateur a activé « SMTP authentifié ».";
  if (provider === "GMAIL" && /5\.7\.8|BadCredentials|535|Invalid login|Username and Password/i.test(m))
    return "Gmail refuse ces identifiants. Utilisez un mot de passe d'application de 16 caractères (compte Google → Sécurité → Validation en 2 étapes → Mots de passe d'application), pas votre mot de passe habituel.";
  if (/535|Invalid login|AUTH|Username and Password/i.test(m)) return "Identifiants refusés. Gmail : utilisez un mot de passe d'application (validation en 2 étapes requise).";
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ESOCKET|ECONNRESET/i.test(m)) return "Serveur de messagerie injoignable.";
  return "Échec de l'envoi : " + m.replace(/\s+/g, " ").slice(0, 120);
}
