import "server-only";
import { TECH_DICTIONARY, findTerms } from "@/services/cv-parser";
import { normalize } from "@/services/dedupe";

export interface GenProfile {
  firstName?: string | null; lastName?: string | null; formation?: string | null; studyYear?: string | null;
  goal: "STAGE" | "ALTERNANCE"; skills: string[]; experiences: string[];
}
export interface GenTarget {
  kind: "OFFRE" | "SPONTANEE" | "RELANCE";
  company: string; role?: string; sector?: string; contract?: string;
  offerSkills?: string[]; skills360?: string[]; unpaidTwoMonths?: boolean; sentOn?: string;
}
export interface GeneratedMail { subject: string; body: string }

/** Formulations qui assument un manque ou un objectif d'apprentissage (« je n'ai pas encore pratiqué X »). */
const GAP = /\b(pas encore|jamais|n'ai pas|ne maîtrise pas|me former|apprendre|découvrir|monter en compétence)\b|pas (?:encore )?(?:eu|pratiqué)/i;

/**
 * Garde-fou « ne jamais inventer » : renvoie les technologies citées qui ne figurent PAS dans le profil.
 * Une technologie demandée par l'offre (`offerSkills`) n'est tolérée que dans une phrase qui l'assume comme
 * un manque ou un objectif d'apprentissage ; « je maîtrise Kubernetes » est donc signalé.
 */
export function findInventedSkills(text: string, profileSkills: string[], offerSkills: string[] = []): string[] {
  // Recherche sur le texte brut (et non normalisé) : « C# » / « C++ » ne doivent pas se confondre avec la lettre « c ».
  const mine = new Set(profileSkills.map((s) => s.toLowerCase().trim()));
  const asked = new Set(offerSkills.map((s) => s.toLowerCase().trim()));
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  return findTerms(text, TECH_DICTIONARY).filter((term) => {
    const t = term.toLowerCase();
    if (mine.has(t)) return false;
    if (!asked.has(t)) return true;
    const mentions = sentences.filter((sn) => findTerms(sn, [term]).length);
    return !mentions.every((sn) => GAP.test(sn)); // toutes les phrases doivent assumer le manque
  });
}

export function templateMail(p: GenProfile, t: GenTarget): GeneratedMail {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "[Prénom Nom]";
  const kindLabel = p.goal === "STAGE" ? "stage" : "alternance";
  const mine = p.skills.slice(0, 6);
  const formation = p.formation ? `, actuellement en ${p.formation}${p.studyYear ? ` (${p.studyYear})` : ""}` : "";

  if (t.kind === "RELANCE") {
    return {
      subject: `Relance – candidature ${t.role ?? kindLabel} – ${name}`,
      body: `Bonjour,\n\nJe me permets de revenir vers vous au sujet de ma candidature${t.sentOn ? ` envoyée le ${t.sentOn}` : ""} pour ${t.role ? `le poste de ${t.role}` : `un ${kindLabel}`} au sein de ${t.company}. Je reste très motivé(e) par cette opportunité et disponible pour échanger quand vous le souhaitez.\n\nCordialement,\n${name}`,
    };
  }

  const matched = (t.offerSkills ?? []).filter((s) => mine.map(normalize).includes(normalize(s)));
  const arg = t.kind === "OFFRE"
    ? matched.length ? `Mon profil correspond à plusieurs points de votre annonce, notamment ${matched.join(", ")}.` : "Mon parcours me permet de m'investir rapidement sur les missions proposées."
    : t.skills360?.length ? `Ma formation m'a permis de développer des compétences en lien avec votre activité : ${t.skills360.join(", ")}.` : "";
  const skillLine = mine.length ? `J'ai notamment pratiqué : ${mine.join(", ")}.` : "";
  const exp = p.experiences[0] ? `Par ailleurs, j'ai eu l'occasion de réaliser : ${p.experiences[0]}.` : "";
  const unpaid = t.unpaidTwoMonths ? `\n\nJe suis ouvert(e) à un stage de deux mois, qui peut ne pas être rémunéré, afin de découvrir votre structure.` : "";

  const intro = t.kind === "OFFRE"
    ? `Je vous écris à propos de votre offre de ${t.role} (${t.contract?.toLowerCase() ?? kindLabel}) chez ${t.company}.`
    : `Je me permets de vous contacter spontanément car l'activité de ${t.company}${t.sector ? ` dans le secteur ${t.sector}` : ""} correspond à mon projet de ${kindLabel}.`;

  return {
    subject: t.kind === "OFFRE" ? `Candidature – ${t.role} – ${name}` : `Candidature spontanée (${kindLabel}) – ${name}`,
    body: `Bonjour,\n\n${intro}\n\nJe suis ${name}${formation}. ${arg} ${skillLine} ${exp}${unpaid}\n\nJe serais ravi(e) d'échanger avec vous et reste disponible pour un entretien.\n\nCordialement,\n${name}`.replace(/ {2,}/g, " ").replace(/ \n/g, "\n"),
  };
}

/** Anonymise ce qui part vers un LLM hébergé (nom, email, téléphone). */
export function anonymizeProfile(p: GenProfile): GenProfile {
  return { ...p, firstName: "[PRÉNOM]", lastName: "[NOM]" };
}

export async function generateMail(p: GenProfile, t: GenTarget, opts: { aiConsent: boolean; anonymize: boolean }): Promise<GeneratedMail & { engine: string; warnings: string[] }> {
  const provider = process.env.AI_PROVIDER ?? "mock";
  let mail: GeneratedMail;
  let engine = "template";
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY && opts.aiConsent) {
    const prof = opts.anonymize ? anonymizeProfile(p) : p;
    try { mail = await anthropicMail(prof, t); } catch (e) {
      console.error("[ai] échec Anthropic, repli sur le modèle :", e instanceof Error ? e.message : e);
      const fallback = templateMail(p, t);
      return { ...fallback, engine: "template", warnings: ["L'IA est indisponible : message généré depuis le modèle standard."] };
    }
    if (opts.anonymize) {
      const real = [p.firstName, p.lastName].filter(Boolean).join(" ") || "[Prénom Nom]";
      mail = { subject: mail.subject.replace("[PRÉNOM] [NOM]", real), body: mail.body.replace(/\[PRÉNOM\] \[NOM\]/g, real).replace(/\[PRÉNOM\]/g, p.firstName ?? "").replace(/\[NOM\]/g, p.lastName ?? "") };
    }
    engine = "anthropic";
  } else {
    mail = templateMail(p, t);
  }
  const warnings: string[] = [];
  const invented = findInventedSkills(`${mail.subject} ${mail.body}`, [...p.skills, ...(t.skills360 ?? [])], t.offerSkills ?? []);
  if (invented.length) {
    warnings.push(`Compétences citées absentes de votre profil : ${invented.join(", ")}. Corrigez avant d'envoyer.`);
    if (engine !== "template") { mail = templateMail(p, t); engine = "template"; warnings.push("Message régénéré depuis le modèle sûr."); }
  }
  return { ...mail, engine, warnings };
}

