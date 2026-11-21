import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const upsert = vi.fn();
let user: { id: string } | null = { id: "u1" };
vi.mock("@/lib/db", () => ({ db: { emailAccount: { upsert: (a: unknown) => upsert(a) } } }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => user }));
vi.mock("@/lib/log", () => ({ logActivity: async () => {} }));

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "0123456789abcdef".repeat(4);
  process.env.APP_URL = "http://localhost:3112";
  Object.assign(process.env, { GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gsec", MICROSOFT_CLIENT_ID: "mid", MICROSOFT_CLIENT_SECRET: "msec" });
});
afterEach(() => { vi.unstubAllGlobals(); upsert.mockReset(); user = { id: "u1" }; });
const ctx = (provider: string) => ({ params: Promise.resolve({ provider }) });
const { NextRequest } = await import("next/server");
const req = (path: string, cookie?: string) => new NextRequest(`http://localhost:3112${path}`, { headers: cookie ? { cookie } : {} });

async function startFlow(provider: "gmail" | "outlook") {
  const { GET } = await import("@/app/api/oauth/[provider]/start/route");
  const res = await GET(req(`/api/oauth/${provider}/start`), ctx(provider));
  const cookie = res.cookies.get("cp_oauth")!.value;
  return { res, cookie, state: new URL(res.headers.get("location")!).searchParams.get("state")! };
}

describe("routes OAuth2", () => {
  it("start : redirige vers /login sans session", async () => {
    user = null;
    const { GET } = await import("@/app/api/oauth/[provider]/start/route");
    expect((await GET(req("/api/oauth/gmail/start"), ctx("gmail"))).headers.get("location")).toContain("/login");
  });
  it("start : fournisseur inconnu → 404, cookie httpOnly sinon", async () => {
    const { GET } = await import("@/app/api/oauth/[provider]/start/route");
    expect((await GET(req("/api/oauth/yahoo/start"), ctx("yahoo"))).status).toBe(404);
    const { res } = await startFlow("gmail");
    expect(res.headers.get("location")).toContain("accounts.google.com");
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
  });
  it("callback : parcours complet Gmail → compte enregistré", async () => {
    const { cookie, state } = await startFlow("gmail");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("/token")
      ? new Response(JSON.stringify({ access_token: "AT", refresh_token: "RT", expires_in: 3600 }))
      : new Response(JSON.stringify({ email: "camille@gmail.com" }))));
    const { GET } = await import("@/app/api/oauth/[provider]/callback/route");
    const res = await GET(req(`/api/oauth/gmail/callback?code=C&state=${state}`, `cp_oauth=${cookie}`), ctx("gmail"));
    expect(res.headers.get("location")).toContain("/settings?mail=ok");
    expect(upsert.mock.calls[0][0].where.userId_address).toEqual({ userId: "u1", address: "camille@gmail.com" });
  });
  it("callback : mauvais état (CSRF) → rien n'est enregistré", async () => {
    const { cookie } = await startFlow("outlook");
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    const { GET } = await import("@/app/api/oauth/[provider]/callback/route");
    const res = await GET(req("/api/oauth/outlook/callback?code=C&state=pirate", `cp_oauth=${cookie}`), ctx("outlook"));
    expect(res.headers.get("location")).toContain("reason=state");
    expect(f).not.toHaveBeenCalled(); expect(upsert).not.toHaveBeenCalled();
  });
  it("callback : cookie d'un autre utilisateur refusé ; refus de l'utilisateur géré", async () => {
    const { cookie, state } = await startFlow("gmail");
    user = { id: "u2" };
    const { GET } = await import("@/app/api/oauth/[provider]/callback/route");
    expect((await GET(req(`/api/oauth/gmail/callback?code=C&state=${state}`, `cp_oauth=${cookie}`), ctx("gmail"))).headers.get("location")).toContain("reason=state");
    expect((await GET(req("/api/oauth/gmail/callback?error=access_denied"), ctx("gmail"))).headers.get("location")).toContain("reason=denied");
  });
});
