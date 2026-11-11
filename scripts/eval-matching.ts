import { writeFileSync } from "node:fs";
import { BENCHMARK_OFFERS, BENCHMARK_PROFILE } from "../data/benchmark";
import { matchOffer } from "../ai/matching";
import { precisionAtK, recallAtK } from "../services/metrics";

export function evaluate() {
  const rows = BENCHMARK_OFFERS.map((o) => ({ o, m: matchOffer(BENCHMARK_PROFILE, o) })).sort((a, b) => b.m.score - a.m.score);
  const ranked = rows.map((r) => r.o.externalId);
  const rel = new Set(BENCHMARK_OFFERS.filter((o) => o.relevant).map((o) => o.externalId));
  return { rows, p5: precisionAtK(ranked, rel, 5), p10: precisionAtK(ranked, rel, 10), r10: recallAtK(ranked, rel, 10), relevantCount: rel.size };
}

if (process.argv[1]?.endsWith("eval-matching.ts")) {
  const e = evaluate();
  const pct = (x: number) => `${(x * 100).toFixed(0)} %`;
  const md = `# Évaluation du matching (généré par \`npm run eval:matching\`)

Jeu de référence : ${BENCHMARK_OFFERS.length} offres **fictives**, ${e.relevantCount} annotées pertinentes pour un profil fictif (B3 informatique, alternance).
Annotations rédigées par l'équipe de développement (assistée par IA) — **à faire valider par un humain** ; l'échantillon est petit, les résultats sont indicatifs.

| Métrique | Résultat |
|---|---|
| Precision@5 | ${pct(e.p5)} |
| Precision@10 | ${pct(e.p10)} |
| Recall@10 | ${pct(e.r10)} |

## Classement obtenu

| # | Score | Offre | Contrat | Annotation | Justification de l'annotation |
|---|---|---|---|---|---|
${e.rows.map((r, i) => `| ${i + 1} | ${r.m.score} | ${r.o.title} | ${r.o.contractType} | ${r.o.relevant ? "✅ pertinente" : "❌ non pertinente"} | ${r.o.why} |`).join("\n")}
`;
  writeFileSync("docs/matching-evaluation.md", md);
  console.log(`P@5=${pct(e.p5)} P@10=${pct(e.p10)} R@10=${pct(e.r10)}`);
  e.rows.forEach((r, i) => console.log(String(i + 1).padStart(2), String(r.m.score).padStart(3), r.o.relevant ? "OK " : "-- ", r.o.title));
}