/** ⚠ Non testé en réel (pas de clé pendant le développement). Sortie JSON stricte, puis validée par findInventedSkills. */
async function anthropicMail(p: GenProfile, t: GenTarget): Promise<GeneratedMail> {
  const system = "Tu rédiges des emails de candidature en français, professionnels et naturels. RÈGLES ABSOLUES : n'invente AUCUNE expérience, diplôme, compétence ou technologie absente du profil fourni. N'invente aucune adresse. Le genre de l'étudiant est inconnu : utilise des formes neutres ou épicènes (« ravi(e) », « motivé(e) »), jamais un accord masculin ou féminin seul. Réponds uniquement en JSON {\"subject\":string,\"body\":string}.";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01",
      // Requis uniquement si la clé n'est pas rattachée à un workspace.
      ...(process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } : {}),
    },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5", max_tokens: 2000, system, messages: [{ role: "user", content: JSON.stringify({ profil: p, cible: t }) }] }),
  });
  if (!r.ok) {
    const detail = await r.json().then((j) => j?.error?.message as string | undefined, () => undefined); // message d'API : ne contient pas la clé
    throw new Error(`Anthropic ${r.status}${detail ? ` – ${detail.slice(0, 200)}` : ""}`);
  }
  const data = await r.json();
  if (data.stop_reason === "max_tokens") throw new Error("Réponse IA tronquée (max_tokens)");
  // La réponse peut commencer par un bloc "thinking" : on prend le premier bloc de type "text".
  const text: string = (data.content as { type: string; text?: string }[] | undefined)?.find((c) => c.type === "text")?.text ?? "";
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("Réponse IA sans JSON exploitable");
  const j = JSON.parse(text.slice(a, b + 1));
  if (typeof j.subject !== "string" || typeof j.body !== "string") throw new Error("Réponse IA invalide");
  return j;
}
