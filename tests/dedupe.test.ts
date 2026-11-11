import { describe, expect, it } from "vitest";
import { dedupeKey } from "@/services/dedupe";

describe("dedupeKey", () => {
  it("regroupe les variantes d'une même offre", () => {
    const a = dedupeKey("Alternance Développeur Web (H/F)", "NovaWeb SAS", "Paris (75)");
    const b = dedupeKey("alternance développeur web", "NOVAWEB", "Paris 75008");
    expect(a).toBe(b);
  });
  it("distingue deux offres différentes", () => {
    expect(dedupeKey("Alternance Data Analyst", "DataLoop", "Lyon")).not.toBe(dedupeKey("Alternance Data Analyst", "DataLoop", "Paris"));
  });
});
