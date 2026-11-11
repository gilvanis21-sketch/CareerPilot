import { describe, expect, it } from "vitest";
import { matchOffer } from "@/ai/matching";
import { BENCHMARK_OFFERS, BENCHMARK_PROFILE } from "@/data/benchmark";
import { evaluate } from "@/scripts/eval-matching";
import { precisionAtK, recallAtK } from "@/services/metrics";

describe("métriques", () => {
  it("Precision@k / Recall@k", () => {
    const rel = new Set(["a", "c"]);
    expect(precisionAtK(["a", "b", "c", "d"], rel, 2)).toBe(0.5);
    expect(recallAtK(["a", "b", "c", "d"], rel, 3)).toBe(1);
  });
});

describe("matching sur le jeu de référence", () => {
  const e = evaluate();
  it("atteint les seuils de qualité fixés", () => {
    expect(e.p5).toBeGreaterThanOrEqual(0.8);
    expect(e.p10).toBeGreaterThanOrEqual(0.8);
    expect(e.r10).toBeGreaterThanOrEqual(0.8);
  });
  it("score borné et explication toujours fournie, sans promesse d'embauche", () => {
    for (const o of BENCHMARK_OFFERS) {
      const m = matchOffer(BENCHMARK_PROFILE, o);
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(100);
      expect(m.explanation).toContain("pas vos chances");
      expect(m.explanation.toLowerCase()).not.toContain("probabilité d'embauche de");
    }
  });
  it("ne crédite jamais une compétence absente du profil", () => {
    const m = matchOffer(BENCHMARK_PROFILE, BENCHMARK_OFFERS.find((o) => o.externalId === "b09")!);
    expect(m.matchedSkills).not.toContain("Flutter");
    expect(m.missingSkills).toContain("Flutter");
  });
  it("plafonne CDI et postes senior", () => {
    const cdi = matchOffer(BENCHMARK_PROFILE, BENCHMARK_OFFERS.find((o) => o.externalId === "b11")!);
    expect(cdi.score).toBeLessThanOrEqual(40);
  });
});
