import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../db";
import { randomToken, sha256 } from "../crypto";
import { clientIp } from "../request";

export const SESSION_COOKIE = "cp_session";
const SESSION_DAYS = 14;

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await db.session.create({ data: { userId, tokenHash: sha256(token), expiresAt, ip: await clientIp(), userAgent: ua } });
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }); // purge des sessions expirées
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { profile: true } } },
  });
  if (!s || s.expiresAt < new Date() || s.user.deletedAt) return null;
  return s.user;
});

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

/** Révoque toutes les sessions de l'utilisateur sauf la session courante (après changement de mot de passe). */
export async function destroyOtherSessions(userId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db.session.deleteMany({ where: { userId, ...(token ? { NOT: { tokenHash: sha256(token) } } : {}) } });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}
