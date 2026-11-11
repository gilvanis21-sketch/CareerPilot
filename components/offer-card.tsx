import Link from "next/link";
import { Star, X } from "lucide-react";
import { Button } from "./ui";
import { toggleFavoriteAction, rejectAction, prepareApplicationAction } from "@/app/(app)/offers/actions";

type Props = {
  offerId: string; title: string; company: string | null; location: string | null; contractType: string;
  publishedAt: Date | null; url: string; score: number; isFavorite: boolean; isDemo: boolean; sourceName: string;
};

const scoreColor = (s: number) => (s >= 70 ? "bg-teal-100 text-teal-900" : s >= 50 ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600");

export function OfferCard(p: Props) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/offers/${p.offerId}`} className="font-semibold text-slate-900 hover:underline">{p.title}</Link>
          <p className="text-sm text-slate-600">{p.company ?? "Entreprise non précisée"} · {p.location ?? "Lieu non précisé"}</p>
        </div>
        <span title="Compatibilité avec votre profil (pas une probabilité d'embauche)" className={`rounded-full px-3 py-1 text-sm font-semibold ${scoreColor(p.score)}`}>{p.score}/100</span>
      </div>
      <p className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded bg-slate-100 px-2 py-0.5">{p.contractType.toLowerCase()}</span>
        {p.publishedAt && <span>publiée le {p.publishedAt.toLocaleDateString("fr-FR")}</span>}
        <span>via {p.sourceName}</span>
        {p.isDemo && <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">fictive</span>}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Consulter l’offre</a>
        <form action={toggleFavoriteAction}><input type="hidden" name="offerId" value={p.offerId} />
          <Button variant="ghost" aria-pressed={p.isFavorite}><Star size={16} className={p.isFavorite ? "fill-amber-400 text-amber-500" : ""} />{p.isFavorite ? "Favori" : "Ajouter aux favoris"}</Button></form>
        <form action={prepareApplicationAction}><input type="hidden" name="offerId" value={p.offerId} /><Button>Préparer ma candidature</Button></form>
        <form action={rejectAction} className="ml-auto"><input type="hidden" name="offerId" value={p.offerId} />
          <button aria-label="Rejeter cette offre" title="Rejeter" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"><X size={16} /></button></form>
      </div>
    </article>
  );
}
