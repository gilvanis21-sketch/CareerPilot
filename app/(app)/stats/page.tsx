import { requireUser } from "@/lib/auth/session";
import { Card } from "@/components/ui";
import { BarList } from "@/components/bar-list";
import { getMarketStats } from "@/services/market";
import { K_ANON } from "@/services/market-aggregate";

export default async function Stats() {
  await requireUser();
  const m = await getMarketStats();
  const rows = (xs: { name: string; count: number }[]) => xs.map((x) => ({ name: x.name, value: x.count }));
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold text-teal-950">Tendances du marché</h1>
      <p className="text-sm text-slate-500">Statistiques agrégées et anonymisées. Les indicateurs issus des étudiants ne sont publiés que si au moins {K_ANON} étudiants y contribuent.</p>
      {m.demoShare > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">⚠ {m.demoShare} % des {m.totalOffers} offres sont fictives (mode démonstration) : ces chiffres illustrent l’outil et ne décrivent pas le marché réel.</p>}
      {m.totalOffers === 0 && <Card>Aucune offre collectée pour l’instant.</Card>}
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="mb-2 font-semibold">Secteurs qui recrutent le plus</h2>{m.bySector.length ? <BarList data={rows(m.bySector)} label="Offres par secteur" /> : <p className="text-sm text-slate-500">Pas de données.</p>}</Card>
        <Card><h2 className="mb-2 font-semibold">Compétences les plus demandées</h2>{m.skills.length ? <BarList data={rows(m.skills)} label="Compétences demandées" /> : <p className="text-sm text-slate-500">Pas de données.</p>}</Card>
        <Card><h2 className="mb-2 font-semibold">Types de contrats proposés</h2>{m.contracts.length ? <BarList data={rows(m.contracts).map((r) => ({ ...r, name: r.name.toLowerCase() }))} label="Contrats proposés" /> : <p className="text-sm text-slate-500">Pas de données.</p>}</Card>
        <Card><h2 className="mb-2 font-semibold">Évolution des offres collectées</h2><BarList vertical={false} data={m.evolution.map((e) => ({ name: e.semaine, value: e.offres }))} label="Offres collectées par semaine" /></Card>
      </div>
      <Card className="space-y-2">
        <h2 className="font-semibold">Réponses par secteur</h2>
        {m.sectorResponses.length === 0 ? <p className="text-sm text-slate-500">Pas encore assez de candidatures ({K_ANON} étudiants minimum par secteur) pour publier ces indicateurs{m.hiddenGroups ? ` — ${m.hiddenGroups} groupe(s) masqué(s)` : ""}.</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-1">Secteur</th><th>Envoyées</th><th>Taux de réponse</th><th>Délai moyen</th></tr></thead>
            <tbody>{m.sectorResponses.map((s) => <tr key={s.sector} className="border-t border-slate-100"><td className="py-1">{s.sector}</td><td>{s.sent}</td><td>{s.responseRate} %</td><td>{s.avgResponseDays != null ? `${s.avgResponseDays} j` : "—"}</td></tr>)}</tbody></table>
        )}
      </Card>
      <Card className="space-y-2">
        <h2 className="font-semibold">Postes les plus recherchés par les étudiants</h2>
        {m.roles.length === 0 ? <p className="text-sm text-slate-500">Pas encore assez d’étudiants pour publier ce classement.</p> : <p className="text-sm">{m.roles.map((r) => `${r.name} (${r.users})`).join(" · ")}</p>}
      </Card>
    </div>
  );
}
