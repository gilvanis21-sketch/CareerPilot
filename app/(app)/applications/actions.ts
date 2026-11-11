"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/log";
import { decrypt, encrypt } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { generateMail, type GenProfile, type GenTarget } from "@/ai/generate";
import { COMPETENCES_360 } from "@/ai/competences360";
import { canSend } from "@/services/send-guard";
import { startOfDay } from "@/lib/dates";
import { friendlyMailError, sendMail, verifyAccount } from "@/services/mailer";

export type ActionState = { error?: string; ok?: string } | undefined;
const EMAIL = z.string().trim().email();

async function loadOwned(userId: string, id: string) {
  const app = await db.application.findFirst({ where: { id, userId }, include: { offer: true } }); // isolation
  if (!app) redirect("/applications");
  return app;
}

async function buildContext(userId: string, app: Awaited<ReturnType<typeof loadOwned>>, kind: GenTarget["kind"]) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: { include: { skills: true, experiences: true } } } });
  const pr = u.profile!;
  const profile: GenProfile = {
    firstName: pr.firstName, lastName: pr.lastName, formation: pr.formation, studyYear: pr.studyYear, goal: pr.goal,
    skills: pr.skills.map((s) => s.name), experiences: pr.experiences.map((e) => e.title),
  };
  const target: GenTarget = {
    kind, company: app.companyName, role: app.offer?.title, sector: app.companySector ?? undefined,
    contract: app.offer?.contractType, offerSkills: app.offer?.skills, skills360: app.skills360,
    unpaidTwoMonths: app.spontaneous && app.unpaidOk,
    sentOn: app.sentAt?.toLocaleDateString("fr-FR"),
  };
  return { profile, target, aiConsent: !!u.aiConsentAt, anonymize: pr.anonymizeForAi, limit: pr.dailySendLimit, followUpDays: pr.followUpDays };
}

export async function generateAction(fd: FormData) {
  const user = await requireUser();
  if (!rateLimit(`gen:${user.id}`, 15, 60_000)) return; // protège le quota LLM
  const app = await loadOwned(user.id, String(fd.get("id")));
  const relance = fd.get("relance") === "1";
  const ctx = await buildContext(user.id, app, relance ? "RELANCE" : app.spontaneous ? "SPONTANEE" : "OFFRE");
  const mail = await generateMail(ctx.profile, ctx.target, { aiConsent: ctx.aiConsent, anonymize: ctx.anonymize });
  const last = await db.generatedMessage.findFirst({ where: { applicationId: app.id }, orderBy: { version: "desc" } });
  await db.generatedMessage.create({
    data: { userId: user.id, applicationId: app.id, kind: app.spontaneous ? "SPONTANEE" : "EMAIL", subject: mail.subject, body: mail.body, version: (last?.version ?? 0) + 1 },
  });
  await db.application.update({ where: { id: app.id }, data: { validatedAt: null } }); // nouveau texte = à re-valider
  await logActivity("message.generated", { userId: user.id, entityId: app.id, meta: { engine: mail.engine, relance } });
  revalidatePath(`/applications/${app.id}`);
}

export async function saveAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const app = await loadOwned(user.id, String(fd.get("id")));
  const subject = String(fd.get("subject") ?? "").slice(0, 200);
  const body = String(fd.get("body") ?? "").slice(0, 8000);
  const to = String(fd.get("recipient") ?? "").trim();
  if (to && !EMAIL.safeParse(to).success) return { error: "Adresse du destinataire invalide." };
  const last = await db.generatedMessage.findFirst({ where: { applicationId: app.id }, orderBy: { version: "desc" } });
  if (last) await db.generatedMessage.update({ where: { id: last.id }, data: { subject, body, edited: true } });
  await db.application.update({ where: { id: app.id }, data: { recipientEmail: to || null, validatedAt: null } }); // toute modification annule la validation
  revalidatePath(`/applications/${app.id}`);
  return { ok: "Enregistré. Pensez à valider avant l'envoi." };
}

