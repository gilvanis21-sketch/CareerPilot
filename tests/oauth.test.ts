import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const upsert = vi.fn(); const update = vi.fn();
vi.mock("@/lib/db", () => ({ db: { emailAccount: { upsert: (a: unknown) => upsert(a), update: (a: unknown) => update(a) } } }));

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "0123456789abcdef".repeat(4);
  process.env.APP_URL = "http://localhost:3112";
  Object.assign(process.env, { GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gsec", MICROSOFT_CLIENT_ID: "mid", MICROSOFT_CLIENT_SECRET: "msec" });
});
afterEach(() => { vi.unstubAllGlobals(); upsert.mockReset(); update.mockReset(); });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("OAuth2 : démarrage, état et PKCE", () => {
  it("construit l'URL Google avec PKCE S256, état et portée d'envoi seule", async () => {
    const { newAuthRequest } = await import("@/services/oauth");
    const { url } = newAuthRequest("GMAIL", "u1");
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("redirect_uri")).toBe("http://localhost:3112/api/oauth/gmail/callback");
    expect(u.searchParams.get("scope")).toContain("gmail.send");
    expect(u.searchParams.get("scope")).not.toMatch(/gmail\.(readonly|modify)|mail\.google\.com/);
    expect(u.searchParams.get("access_type")).toBe("offline");
  });
  it("construit l'URL Microsoft (comptes personnels et pro) avec Mail.Send", async () => {
    const { newAuthRequest } = await import("@/services/oauth");
    const u = new URL(newAuthRequest("OUTLOOK", "u1").url);
    expect(u.pathname).toBe("/common/oauth2/v2.0/authorize");
    expect(u.searchParams.get("scope")).toBe("offline_access User.Read Mail.Send");
  });
  it("n'accepte le retour que pour le bon état, fournisseur et utilisateur", async () => {
    const { newAuthRequest, readAuthCookie } = await import("@/services/oauth");
    const r = newAuthRequest("GMAIL", "u1");
    const state = new URL(r.url).searchParams.get("state")!;
    expect(readAuthCookie(r.cookie, "GMAIL", "u1", state)).toBeTruthy();
    expect(readAuthCookie(r.cookie, "GMAIL", "u1", "autre")).toBeNull();
    expect(readAuthCookie(r.cookie, "GMAIL", "u2", state)).toBeNull();
    expect(readAuthCookie(r.cookie, "OUTLOOK", "u1", state)).toBeNull();
    expect(readAuthCookie(undefined, "GMAIL", "u1", state)).toBeNull();
    expect(readAuthCookie(r.cookie.slice(0, -4) + "AAAA", "GMAIL", "u1", state)).toBeNull(); // cookie falsifié
  });
  it("le vérificateur PKCE correspond au défi envoyé", async () => {
    const { createHash } = await import("node:crypto");
    const { newAuthRequest, readAuthCookie } = await import("@/services/oauth");
    const r = newAuthRequest("GMAIL", "u1"); const sp = new URL(r.url).searchParams;
    const v = readAuthCookie(r.cookie, "GMAIL", "u1", sp.get("state"))!;
    expect(createHash("sha256").update(v).digest("base64url")).toBe(sp.get("code_challenge"));
  });
});

