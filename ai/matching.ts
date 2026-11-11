import { TECH_DICTIONARY, findTerms } from "@/services/cv-parser";
import { normalize } from "@/services/dedupe";

export interface MatchProfile {
  formation?: string | null;
  studyYear?: string | null;
  goal: "STAGE" | "ALTERNANCE";
  keywords: string[];
  skills: string[];
  experiences: string[];
}
export interface MatchOffer {
  title: string;
  description?: string | null;
  skills: string[];
  contractType: string;
}
export interface MatchResult {
  score: number; // 0-100 : compatibilité profil/offre — PAS une probabilité d'embauche
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  explanation: string;
  breakdown: { skills: number; role: number; experience: number; contract: number; level: number };
}

/** Pondération (total 100). */
export const WEIGHTS = { skills: 45, role: 25, experience: 10, contract: 15, level: 5 } as const;

// Termes du domaine informatique/numérique, détectés dans le titre (poids fort) ou la description.
const IT_TERMS = ["developpeur", "developpement", "informatique", "web", "full stack", "front end", "back end", "data", "devops", "ia", "intelligence artificielle", "machine learning", "logiciel", "cloud", "reseau", "systemes", "cybersecurite", "si", "programmation", "software", "python", "sql", "react", "docker", "projet digital", "support informatique"];
const SENIOR = /\b(senior|confirme|expert|lead|\d+\s*ans)\b/;

const has = (hay: string, term: string) => new RegExp(`(?:^| )${normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?: |$)`).test(hay);

export function extractOfferSkills(o: MatchOffer): string[] {
  const found = findTerms(`${o.title} ${o.description ?? ""}`, TECH_DICTIONARY); // texte brut : évite « C# » = lettre « c »
  const all = [...o.skills, ...found];
  const seen = new Set<string>();
  return all.filter((s) => { const k = normalize(s); if (!k || seen.has(k)) return false; seen.add(k); return true; });
}

export function matchOffer(p: MatchProfile, o: MatchOffer): MatchResult {
  const offerSkills = extractOfferSkills(o);
  const mine = new Set(p.skills.map(normalize));
  const matchedSkills = offerSkills.filter((s) => mine.has(normalize(s)));
  const missingSkills = offerSkills.filter((s) => !mine.has(normalize(s)));

  // 1) Compétences : part des exigences couvertes ; neutre (50 %) si l'offre n'en liste aucune.
  // 2) Cohérence formation/poste : domaine IT dans le titre / la description + mots-clés de l'étudiant.
  const title = normalize(o.title);
  const body = normalize(o.description ?? "");
  const itInTitle = IT_TERMS.some((t) => has(title, t));
  const itInBody = IT_TERMS.filter((t) => has(body, t)).length;
  const kwHit = p.keywords.some((k) => has(title, k) || has(body, k));
  const studentIsIT = /informatique|data|r[ée]seau|num[ée]rique|ia\b|cyber|dev/i.test(`${p.formation ?? ""} ${p.keywords.join(" ")}`);
  let roleRatio = (itInTitle ? 0.7 : 0) + Math.min(itInBody, 3) * 0.1 + (kwHit ? 0.2 : 0);
  roleRatio = Math.min(1, roleRatio);
  if (!studentIsIT) roleRatio = kwHit ? 0.6 : 0.3;
  const role = Math.round(WEIGHTS.role * roleRatio);

  // Compétences (calculé ici car dépend du signal de domaine) : neutre à 50 % seulement si l'offre
  // ne liste rien MAIS reste dans le domaine de l'étudiant ; sinon 10 % (pas de crédit gratuit hors domaine).
  const skillRatio = offerSkills.length ? matchedSkills.length / offerSkills.length : roleRatio >= 0.5 ? 0.5 : 0.1;
  const skills = Math.round(WEIGHTS.skills * skillRatio);

  // 3) Expériences pertinentes : recouvrement entre expériences déclarées et offre.
  const expTokens = new Set(p.experiences.flatMap((e) => normalize(e).split(" ")).filter((w) => w.length > 4));
  const offerTokens = new Set(`${title} ${body}`.split(" ").filter((w) => w.length > 4));
  const overlap = [...expTokens].filter((w) => offerTokens.has(w)).length;
  const experience = Math.round(WEIGHTS.experience * Math.min(1, overlap / 2));

  // 4) Type de contrat recherché.
  const alt = ["ALTERNANCE", "APPRENTISSAGE", "PROFESSIONNALISATION"];
  const wanted = p.goal === "ALTERNANCE" ? alt : ["STAGE"];
  const contractOk = wanted.includes(o.contractType);
  const contract = contractOk ? WEIGHTS.contract : o.contractType === "AUTRE" ? 5 : 0;

  // 5) Niveau : pénalise les exigences de séniorité.
  const senior = SENIOR.test(`${title} ${body}`);
  const level = senior ? 0 : WEIGHTS.level;

  let score = skills + role + experience + contract + level;
  // Un contrat hors stage/alternance (CDI/CDD) ou un poste senior ne peut pas être "pertinent".
  if (!contractOk && ["CDI", "CDD"].includes(o.contractType)) score = Math.min(score, 35);
  if (!contractOk && ["STAGE", "ALTERNANCE", "APPRENTISSAGE", "PROFESSIONNALISATION"].includes(o.contractType)) score = Math.min(score, 55);
  if (senior) score = Math.min(score, 40);
  score = Math.max(0, Math.min(100, score));

  const strengths: string[] = [];
  if (matchedSkills.length) strengths.push(`Maîtrise de ${matchedSkills.join(", ")}`);
  if (contractOk) strengths.push(`Type de contrat conforme (${o.contractType.toLowerCase()})`);
  if (itInTitle && studentIsIT) strengths.push("Intitulé cohérent avec votre formation");
  if (experience > 0) strengths.push("Une de vos expériences est proche de ce poste");

  const parts: string[] = [];
  parts.push(offerSkills.length
    ? `${matchedSkills.length}/${offerSkills.length} compétences demandées sont présentes dans votre profil.`
    : "L'offre ne détaille pas de compétences : ce critère est évalué de façon prudente.");
  if (missingSkills.length) parts.push(`À renforcer : ${missingSkills.slice(0, 4).join(", ")}.`);
  if (!contractOk) parts.push(`Le contrat (${o.contractType.toLowerCase()}) ne correspond pas à votre objectif (${p.goal.toLowerCase()}).`);
  if (senior) parts.push("L'offre exige un niveau d'expérience supérieur à celui d'un étudiant.");
  parts.push("Ce score mesure la compatibilité avec votre profil, pas vos chances d'être recruté.");

  return { score, matchedSkills, missingSkills, strengths, explanation: parts.join(" "), breakdown: { skills, role, experience, contract, level } };
}
