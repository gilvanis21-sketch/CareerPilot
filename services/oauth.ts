import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";

/** Connexion OAuth2 (code + PKCE) à Gmail et à Outlook / Microsoft 365. Aucun mot de passe n'est stocké. */
export type OAuthProvider = "GMAIL" | "OUTLOOK";

const CFG = {
  GMAIL: {
    slug: "gmail", label: "Google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    // gmail.send : permission d'envoyer uniquement (pas de lecture de la boîte).
    scope: "openid email https://www.googleapis.com/auth/gmail.send",
    extra: { access_type: "offline", prompt: "consent" } as Record<string, string>,
    idEnv: "GOOGLE_CLIENT_ID", secretEnv: "GOOGLE_CLIENT_SECRET",
  },
  OUTLOOK: {
    slug: "outlook", label: "Microsoft",
    // "common" : comptes personnels (outlook.com, hotmail, live) ET comptes professionnels/scolaires.
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "offline_access User.Read Mail.Send",
    extra: { prompt: "select_account" } as Record<string, string>,
    idEnv: "MICROSOFT_CLIENT_ID", secretEnv: "MICROSOFT_CLIENT_SECRET",
  },
} as const;

export const providerFromSlug = (s: string): OAuthProvider | null => (s === "gmail" ? "GMAIL" : s === "outlook" ? "OUTLOOK" : null);
export const oauthConfigured = (p: OAuthProvider) => !!(process.env[CFG[p].idEnv] && process.env[CFG[p].secretEnv]);
export const oauthLabel = (p: OAuthProvider) => CFG[p].label;
export const redirectUri = (p: OAuthProvider) => `${(process.env.APP_URL ?? "http://localhost:3112").replace(/\/$/, "")}/api/oauth/${CFG[p].slug}/callback`;

const b64url = (b: Buffer) => b.toString("base64url");

/** État anti-CSRF + vérificateur PKCE, conservés dans un cookie chiffré (AES-GCM, donc inviolable) de 10 minutes. */
export function newAuthRequest(p: OAuthProvider, userId: string) {
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const c = CFG[p];
  const url = new URL(c.authUrl);
  const params: Record<string, string> = {
    client_id: process.env[c.idEnv]!, redirect_uri: redirectUri(p), response_type: "code", scope: c.scope,
    state, code_challenge: challenge, code_challenge_method: "S256", ...c.extra,
  };
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return { url: url.toString(), cookie: encrypt(JSON.stringify({ state, verifier, p, userId, exp: Date.now() + 600_000 })) };
}

export function readAuthCookie(raw: string | undefined, p: OAuthProvider, userId: string, state: string | null): string | null {
  if (!raw || !state) return null;
  try {
    const j = JSON.parse(decrypt(raw)) as { state: string; verifier: string; p: string; userId: string; exp: number };
    if (j.p !== p || j.userId !== userId || j.state !== state || j.exp < Date.now()) return null;
    return j.verifier;
  } catch { return null; }
}

type Tokens = { access_token: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };

async function tokenRequest(p: OAuthProvider, body: Record<string, string>): Promise<Tokens> {
  const c = CFG[p];
  const r = await fetch(c.tokenUrl, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ client_id: process.env[c.idEnv]!, client_secret: process.env[c.secretEnv]!, ...body }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = (await r.json().catch(() => ({}))) as Tokens;
  if (!r.ok || !j.access_token) throw new Error(`OAuth ${j.error ?? r.status}`); // jamais le détail brut (peut contenir des identifiants)
  return j;
}

export const exchangeCode = (p: OAuthProvider, code: string, verifier: string) =>
  tokenRequest(p, { grant_type: "authorization_code", code, redirect_uri: redirectUri(p), code_verifier: verifier });

/** Adresse du compte qui vient d'autoriser l'application. */
export async function fetchAddress(p: OAuthProvider, accessToken: string): Promise<string> {
  const url = p === "GMAIL" ? "https://openidconnect.googleapis.com/v1/userinfo" : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
  const r = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Profil ${r.status}`);
  const j = (await r.json()) as { email?: string; mail?: string; userPrincipalName?: string };
  const a = (j.email ?? j.mail ?? j.userPrincipalName ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+$/.test(a)) throw new Error("Adresse introuvable dans le profil");
  return a;
}

export async function saveOAuthAccount(userId: string, p: OAuthProvider, address: string, t: Tokens) {
  if (!t.refresh_token) throw new Error("Aucun jeton de renouvellement reçu");
  const data = {
    provider: p, accessTokenEnc: encrypt(t.access_token), refreshTokenEnc: encrypt(t.refresh_token),
    expiresAt: new Date(Date.now() + (t.expires_in ?? 3600) * 1000),
  };
  await db.emailAccount.upsert({ where: { userId_address: { userId, address } }, update: data, create: { userId, address, ...data } });
}

/** Jeton d'accès valide : réutilisé s'il l'est encore, sinon renouvelé avec le jeton de renouvellement. */
export async function freshAccessToken(acc: { id: string; provider: OAuthProvider; accessTokenEnc: string; refreshTokenEnc: string | null; expiresAt: Date | null }): Promise<string> {
  if (acc.expiresAt && acc.expiresAt.getTime() > Date.now() + 60_000) return decrypt(acc.accessTokenEnc);
  if (!acc.refreshTokenEnc) throw new Error("OAuth reconnect");
  let t: Tokens;
  try { t = await tokenRequest(acc.provider, { grant_type: "refresh_token", refresh_token: decrypt(acc.refreshTokenEnc), scope: CFG[acc.provider].scope }); }
  catch (e) { if (/invalid_grant|invalid_client|unauthorized/i.test(String(e))) throw new Error("OAuth reconnect"); throw e; }
  await db.emailAccount.update({
    where: { id: acc.id },
    data: {
      accessTokenEnc: encrypt(t.access_token), expiresAt: new Date(Date.now() + (t.expires_in ?? 3600) * 1000),
      ...(t.refresh_token ? { refreshTokenEnc: encrypt(t.refresh_token) } : {}), // Microsoft fait tourner le jeton de renouvellement
    },
  });
  return t.access_token;
}
