"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth/session";
import { hashPassword, verifyPassword, loginSchema, registerSchema } from "@/lib/auth/password";
import { logActivity } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp as ip } from "@/lib/request";

export type FormState = { error?: string; fieldErrors?: Record<string, string[]>; email?: string } | undefined;

let dummy: Promise<string> | undefined;
const dummyHash = () => (dummy ??= hashPassword("dummy-password-for-timing"));

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`reg:${await ip()}`, 20, 60_000)) return { error: "Trop de tentatives, réessayez plus tard." };
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, email: String(fd.get("email") ?? "") };
  const { email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "Un compte existe déjà avec cet email.", email };
  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      consentAt: new Date(),
      profile: { create: {} },
    },
  });
  await logActivity("auth.register", { userId: user.id });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`login:${await ip()}`, 30, 60_000)) return { error: "Trop de tentatives, réessayez plus tard." };
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Identifiants invalides.", email: String(fd.get("email") ?? "") };
  // Limite par compte (en plus de la limite par IP) : freine le bourrage d'identifiants distribué.
  if (!rateLimit(`login-acct:${parsed.data.email}`, 8, 5 * 60_000)) return { error: "Trop de tentatives, réessayez plus tard.", email: parsed.data.email };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Toujours exécuter un bcrypt, même si le compte n'existe pas : pas de différence de temps de réponse.
  const hash = user && !user.deletedAt ? user.passwordHash : await dummyHash();
  const valid = await verifyPassword(parsed.data.password, hash);
  const ok = !!user && !user.deletedAt && valid;
  if (!ok) {
    await logActivity("auth.login_failed", { meta: { ip: await ip() } });
    return { error: "Email ou mot de passe incorrect.", email: parsed.data.email };
  }
  await logActivity("auth.login", { userId: user!.id });
  await createSession(user!.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
