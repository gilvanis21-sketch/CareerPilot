import { describe, expect, it } from "vitest";
import { parseResumeText } from "@/services/cv-parser";

const CV = `Camille Dupont
camille.dupont@example.com
06 12 34 56 78

Bachelor 3 Informatique – aivancity

FORMATION
Bachelor Informatique, aivancity (2023-2026)
Baccalauréat général, 2023

COMPÉTENCES
Python, SQL, Docker, React, Git, Scrum
Anglais courant, Espagnol notions

EXPÉRIENCES
Stage développeur web – Agence Fictive (2 mois)
Projet étudiant : application de gestion de stock
`;

describe("parseResumeText", () => {
  const r = parseResumeText(CV);
  it("extrait identité et contact", () => {
    expect(r.firstName).toBe("Camille");
    expect(r.lastName).toBe("Dupont");
    expect(r.email).toBe("camille.dupont@example.com");
    expect(r.phone).toBe("06 12 34 56 78");
  });
  it("détecte l'année d'étude", () => expect(r.studyYear).toBe("B3"));
  it("extrait uniquement les compétences présentes", () => {
    expect(r.skills).toEqual(expect.arrayContaining(["Python", "SQL", "Docker", "React", "Git", "Scrum"]));
    expect(r.skills).not.toContain("Kubernetes");
    expect(r.skills).not.toContain("Java"); // pas de faux positif sur JavaScript/absent
  });
  it("détecte les langues", () => expect(r.languages).toEqual(["Anglais", "Espagnol"]));
  it("n'invente rien sur un texte vide", () => {
    const e = parseResumeText("");
    expect(e.skills).toEqual([]);
    expect(e.email).toBeNull();
    expect(e.studyYear).toBeNull();
  });
});
