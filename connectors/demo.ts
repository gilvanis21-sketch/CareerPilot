import { BENCHMARK_OFFERS } from "@/data/benchmark";
import type { Connector, RawOffer } from "./types";

/** Source de démonstration : offres 100 % fictives (jeu de référence). Aucune donnée réelle. */
export const demo: Connector = {
  slug: "demo",
  name: "Démo (offres fictives)",
  kind: "DEMO",
  termsNote: "Données fictives générées pour le développement et la recette.",
  isConfigured: () => true,
  async search(): Promise<RawOffer[]> {
    return BENCHMARK_OFFERS.map((o) => ({
      externalId: o.externalId,
      title: o.title,
      company: o.company,
      location: o.location,
      contractType: o.contractType,
      description: o.description,
      skills: o.skills,
      sector: o.sector,
      publishedAt: new Date(Date.now() - o.daysAgo * 864e5),
      url: `https://example.com/offres/${o.externalId}`,
    }));
  },
};