export async function validateAction(fd: FormData) {
  const user = await requireUser();
  const app = await loadOwned(user.id, String(fd.get("id")));
  const msg = await db.generatedMessage.findFirst({ where: { applicationId: app.id }, orderBy: { version: "desc" } });
  if (!msg) return;
  await db.application.update({ where: { id: app.id }, data: { validatedAt: new Date(), status: app.sentAt ? app.status : "A_VALIDER" } });
  await logActivity("application.validated", { userId: user.id, entityId: app.id });
  revalidatePath(`/applications/${app.id}`);
}

const sending = new Set<string>(); // un seul envoi à la fois par utilisateur (évite de dépasser le plafond en parallèle)

export async function sendAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!rateLimit(`send:${user.id}`, 20, 60_000)) return { error: "Trop d'envois rapprochés." };
  if (sending.has(user.id)) return { error: "Un envoi est déjà en cours." };
  sending.add(user.id);
  try { return await doSend(user.id, fd); } finally { sending.delete(user.id); }
}

async function doSend(userId: string, fd: FormData): Promise<ActionState> {
  const app = await loadOwned(userId, String(fd.get("id")));
  const msg = await db.generatedMessage.findFirst({ where: { applicationId: app.id }, orderBy: { version: "desc" } });
  const account = await db.emailAccount.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  const prof = await db.studentProfile.findUniqueOrThrow({ where: { userId } });
  const sentToday = await db.activityLog.count({ where: { userId, action: "mail.sent", createdAt: { gte: startOfDay() } } });

  const check = canSend({
    status: app.status, validatedAt: app.validatedAt, confirmed: fd.get("confirm") === "on", recipient: app.recipientEmail,
    sentToday, dailyLimit: prof.dailySendLimit, hasAccount: !!account, hasMessage: !!msg, alreadySent: !!app.sentAt,
  });
  if (!check.ok) return { error: check.reason };

  // Prise de verrou atomique : la validation est consommée (compare-and-set). Une seconde requête concurrente,
  // ou un message modifié entre-temps, trouve validatedAt différent et n'envoie rien.
  const claim = await db.application.updateMany({ where: { id: app.id, validatedAt: app.validatedAt }, data: { validatedAt: null } });
  if (claim.count === 0) return { error: "Envoi déjà traité ou message modifié : rechargez la page." };

  try {
    await sendMail({
      provider: account!.provider, address: account!.address, password: decrypt(account!.accessTokenEnc),
      to: app.recipientEmail!, subject: msg!.subject ?? "Candidature", text: msg!.body,
      fromName: [prof.firstName, prof.lastName].filter(Boolean).join(" ") || undefined,
    });
  } catch (e) {
    await db.application.updateMany({ where: { id: app.id, validatedAt: null }, data: { validatedAt: app.validatedAt } }); // rien n'est parti : on rend la validation
    await logActivity("mail.failed", { userId, entityId: app.id });
    return { error: friendlyMailError(e) };
  }
  const now = new Date();
  await logActivity("mail.sent", { userId, entityId: app.id }); // jamais le contenu ni l'adresse en clair
  if (!app.sentAt) {
    await db.$transaction([
      db.application.update({ where: { id: app.id }, data: { status: "ENVOYEE", sentAt: now } }),
      db.followUp.createMany({ data: prof.followUpDays.map((d) => ({ userId, applicationId: app.id, dayOffset: d, dueAt: new Date(now.getTime() + d * 864e5) })) }),
    ]);
  } else {
    const next = await db.followUp.findFirst({ where: { applicationId: app.id, status: "PLANIFIEE" }, orderBy: { dueAt: "asc" } });
    if (next) await db.followUp.update({ where: { id: next.id }, data: { status: "ENVOYEE", sentAt: now } });
    await db.application.update({ where: { id: app.id }, data: { status: "EN_ATTENTE" } });
  }
  revalidatePath(`/applications/${app.id}`); revalidatePath("/applications");
  return { ok: "Candidature envoyée depuis votre messagerie ✓" };
}

