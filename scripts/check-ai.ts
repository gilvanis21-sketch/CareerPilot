import "dotenv/config";
import { generateMail } from "../ai/generate";

const profile = { firstName: "Camille", lastName: "Dupont", formation: "Bachelor Informatique", studyYear: "B3", goal: "ALTERNANCE" as const, skills: ["Python", "SQL", "Docker"], experiences: ["Stage développeur web – Agence Fictive"] };

(async () => {
  console.log("provider :", process.env.AI_PROVIDER);
  const r = await generateMail(profile, { kind: "OFFRE", company: "Acme Fictive", role: "Alternant Data Analyst", contract: "ALTERNANCE", offerSkills: ["Python", "SQL", "Kubernetes"] }, { aiConsent: true, anonymize: true });
  console.log("moteur :", r.engine, "| avertissements :", r.warnings);
  console.log("OBJET :", r.subject, "\n\n" + r.body);
})().catch((e) => { console.error("ERREUR :", e.message); process.exit(1); });
