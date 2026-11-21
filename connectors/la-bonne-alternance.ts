import type { Connector, ContractType, RawOffer, SearchQuery } from "./types";

/**
 * La bonne alternance (service public, mission interministérielle pour l'apprentissage) : offres d'alternance réelles,
 * mises à jour quotidiennement, avec le lien pour postuler. API gratuite, usage non lucratif, 60 appels/min.
 * Clé à créer sur https://api.apprentissage.beta.gouv.fr/fr/compte/profil puis à placer dans LBA_API_KEY.
 * Route : GET /job/v1/search (schéma relevé dans le dépôt public mission-apprentissage/api-apprentissage).
 * ⚠ Mapping validé sur une réponse simulée (tests/la-bonne-alternance.test.ts) : aucun appel réel n'a pu être fait
 * sans clé. Le jeton est envoyé en « Authorization: Bearer ».
 */
const BASE = "https://api.apprentissage.beta.gouv.fr/api";

interface LbaJob {
  identifier?: { id?: string | null; partner_job_id?: string; partner_label?: string };
  workplace?: { name?: string | null; brand?: string | null; legal_name?: string | null; description?: string | null; location?: { address?: string }; domain?: { naf?: { label?: string | null } | null } };
  apply?: { url?: string; phone?: string | null };
  contract?: { type?: string[]; start?: string | null; duration?: number | null; remote?: string | null };
  offer?: { title?: string; description?: string | null; desired_skills?: string[]; to_be_acquired_skills?: string[]; publication?: { creation?: string | null; expiration?: string | null } };
}

/** Codes ROME des familles de métiers courantes (référentiel France Travail) ; sans correspondance, aucun filtre métier. */
const ROME_BY_KEYWORD: [RegExp, string[]][] = [
  [/data|donn[ée]e|\bia\b|intelligence artificielle|machine learning|\bml\b|python|analyst/i, ["M1805", "M1403"]],
  [/d[ée]velopp|software|logiciel|web|front|back|full.?stack|java|react|\bnode/i, ["M1805"]],
  [/r[ée]seau|syst[èe]me|devops|cloud|infra|cyber|s[ée]curit[ée]/i, ["M1810", "M1801"]],
  [/marketing|communication|community|digital/i, ["M1705", "E1103"]],
];
export const romesFor = (keywords: string[]): string[] => {
  const set = new Set<string>();
  for (const [re, codes] of ROME_BY_KEYWORD) if (keywords.some((k) => re.test(k))) codes.forEach((c) => set.add(c));
  return [...set];
};

export function classifyContract(types: string[] | undefined): ContractType {
  const t = (types ?? []).join(" ").toLowerCase();
  if (/professionnalisation/.test(t) && !/apprentissage/.test(t)) return "PROFESSIONNALISATION";
  if (/apprentissage/.test(t)) return "APPRENTISSAGE";
  return "ALTERNANCE";
}

export function mapJob(j: LbaJob): RawOffer | null {
  const title = j.offer?.title?.trim();
  const url = j.apply?.url;
  const id = j.identifier?.id ?? (j.identifier?.partner_job_id ? `${j.identifier.partner_label ?? "lba"}:${j.identifier.partner_job_id}` : undefined);
  if (!title || !url || !id) return null; // sans lien pour postuler, l'offre est inutilisable
  const w = j.workplace;
  const skills = [...(j.offer?.desired_skills ?? []), ...(j.offer?.to_be_acquired_skills ?? [])].filter(Boolean);
  const created = j.offer?.publication?.creation, expires = j.offer?.publication?.expiration;
  return {
    externalId: id, title,
    company: w?.brand ?? w?.name ?? w?.legal_name ?? undefined,
    location: w?.location?.address,
    contractType: classifyContract(j.contract?.type),
    description: j.offer?.description ?? w?.description ?? undefined,
    skills: skills.length ? skills : undefined,
    sector: w?.domain?.naf?.label ?? undefined,
    publishedAt: created ? new Date(created) : undefined,
    deadline: expires ? new Date(expires) : undefined,
    url,
  };
}

/** Géocodage d'une ville par l'API officielle geo.api.gouv.fr (sans clé). */
async function geocode(place: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const u = new URL("https://geo.api.gouv.fr/communes");
    u.searchParams.set("nom", place.split(",")[0].trim()); u.searchParams.set("fields", "centre"); u.searchParams.set("boost", "population"); u.searchParams.set("limit", "1");
    const r = await fetch(u, { signal: AbortSignal.timeout(10_000) });
    const c = r.ok ? ((await r.json()) as { centre?: { coordinates?: [number, number] } }[])[0]?.centre?.coordinates : undefined;
    return c ? { lon: c[0], lat: c[1] } : null;
  } catch { return null; }
}

export const laBonneAlternance: Connector = {
  slug: "la-bonne-alternance",
  name: "La bonne alternance (offres réelles)",
  kind: "API_OFFICIELLE",
  termsUrl: "https://api.apprentissage.beta.gouv.fr/en/cgu",
  termsNote: "API publique gratuite, usage non lucratif, jeton secret, 60 appels/min. Les offres renvoient vers le recruteur.",
  isConfigured: () => !!process.env.LBA_API_KEY,
  async search(q: SearchQuery): Promise<RawOffer[]> {
    if (q.goal === "STAGE") return []; // uniquement des contrats en alternance
    const url = new URL(`${BASE}/job/v1/search`);
    const g = q.location ? await geocode(q.location) : null;
    if (g) { url.searchParams.set("latitude", String(g.lat)); url.searchParams.set("longitude", String(g.lon)); url.searchParams.set("radius", "30"); }
    const romes = romesFor(q.keywords);
    if (romes.length) url.searchParams.set("romes", romes.join(","));
    const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.LBA_API_KEY}`, accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) throw new Error(`La bonne alternance ${r.status}`);
    const json = (await r.json()) as { jobs?: LbaJob[] };
    const now = Date.now(), since = now - 90 * 864e5;
    return (json.jobs ?? [])
      .map(mapJob).filter((o): o is RawOffer => !!o)
      .filter((o) => !o.deadline || o.deadline.getTime() > now) // offres encore ouvertes
      .filter((o) => !o.publishedAt || o.publishedAt.getTime() > since) // récentes (90 jours)
      .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
      .slice(0, 100);
  },
};
