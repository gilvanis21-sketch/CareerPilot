import { describe, expect, it } from "vitest";
import { aggregateBySector, popularKeywords, topCounts } from "@/services/market-aggregate";

const d = (n: number) => new Date(Date.UTC(2026, 10, n));
const row = (userId: string, sector: string, resp?: number) => ({ userId, sector, sentAt: d(1), respondedAt: resp ? d(resp) : null });

describe("statistiques de marché anonymisées", () => {
  it("masque les secteurs avec moins de K étudiants distincts", () => {
    const { published, hiddenGroups } = aggregateBySector([row("u1", "Banque", 3), row("u2", "Banque"), row("u3", "Banque", 5), row("u1", "Santé", 2), row("u1", "Santé")]);
    expect(published.map((p) => p.sector)).toEqual(["Banque"]);
    expect(hiddenGroups).toBe(1);
  });
  it("un seul étudiant avec beaucoup de candidatures ne contourne pas le seuil", () => {
    const rows = Array.from({ length: 10 }, () => row("u1", "Banque", 2));
    expect(aggregateBySector(rows).published).toEqual([]);
  });
  it("calcule taux et délai moyen", () => {
    const [b] = aggregateBySector([row("u1", "Banque", 3), row("u2", "Banque"), row("u3", "Banque", 5)]).published;
    expect(b).toMatchObject({ sent: 3, responses: 2, responseRate: 67, avgResponseDays: 3 });
  });
  it("ignore les candidatures non envoyées", () => {
    expect(aggregateBySector([{ userId: "u1", sector: "X", sentAt: null, respondedAt: null }]).published).toEqual([]);
  });
  it("mots-clés publiés seulement si partagés par K étudiants", () => {
    const r = popularKeywords([["Data", "web"], ["data"], ["DATA", "ia"], ["web"]]);
    expect(r.map((x) => x.name.toLowerCase())).toEqual(["data"]);
  });
  it("topCounts regroupe sans tenir compte de la casse/accents", () => {
    expect(topCounts(["Python", "python", "SQL"])[0]).toMatchObject({ count: 2 });
  });
});