describe("OAuth2 : jetons", () => {
  it("échange le code, lit l'adresse et enregistre les jetons chiffrés", async () => {
    const calls: { url: string; body?: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body?.toString() });
      return url.includes("oauth2.googleapis.com/token") ? json({ access_token: "AT", refresh_token: "RT", expires_in: 3600 }) : json({ email: "Camille@Gmail.com" });
    }));
    const o = await import("@/services/oauth");
    const t = await o.exchangeCode("GMAIL", "CODE", "VERIF");
    expect(calls[0].body).toContain("code_verifier=VERIF");
    expect(calls[0].body).toContain("grant_type=authorization_code");
    const addr = await o.fetchAddress("GMAIL", t.access_token);
    expect(addr).toBe("camille@gmail.com");
    await o.saveOAuthAccount("u1", "GMAIL", addr, t);
    const d = upsert.mock.calls[0][0].create;
    expect(d.accessTokenEnc).not.toContain("AT"); expect(d.refreshTokenEnc).not.toContain("RT");
    const { decrypt } = await import("@/lib/crypto");
    expect(decrypt(d.refreshTokenEnc)).toBe("RT");
  });
  it("refuse un compte sans jeton de renouvellement", async () => {
    const { saveOAuthAccount } = await import("@/services/oauth");
    await expect(saveOAuthAccount("u1", "GMAIL", "a@b.fr", { access_token: "x" })).rejects.toThrow();
  });
  it("lit l'adresse Microsoft (mail, sinon userPrincipalName)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ mail: null, userPrincipalName: "Moi@Outlook.fr" })));
    const { fetchAddress } = await import("@/services/oauth");
    expect(await fetchAddress("OUTLOOK", "x")).toBe("moi@outlook.fr");
  });
  it("réutilise un jeton valide, le renouvelle sinon (et garde le nouveau jeton de renouvellement)", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const { freshAccessToken } = await import("@/services/oauth");
    const base = { id: "a1", provider: "OUTLOOK" as const, accessTokenEnc: encrypt("VIEUX"), refreshTokenEnc: encrypt("RT1") };
    const f = vi.fn<typeof fetch>(async () => json({ access_token: "NEUF", refresh_token: "RT2", expires_in: 3600 })); vi.stubGlobal("fetch", f);
    expect(await freshAccessToken({ ...base, expiresAt: new Date(Date.now() + 600_000) })).toBe("VIEUX");
    expect(f).not.toHaveBeenCalled();
    expect(await freshAccessToken({ ...base, expiresAt: new Date(Date.now() - 1000) })).toBe("NEUF");
    expect(f.mock.calls[0][1]!.body!.toString()).toContain("grant_type=refresh_token");
    expect(update.mock.calls[0][0].data.refreshTokenEnc).toBeTruthy();
  });
  it("signale une autorisation retirée (invalid_grant) comme à reconnecter", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "invalid_grant" }, 400)));
    const { encrypt } = await import("@/lib/crypto");
    const { freshAccessToken } = await import("@/services/oauth");
    const { friendlyMailError } = await import("@/services/mailer");
    const err = await freshAccessToken({ id: "a", provider: "GMAIL", accessTokenEnc: encrypt("x"), refreshTokenEnc: encrypt("r"), expiresAt: null }).catch((e) => e);
    expect(friendlyMailError(err, "GMAIL")).toMatch(/reconnectez/);
  });
});

describe("envoi par API", () => {
  it("Gmail : envoie un MIME base64url depuis l'adresse de l'étudiant", async () => {
    const f = vi.fn(async () => json({ id: "m1" })); vi.stubGlobal("fetch", f);
    const { sendMailOAuth } = await import("@/services/mailer");
    await sendMailOAuth({ provider: "GMAIL", address: "camille@gmail.com", accessToken: "AT", to: "rh@exemple.fr", subject: "Candidature – é", text: "Bonjour", fromName: "Camille Dupont" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer AT");
    const mime = Buffer.from(JSON.parse(init.body as string).raw, "base64url").toString();
    expect(mime).toMatch(/From: "?Camille Dupont"? <camille@gmail.com>/);
    expect(mime).toContain("To: rh@exemple.fr");
  });
  it("Microsoft Graph : envoie via /me/sendMail", async () => {
    const f = vi.fn(async () => new Response(null, { status: 202 })); vi.stubGlobal("fetch", f);
    const { sendMailOAuth } = await import("@/services/mailer");
    await sendMailOAuth({ provider: "OUTLOOK", address: "moi@outlook.fr", accessToken: "AT", to: "rh@exemple.fr", subject: "S", text: "Corps" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.microsoft.com/v1.0/me/sendMail");
    const b = JSON.parse(init.body as string);
    expect(b.message.toRecipients[0].emailAddress.address).toBe("rh@exemple.fr");
    expect(b.message.body.content).toBe("Corps");
  });
  it("traduit un refus d'API en message clair, sans fuite", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: { message: "Insufficient Permission" } }, 403)));
    const { sendMailOAuth, friendlyMailError } = await import("@/services/mailer");
    const e = await sendMailOAuth({ provider: "GMAIL", address: "a@b.fr", accessToken: "SECRET-AT", to: "x@y.fr", subject: "s", text: "t" }).catch((x) => x);
    expect(friendlyMailError(e, "GMAIL")).toMatch(/reconnectez/);
    expect(friendlyMailError(e, "GMAIL")).not.toContain("SECRET-AT");
  });
});
