import "dotenv/config";
import { franceTravail } from "../connectors/france-travail";

(async () => {
  console.log("configuré :", franceTravail.isConfigured());
  try {
    const offers = await franceTravail.search!({ keywords: ["développeur"], goal: "ALTERNANCE" });
    console.log("offres reçues :", offers.length);
    const byType: Record<string, number> = {};
    offers.forEach((o) => (byType[o.contractType] = (byType[o.contractType] ?? 0) + 1));
    console.log("types de contrat détectés :", byType);
    offers.slice(0, 5).forEach((o) => console.log("-", o.contractType, "|", o.title, "|", o.company ?? "?", "|", o.location ?? "?", "|", o.url));
  } catch (e) {
    console.error("ERREUR :", e instanceof Error ? e.message : e);
    process.exit(1);
  }
})();
