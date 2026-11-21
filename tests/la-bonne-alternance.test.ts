import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyContract, laBonneAlternance, mapJob, romesFor } from "@/connectors/la-bonne-alternance";

afterEach(() => { vi.unstubAllGlobals(); delete process.env.LBA_API_KEY; });
const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
const job = (o: object = {}) => ({
  identifier: { id: "abc", partner_job_id: "p1", partner_label: "X" },
  workplace: { name: "Acme", brand: "Acme Tech", location: { address: "1 rue A, 75002 Paris" }, domain: { naf: { label: "Programmation informatique" } } },
  apply: { url: "https://exemple.fr/postuler/abc" }, contract: { type: ["Apprentissage"] },
  offer: { title: "Alternant développeur Python", description: "Mission…", desired_skills: ["Python", "SQL"], publication: { creation: day(3), expiration: new Date(Date.now() + 20 * 864e5).toISOString() } }, ...o,
});

describe("La bonne alternance", () => {
  it("convertit une offre en RawOffer avec lien pour postuler", () => {
    const r = mapJob(job())!;
    expect(r).toMatchObject({ externalId: "abc", title: "Alternant développeur Python", company: "Acme Tech", location: "1 rue A, 75002 Paris", contractType: "APPRENTISSAGE", sector: "Programmation informatique", url: "https://exemple.fr/postuler/abc" });
    expect(r.skills).toEqual(["Python", "SQL"]);
  });
  it("écarte une offre sans lien ou sans titre", () => {
    expect(mapJob(job({ apply: {} }))).toBeNull();
    expect(mapJob(job({ offer: {} }))).toBeNull();
  });
  it("classe le contrat", () => {
    expect(classifyContract(["Contrat de professionnalisation"])).toBe("PROFESSIONNALISATION");
    expect(classifyContract(["Apprentissage", "Professionnalisation"])).toBe("APPRENTISSAGE");
    expect(classifyContract(undefined)).toBe("ALTERNANCE");
  });
  it("déduit les codes ROME depuis les mots-clés", () => {
    expect(romesFor(["Python", "data"])).toContain("M1805");
    expect(romesFor(["cuisine"])).toEqual([]);
  });
  it("n'est active qu'avec une clé, et ne renvoie rien pour un stage", async () => {
    expect(laBonneAlternance.isConfigured()).toBe(false);
    process.env.LBA_API_KEY = "k";
    expect(laBonneAlternance.isConfigured()).toBe(true);
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    expect(await laBonneAlternance.search!({ keywords: [], goal: "STAGE" })).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
  it("filtre les offres expirées ou trop anciennes, trie par date, envoie le jeton", async () => {
    process.env.LBA_API_KEY = "SECRET";
    const jobs = [
      job(), job({ identifier: { id: "vieux" }, offer: { title: "Ancien", publication: { creation: day(200) } } }),
      job({ identifier: { id: "expire" }, offer: { title: "Expiré", publication: { creation: day(5), expiration: day(1) } } }),
      job({ identifier: { id: "recent" }, offer: { title: "Très récent", publication: { creation: day(1) } } }),
    ];
    const f = vi.fn(async (u: unknown) => String(u).includes("geo.api.gouv.fr")
      ? new Response(JSON.stringify([{ centre: { coordinates: [2.35, 48.85] } }]))
      : new Response(JSON.stringify({ jobs })));
    vi.stubGlobal("fetch", f);
    const res = await laBonneAlternance.search!({ keywords: ["python"], location: "Paris", goal: "ALTERNANCE" });
    expect(res.map((o) => o.externalId)).toEqual(["recent", "abc"]);
    const [url, init] = f.mock.calls[1] as unknown as [URL, RequestInit];
    expect(String(url)).toContain("latitude=48.85"); expect(String(url)).toContain("romes=M1805");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer SECRET");
  });
  it("signale une erreur d'API sans exposer la clé", async () => {
    process.env.LBA_API_KEY = "SECRET";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    await expect(laBonneAlternance.search!({ keywords: [], goal: "ALTERNANCE" })).rejects.toThrow(/401/);
  });
});
