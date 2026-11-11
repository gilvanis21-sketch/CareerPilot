import type { Connector } from "./types";

/**
 * LinkedIn : AUCUNE collecte automatique (interdite par ses conditions d'utilisation).
 * On génère uniquement des liens de recherche préremplis ; l'étudiant fait sa recherche lui-même.
 */
export const linkedin: Connector = {
  slug: "linkedin-links",
  name: "LinkedIn (liens de recherche)",
  kind: "LIEN_RECHERCHE",
  termsUrl: "https://www.linkedin.com/legal/user-agreement",
  termsNote: "Pas de scraping. Liens de recherche préremplis uniquement.",
  isConfigured: () => true,
  searchLinks(q) {
    const kw = [q.goal === "STAGE" ? "stage" : "alternance", ...q.keywords].join(" ");
    const url = new URL("https://www.linkedin.com/jobs/search/");
    url.searchParams.set("keywords", kw);
    if (q.location) url.searchParams.set("location", q.location);
    return [{ label: "Ouvrir la recherche sur LinkedIn", url: url.toString() }];
  },
};
