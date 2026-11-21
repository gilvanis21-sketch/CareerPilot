import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { newAuthRequest, oauthConfigured, providerFromSlug } from "@/services/oauth";

// Démarre la connexion OAuth2 : redirige vers Google / Microsoft avec un état anti-CSRF et un défi PKCE.
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.redirect(new URL("/login", req.url));
  const p = providerFromSlug((await ctx.params).provider);
  if (!p) return new NextResponse("Fournisseur inconnu", { status: 404 });
  const back = (m: string) => NextResponse.redirect(new URL(`/settings?mail=error&reason=${m}`, req.url));
  if (!rateLimit(`oauth:${u.id}`, 10, 60_000)) return back("rate");
  if (!oauthConfigured(p)) return back("config");
  const { url, cookie } = newAuthRequest(p, u.id);
  const res = NextResponse.redirect(url);
  res.cookies.set("cp_oauth", cookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/oauth", maxAge: 600 });
  return res;
}
