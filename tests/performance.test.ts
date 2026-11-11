import { describe, expect, it } from "vitest";
import { matchOffer } from "@/ai/matching";
import { dedupeKey } from "@/services/dedupe";
import { BENCHMARK_OFFERS, BENCHMARK_PROFILE } from "@/data/benchmark";

const many = Array.from({ length: 10_000 }, (_, i) => BENCHMARK_OFFERS[i % 20]);

describe("performance (10 000 offres)", () => {
  it("calcule 10 000 scores en moins de 3 s", () => {
    const t = performance.now();
    for (const o of many) matchOffer(BENCHMARK_PROFILE, o);
    const ms = performance.now() - t;
    console.log(`[perf] 10 000 matchs : ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(3000);
  });
  it("calcule 10 000 clés de dédoublonnage en moins de 1 s", () => {
    const t = performance.now();
    for (const o of many) dedupeKey(o.title, o.company, o.location);
    const ms = performance.now() - t;
    console.log(`[perf] 10 000 dedupe : ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(1000);
  });
});
