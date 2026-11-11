import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { findInventedSkills, generateMail, templateMail } from "@/ai/generate";
import { suggestSkills360, COMPETENCES_360 } from "@/ai/competences360";

const profile = { firstName: "Camille", lastName: "Dupont", formation: "Bachelor Informatique", studyYear: "B3", goal: "ALTERNANCE" as const, skills: ["Python", "SQL", "Docker"], experiences: ["Stage développeur web"] };

describe("génération de messages", () => {
  it("n'invente aucune compétence : n'évoque que le profil", async () => {
    const m = await generateMail(profile, { kind: "OFFRE", company: "Acme", role: "Alternant Data", contract: "ALTERNANCE", offerSkills: ["Python", "Kubernetes"] }, { aiConsent: false, anonymize: true });
    expect(m.engine).toBe("template");
    expect(findInventedSkills(m.body, profile.skills)).toEqual([]);
    expect(m.body).not.toContain("Kubernetes"); // demandé par l'offre mais absent du profil : non revendiqué
    expect(m.body).toContain("Python");
  });
  it("détecte une technologie inventée", () => {
    expect(findInventedSkills("Je maîtrise Python et Kubernetes", ["Python"])).toEqual(["Kubernetes"]);
  });
  it("ne confond pas C#/C++ avec la lettre « c » d'un texte français", () => {
    expect(findInventedSkills("C'est avec plaisir que je candidate. Python et SQL.", ["Python", "SQL"])).toEqual([]);
    expect(findInventedSkills("Je connais C# et C++", ["Python"])).toEqual(["C#", "C++"]);
  });
  it("tolère une techno de l'offre seulement si le manque est assumé", () => {
    const offer = ["Kubernetes"];
    expect(findInventedSkills("Je n'ai pas encore pratiqué Kubernetes, mais je suis motivé(e) à apprendre.", ["Python"], offer)).toEqual([]);
    expect(findInventedSkills("Je maîtrise Kubernetes depuis deux ans.", ["Python"], offer)).toEqual(["Kubernetes"]);
    expect(findInventedSkills("Je maîtrise Docker.", ["Python"], offer)).toEqual(["Docker"]);
  });
  it("mentionne le stage de deux mois éventuellement non rémunéré, seulement si demandé", () => {
    const sp = { kind: "SPONTANEE" as const, company: "Beta", sector: "banque", skills360: ["Cybersécurité"] };
    expect(templateMail(profile, { ...sp, unpaidTwoMonths: true }).body).toMatch(/deux mois.*rémunéré/);
    expect(templateMail(profile, sp).body).not.toMatch(/rémunéré/);
  });
  it("spontanée : les compétences 360 choisies ne sont pas signalées, et les acronymes sont préservés", async () => {
    const m = await generateMail(profile, { kind: "SPONTANEE", company: "Beta", skills360: ["Cybersécurité", "Gestion de projets IT"] }, { aiConsent: false, anonymize: true });
    expect(m.warnings).toEqual([]);
    expect(m.body).toContain("Gestion de projets IT");
    expect(m.body).not.toContain("projets it");
  });
  it("utilise le vrai nom, sans placeholder", () => {
    expect(templateMail(profile, { kind: "SPONTANEE", company: "Beta" }).body).toContain("Camille Dupont");
  });
  it("suggère des compétences 360 valides", () => {
    const s = suggestSkills360("banque");
    expect(s.length).toBeGreaterThan(0);
    s.forEach((x) => expect(COMPETENCES_360).toContain(x));
  });
});
