import { normalize } from "./dedupe";

/** Seuil d'anonymat (k-anonymat) : un groupe issu des étudiants n'est publié que s'il compte au moins K étudiants distincts. */
export const K_ANON = 3;

export interface AppRow { userId: string; sector: string | null; sentAt: Date | null; respondedAt: Date | null }
export interface SectorStat { sector: string; sent: number; responses: number; responseRate: number; avgResponseDays: number | null; students: number }

export function aggregateBySector(rows: AppRow[], k = K_ANON): { published: SectorStat[]; hiddenGroups: number } {
  const groups = new Map<string, AppRow[]>();
  for (const r of rows) {
    if (!r.sentAt) continue;
    const key = r.sector?.trim() || "Non précisé";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const published: SectorStat[] = [];
  let hiddenGroups = 0;
  for (const [sector, rs] of groups) {
    const students = new Set(rs.map((r) => r.userId)).size;
    if (students < k) { hiddenGroups++; continue; }
    const answered = rs.filter((r) => r.respondedAt && r.sentAt);
    const days = answered.map((r) => (r.respondedAt!.getTime() - r.sentAt!.getTime()) / 864e5);
    published.push({
      sector, sent: rs.length, responses: answered.length, students,
      responseRate: Math.round((answered.length / rs.length) * 100),
      avgResponseDays: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null,
    });
  }
  return { published: published.sort((a, b) => b.sent - a.sent), hiddenGroups };
}

export function topCounts(values: string[], n = 10): { name: string; count: number }[] {
  const m = new Map<string, { name: string; count: number }>();
  for (const v of values) {
    const key = normalize(v);
    if (!key) continue;
    const e = m.get(key) ?? { name: v.trim(), count: 0 };
    e.count++; m.set(key, e);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, n);
}

/** Mots-clés recherchés : publiés seulement s'ils sont partagés par au moins K étudiants distincts. */
export function popularKeywords(perStudent: string[][], k = K_ANON, n = 10) {
  const users = new Map<string, { name: string; users: number }>();
  for (const kws of perStudent) {
    for (const kw of new Set(kws.map(normalize).filter(Boolean))) {
      const orig = kws.find((x) => normalize(x) === kw)!.trim();
      const e = users.get(kw) ?? { name: orig, users: 0 };
      e.users++; users.set(kw, e);
    }
  }
  return [...users.values()].filter((e) => e.users >= k).sort((a, b) => b.users - a.users).slice(0, n);
}
