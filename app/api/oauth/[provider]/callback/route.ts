import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/log";
import { exchangeCode, fetchAddress, oauthConfigured, providerFromSlug, readAuthCookie, saveOAuthAccount } from "@/services/oauth";

// Retour de Google / Microsoft : vérifie l'état et le PKCE, échange le code, enregistre les jetons chiffrés.
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.redirect(new URL("/login", req.url));
  const p = providerFromSlug((await ctx.params).provider);
  if (!p) return new NextResponse("Fournisseur inconnu", { status: 404 });
  const done = (q: string) => {
    const res = NextResponse.redirect(new URL(`/settings?${q}`, req.url));
    res.cookies.set("cp_oauth", "", { path: "/api/oauth", maxAge: 0 });
    return res;
  };
  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return done("mail=error&reason=denied"); // l'utilisateur a refusé, ou le fournisseur a échoué
  const verifier = readAuthCookie(req.cookies.get("cp_oauth")?.value, p, u.id, sp.get("state"));
  const code = sp.get("code");
  if (!verifier || !code || !oauthConfigured(p)) return done("mail=error&reason=state");
  try {
    const t = await exchangeCode(p, code, verifier);
    const address = await fetchAddress(p, t.access_token);
    await saveOAuthAccount(u.id, p, address, t);
    await logActivity("email.connected", { userId: u.id, meta: { provider: p, method: "oauth" } });
    return done("mail=ok");
  } catch (e) {
    console.error("[oauth] échec de la connexion :", e instanceof Error ? e.message : e);
    return done("mail=error&reason=exchange");
  }
}