const STATUSES = ["BROUILLON", "A_VALIDER", "ENVOYEE", "EN_ATTENTE", "ENTRETIEN", "REFUSEE", "ACCEPTEE", "RELANCE_NECESSAIRE"] as const;
export async function setStatusAction(fd: FormData) {
  const user = await requireUser();
  const app = await loadOwned(user.id, String(fd.get("id")));
  const status = z.enum(STATUSES).parse(fd.get("status"));
  if (["ENVOYEE", "EN_ATTENTE", "RELANCE_NECESSAIRE"].includes(status) && !app.sentAt) return; // pas de faux « envoyée »
  if (app.sentAt && ["BROUILLON", "A_VALIDER"].includes(status)) return; // une candidature envoyée ne redevient pas brouillon
  const responded = ["ENTRETIEN", "REFUSEE", "ACCEPTEE"].includes(status);
  await db.application.update({ where: { id: app.id }, data: { status, respondedAt: responded ? app.respondedAt ?? new Date() : null } });
  if (responded) await db.followUp.updateMany({ where: { applicationId: app.id, status: "PLANIFIEE" }, data: { status: "ANNULEE" } });
  revalidatePath(`/applications/${app.id}`); revalidatePath("/applications");
}

export async function deleteApplicationAction(fd: FormData) {
  const user = await requireUser();
  await db.application.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  revalidatePath("/applications");
  redirect("/applications");
}

// ---- Candidature spontanée ----
const spontSchema = z.object({
  company: z.string().trim().min(2).max(120),
  sector: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Adresse email invalide"),
  unpaid: z.string().optional(),
});
export async function createSpontaneousAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = spontSchema.safeParse({ company: fd.get("company"), sector: fd.get("sector") || undefined, email: fd.get("email"), unpaid: fd.get("unpaid") ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const skills = fd.getAll("skills").map(String).filter((s) => (COMPETENCES_360 as readonly string[]).includes(s));
  if (!skills.length) return { error: "Sélectionnez au moins une compétence." };
  const app = await db.application.create({
    data: { userId: user.id, companyName: parsed.data.company, companySector: parsed.data.sector, recipientEmail: parsed.data.email, spontaneous: true, skills360: skills, unpaidOk: parsed.data.unpaid === "on", status: "BROUILLON" },
    include: { offer: true },
  });
  const ctx = await buildContext(user.id, app, "SPONTANEE");
  const mail = await generateMail(ctx.profile, ctx.target, { aiConsent: ctx.aiConsent, anonymize: ctx.anonymize });
  await db.generatedMessage.create({ data: { userId: user.id, applicationId: app.id, kind: "SPONTANEE", subject: mail.subject, body: mail.body } });
  await logActivity("spontaneous.created", { userId: user.id, entityId: app.id });
  redirect(`/applications/${app.id}`);
}

// ---- Messagerie ----
const acctSchema = z.object({ provider: z.enum(["GMAIL", "OUTLOOK"]), address: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(200) });
export async function connectEmailAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!rateLimit(`mailconn:${user.id}`, 5, 60_000)) return { error: "Trop de tentatives." };
  const p = acctSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Informations invalides (adresse, mot de passe d'application)." };
  const password = p.data.password.replace(/\s+/g, ""); // Google affiche le mot de passe d'application en groupes séparés par des espaces
  try { await verifyAccount(p.data.provider, p.data.address, password); } catch (e) { return { error: friendlyMailError(e) }; }
  await db.emailAccount.upsert({
    where: { userId_address: { userId: user.id, address: p.data.address } },
    update: { provider: p.data.provider, accessTokenEnc: encrypt(password) },
    create: { userId: user.id, provider: p.data.provider, address: p.data.address, accessTokenEnc: encrypt(password) },
  });
  await logActivity("email.connected", { userId: user.id, meta: { provider: p.data.provider } });
  revalidatePath("/settings");
  return { ok: "Messagerie connectée ✓ (identifiants chiffrés)" };
}
export async function disconnectEmailAction(fd: FormData) {
  const user = await requireUser();
  await db.emailAccount.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  await logActivity("email.disconnected", { userId: user.id });
  revalidatePath("/settings");
}
