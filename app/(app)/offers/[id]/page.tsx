import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, Button } from "@/components/ui";
import { prepareApplicationAction } from "../actions";

export default async function OfferDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const offer = await db.jobOffer.findUnique({ where: { id }, include: { source: true } });
  if (!offer) notFound();
  const m = await db.jobMatch.findUnique({ where: { userId_offerId: { userId: user.id, offerId: id } } });
  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/offers" className="text-sm text-teal-800 underline">← Retour aux offres</Link>
      <Card className="space-y-2">
        <h1 className="text-2xl font-semibold text-teal-950">{offer.title}</h1>
        <p className="text-slate-600">{offer.company} · {offer.location} · {offer.contractType.toLowerCase()}</p>
        <p className="text-xs text-slate-500">Source : {offer.source.name} · collectée le {offer.collectedAt.toLocaleDateString("fr-FR")}{offer.publishedAt && ` · publiée le ${offer.publishedAt.toLocaleDateString("fr-FR")}`}{offer.deadline && ` · limite ${offer.deadline.toLocaleDateString("fr-FR")}`}</p>
        <p className="whitespace-pre-line pt-2 text-slate-800">{offer.description}</p>
        {offer.skills.length > 0 && <p className="text-sm"><b>Compétences demandées :</b> {offer.skills.join(", ")}</p>}
        <div className="flex gap-2 pt-2">
          <a href={offer.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Consulter l’offre</a>
          <form action={prepareApplicationAction}><input type="hidden" name="offerId" value={offer.id} /><Button>Préparer ma candidature</Button></form>
        </div>
      </Card>
      {m && (
        <Card className="space-y-2">
          <h2 className="font-semibold">Compatibilité : {m.score}/100</h2>
          <p className="text-sm text-slate-700">{m.explanation}</p>
          {m.matchedSkills.length > 0 && <p className="text-sm"><b className="text-teal-800">Compétences correspondantes :</b> {m.matchedSkills.join(", ")}</p>}
          {m.missingSkills.length > 0 && <p className="text-sm"><b className="text-amber-700">Compétences manquantes :</b> {m.missingSkills.join(", ")}</p>}
          {m.strengths.length > 0 && <ul className="list-inside list-disc text-sm text-slate-700">{m.strengths.map((s) => <li key={s}>{s}</li>)}</ul>}
        </Card>
      )}
    </div>
  );
}
