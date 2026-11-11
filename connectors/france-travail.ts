import type { Connector, ContractType, RawOffer, SearchQuery } from "./types";

/**
 * API officielle « Offres d'emploi v2 » de France Travail (https://francetravail.io).
 * Nécessite une inscription + un contrat de licence + CLIENT_ID/SECRET.
 * ⚠ Non testée en conditions réelles (pas de clés pendant le développement) : le mapping
 * est validé uniquement sur une réponse simulée (tests/france-travail.test.ts).
 * Le scope OAuth est configurable (FRANCE_TRAVAIL_SCOPE) car à confirmer dans la documentation de l'API.
 */
const TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

interface FtOffer {
  id: string;
  intitule: string;
  description?: string;
  dateCreation?: string;
  lieuTravail?: { libelle?: string };
  entreprise?: { nom?: string };
  typeContrat?: string;
  natureContrat?: string;
  competences?: { libelle?: string }[];
  secteurActiviteLibelle?: string;
  origineOffre?: { urlOrigine?: string };
}

export function classifyContract(o: Pick<FtOffer, "intitule" | "typeContrat" | "natureContrat" | "description">, goal: "STAGE" | "ALTERNANCE"): ContractType {
  const t = `${o.intitule} ${o.natureContrat ?? ""}`.toLowerCase();
  if (/apprentissage|apprenti/.test(t)) return "APPRENTISSAGE";
  if (/professionnalisation/.test(t)) return "PROFESSIONNALISATION";
  if (/alternan/.test(t)) return "ALTERNANCE";
  if (/\bstage|stagiaire/.test(t)) return "STAGE";
  if (o.typeContrat === "CDI") return "CDI";
  if (o.typeContrat === "CDD") return "CDD";
  void goal;
  return "AUTRE";
}

export function mapOffer(o: FtOffer, goal: "STAGE" | "ALTERNANCE"): RawOffer {
  return {
    externalId: o.id,
    title: o.intitule,
    company: o.entreprise?.nom,
    location: o.lieuTravail?.libelle,
    contractType: classifyContract(o, goal),
    description: o.description,
    skills: o.competences?.map((c) => c.libelle).filter((x): x is string => !!x),
    sector: o.secteurActiviteLibelle,
    publishedAt: o.dateCreation ? new Date(o.dateCreation) : undefined,
    url: o.origineOffre?.urlOrigine ?? `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
  };
}

async function getToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID!,
    client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET!,
    scope: process.env.FRANCE_TRAVAIL_SCOPE || "api_offresdemploiv2 o2dsoffre",
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) throw new Error(`France Travail OAuth ${r.status}`);
  return (await r.json()).access_token;
}

export const franceTravail: Connector = {
  slug: "france-travail",
  name: "France Travail (API officielle)",
  kind: "API_OFFICIELLE",
  termsUrl: "https://francetravail.io/data/api/offres-emploi",
  termsNote: "API officielle sous licence ; clés requises. Respecter les quotas et la mention de source.",
  isConfigured: () => !!(process.env.FRANCE_TRAVAIL_CLIENT_ID && process.env.FRANCE_TRAVAIL_CLIENT_SECRET),
  async search(q: SearchQuery) {
    const token = await getToken();
    const url = new URL(SEARCH_URL);
    url.searchParams.set("motsCles", [q.goal === "STAGE" ? "stage" : "alternance", ...q.keywords].join(" "));
    url.searchParams.set("range", "0-49");
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 204) return [];
    if (!r.ok && r.status !== 206) throw new Error(`France Travail search ${r.status}`);
    const json = (await r.json()) as { resultats?: FtOffer[] };
    return (json.resultats ?? []).map((o) => mapOffer(o, q.goal));
  },
};
