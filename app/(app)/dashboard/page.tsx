import { requireUser } from "@/lib/auth/session";
import { Card } from "@/components/ui";
import { ActivityChart } from "@/components/activity-chart";
import { getUserStats, RELEVANT_THRESHOLD } from "@/services/stats";
import { refreshFollowUps } from "@/services/followups";

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <Card className="p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-3xl font-semibold text-teal-900">{value}</p>{hint && <p className="text-xs text-slate-400">{hint}</p>}</Card>;
}

export default async function Dashboard() {
  const user = await requireUser();
  await refreshFollowUps(user.id);
  const s = await getUserStats(user.id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-teal-950">Bonjour {user.profile?.firstName ?? ""} 👋</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Offres collectées" value={s.collected} />
        <Tile label="Offres pertinentes" value={s.relevant} hint={`score ≥ ${RELEVANT_THRESHOLD}`} />
        <Tile label="Candidatures envoyées" value={s.sent} />
        <Tile label="Réponses reçues" value={s.responses} />
        <Tile label="Entretiens" value={s.interviews} />
        <Tile label="Refus" value={s.refusals} />
        <Tile label="Taux de réponse" value={`${s.responseRate} %`} hint="réponses / envoyées" />
        <Tile label="Conversion en entretien" value={`${s.interviewRate} %`} hint="entretiens / envoyées" />
      </div>
      <Card><h2 className="mb-2 font-semibold">Évolution sur 8 semaines</h2>
        {s.sent === 0 ? <p className="text-sm text-slate-500">Le graphique apparaîtra dès votre première candidature envoyée.</p> : <ActivityChart data={s.weeks} />}</Card>
    </div>
  );
}
