import { NextResponse, type NextRequest } from "next/server";

// Garde légère (présence du cookie). La vérification réelle de la session se fait côté serveur (requireUser).
const PUBLIC = ["/login", "/register", "/forgot", "/"];
const isPublic = (p: string) => PUBLIC.includes(p) || p.startsWith("/reset/");

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const has = req.cookies.has("cp_session");
  if (!has && !isPublic(pathname)) return NextResponse.redirect(new URL("/login", req.url));
  if (has && (pathname === "/login" || pathname === "/register")) return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/|api/|favicon.ico|.*\\..*).*)"] };
