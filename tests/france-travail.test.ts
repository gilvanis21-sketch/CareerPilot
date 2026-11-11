import { afterEach, describe, expect, it, vi } from "vitest";
import { franceTravail, mapOffer } from "@/connectors/france-travail";
import { linkedin } from "@/connectors/linkedin";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("France Travail (réponse simulée — API réelle non testée)", () => {
  it("mappe une offre", () => {
    const o = mapOffer({ id: "123", intitule: "Alternance développeur web", entreprise: { nom: "Acme" }, lieuTravail: { libelle: "75 - Paris" }, typeContrat: "CDD", dateCreation: "2026-11-01T10:00:00Z", competences: [{ libelle: "Python" }] }, "ALTERNANCE");
    expect(o).toMatchObject({ externalId: "123", company: "Acme", contractType: "ALTERNANCE", skills: ["Python"] });
    expect(o.url).toContain("123");
  });
  it("n'est pas configuré sans clés (source ignorée, pas d'erreur)", () => {
    vi.stubEnv("FRANCE_TRAVAIL_CLIENT_ID", ""); vi.stubEnv("FRANCE_TRAVAIL_CLIENT_SECRET", "");
    expect(franceTravail.isConfigured()).toBe(false);
  });
  it("enchaîne token puis recherche avec le bearer", async () => {
    vi.stubEnv("FRANCE_TRAVAIL_CLIENT_ID", "id"); vi.stubEnv("FRANCE_TRAVAIL_CLIENT_SECRET", "secret");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "tok" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ resultats: [{ id: "1", intitule: "Stage data" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await franceTravail.search!({ keywords: ["data"], goal: "STAGE" });
    expect(r[0].contractType).toBe("STAGE");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer tok");
  });
});

describe("LinkedIn", () => {
  it("génère uniquement un lien, sans collecte", () => {
    expect(linkedin.search).toBeUndefined();
    const [l] = linkedin.searchLinks!({ keywords: ["python"], goal: "ALTERNANCE", location: "Paris" });
    expect(l.url).toContain("linkedin.com/jobs/search");
    expect(new URL(l.url).searchParams.get("keywords")).toBe("alternance python");
  });
});
