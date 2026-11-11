import "server-only";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/log";
import { CONNECTORS } from "@/connectors/registry";
import { dedupeKey } from "./dedupe";
import { matchOffer } from "@/ai/matching";
import type { Prisma } from "@/lib/generated/prisma/client";

const SYNC_COOLDOWN_MS = 10 * 60_000;

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { err = e; await new Promise((r) => setTimeout(r, 300 * 2 ** i)); }
  }
  throw err;
}

export interface SyncReport { source: string; fetched: number; created: number; duplicates: number; error?: string }

/** Collecte auprès de toutes les sources configurées puis calcule les scores de l'étudiant. */
export async function syncOffersForUser(userId: string): Promise<SyncReport[]> {
  const profile = await db.studentProfile.findUniqueOrThrow({ where: { userId }, include: { skills: true, experiences: true } });
  const query = { keywords: profile.keywords, location: profile.locations[0], goal: profile.goal };
  const reports: SyncReport[] = [];

  for (const c of CONNECTORS) {
    const source = await db.jobSource.upsert({
      where: { slug: c.slug },
      update: { name: c.name, kind: c.kind, termsUrl: c.termsUrl, termsNote: c.termsNote },
      create: { slug: c.slug, name: c.name, kind: c.kind, termsUrl: c.termsUrl, termsNote: c.termsNote },
    });
    if (!c.search || !c.isConfigured() || !source.enabled) continue;
    // Délai minimal entre deux collectes d'une même source : protège le quota de l'API et évite
    // qu'un utilisateur ne réécrase en boucle la table (partagée) des offres.
    if (source.lastRunAt && !source.lastError && Date.now() - source.lastRunAt.getTime() < SYNC_COOLDOWN_MS) continue;
    const report: SyncReport = { source: c.name, fetched: 0, created: 0, duplicates: 0 };
    try {
      const raws = await withRetry(() => c.search!(query));
      report.fetched = raws.length;
      const keys = raws.map((r) => dedupeKey(r.title, r.company, r.location));
      // Requêtes groupées (au lieu de 2 requêtes par offre).
      const [others, existing] = await Promise.all([
        db.jobOffer.findMany({ where: { dedupeKey: { in: keys }, NOT: { sourceId: source.id } }, select: { dedupeKey: true } }),
        db.jobOffer.findMany({ where: { sourceId: source.id, externalId: { in: raws.map((r) => r.externalId) } }, select: { id: true, externalId: true } }),
      ]);
      const otherKeys = new Set(others.map((o) => o.dedupeKey));
      const byExt = new Map(existing.map((o) => [o.externalId, o.id]));
      const toCreate: Prisma.JobOfferCreateManyInput[] = [];
      const updates: ReturnType<typeof db.jobOffer.update>[] = [];
      raws.forEach((r, i) => {
        if (otherKeys.has(keys[i])) { report.duplicates++; return; }
        const data = { ...r, dedupeKey: keys[i], skills: r.skills ?? [], sourceId: source.id, isDemo: c.kind === "DEMO" };
        const id = byExt.get(r.externalId);
        if (id) updates.push(db.jobOffer.update({ where: { id }, data }));
        else { toCreate.push(data); byExt.set(r.externalId, "new"); }
      });
      await db.$transaction([...updates, db.jobOffer.createMany({ data: toCreate, skipDuplicates: true })]);
      report.created = toCreate.length;
      await db.jobSource.update({ where: { id: source.id }, data: { lastRunAt: new Date(), lastError: null } });
    } catch (e) {
      report.error = e instanceof Error ? e.message : String(e);
      await db.jobSource.update({ where: { id: source.id }, data: { lastRunAt: new Date(), lastError: report.error } });
      await logActivity("sync.error", { userId, meta: { source: c.slug, error: report.error } });
    }
    reports.push(report);
  }
  await computeMatches(userId, profile);
  await logActivity("sync.done", { userId, meta: { reports } });
  return reports;
}

export async function computeMatches(userId: string, profile?: Awaited<ReturnType<typeof loadProfile>>) {
  const p = profile ?? (await loadProfile(userId));
  const mp = {
    formation: p.formation, studyYear: p.studyYear, goal: p.goal, keywords: p.keywords,
    skills: p.skills.map((s) => s.name), experiences: p.experiences.map((e) => e.title),
  };
  const [offers, existing] = await Promise.all([
    db.jobOffer.findMany(),
    db.jobMatch.findMany({ where: { userId }, select: { id: true, offerId: true } }),
  ]);
  const have = new Map(existing.map((m) => [m.offerId, m.id]));
  const creates: Prisma.JobMatchCreateManyInput[] = [];
  const updates: ReturnType<typeof db.jobMatch.update>[] = [];
  for (const o of offers) {
    const m = matchOffer(mp, o);
    const data = { score: m.score, matchedSkills: m.matchedSkills, missingSkills: m.missingSkills, strengths: m.strengths, explanation: m.explanation, engine: "heuristic" };
    const id = have.get(o.id);
    if (id) updates.push(db.jobMatch.update({ where: { id }, data })); // `rejected` conservé
    else creates.push({ ...data, userId, offerId: o.id });
  }
  // Par lots : une transaction unique par paquet au lieu d'un aller-retour par offre.
  for (let i = 0; i < updates.length; i += 200) await db.$transaction(updates.slice(i, i + 200));
  if (creates.length) await db.jobMatch.createMany({ data: creates, skipDuplicates: true });
}

const loadProfile = (userId: string) =>
  db.studentProfile.findUniqueOrThrow({ where: { userId }, include: { skills: true, experiences: true } });
