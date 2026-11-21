import { daysAgo } from "@/lib/dates";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { OfferCard } from "@/components/offer-card";
import { Button, Card } from "@/components/ui";
import { syncAction } from "./actions";
import { linkedin } from "@/connectors/linkedin";
import { demoEnabled } from "@/connectors/demo";
import { laBonneAlternance } from "@/connectors/la-bonne-alternance";
import type { Prisma } from "@/lib/generated/prisma/client";

type SP = { q?: string; location?: string; company?: string; contract?: string; days?: string; skill?: string; fav?: string };

export default async function OffersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const profile = user.profile!;

  const offerWhere: Prisma.JobOfferWhereInput = { AND: [] };
  const and = offerWhere.AND as Prisma.JobOfferWhereInput[];
  if (!demoEnabled()) and.push({ isDemo: false }); // les offres fictives ne sont plus affichées (ENABLE_DEMO_OFFERS=1 pour les revoir)
  if (sp.q) and.push({ OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { description: { contains: sp.q, mode: "insensitive" } }] });
  if (sp.location) and.push({ location: { contains: sp.location, mode: "insensitive" } });
  if (sp.company) and.push({ company: { contains: sp.company, mode: "insensitive" } });
  if (sp.skill) and.push({ skills: { has: sp.skill } });
  if (sp.contract && ["STAGE", "ALTERNANCE", "APPRENTISSAGE", "PROFESSIONNALISATION", "CDI", "CDD"].includes(sp.contract))
    and.push({ contractType: sp.contract as never });
  const days = Number(sp.days);
  if (days > 0) and.push({ publishedAt: { gte: daysAgo(days) } });
  if (sp.fav) and.push({ favorites: { some: { userId: user.id } } });

  const [matches, total, favs] = await Promise.all([
    db.jobMatch.findMany({ where: { userId: user.id, rejected: false, offer: offerWhere }, include: { offer: { include: { source: true } } }, orderBy: { score: "desc" }, take: 60 }),
    db.jobOffer.count({ where: demoEnabled() ? {} : { isDemo: false } }),
    db.favorite.findMany({ where: { userId: user.id }, select: { offerId: true } }),
  ]);
  const favSet = new Set(favs.map((f) => f.offerId));
  const links = linkedin.searchLinks!({ keywords: profile.keywords, goal: profile.goal, location: profile.locations[0] });
  const inp = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-teal-950">Offres · {profile.goal === "STAGE" ? "stage" : "alternance"}</h1>
        <form action={syncAction}><Button>Actualiser les offres</Button></form>
      </div>
      <Card>
        <form className="grid gap-2 md:grid-cols-6" role="search">
          <input name="q" defaultValue={sp.q} placeholder="Mots-clés / poste" className={`${inp} md:col-span-2`} />
          <input name="location" defaultValue={sp.location} placeholder="Localisation" className={inp} />
          <input name="company" defaultValue={sp.company} placeholder="Entreprise" className={inp} />
          <input name="skill" defaultValue={sp.skill} placeholder="Compétence" className={inp} />
          <select name="contract" defaultValue={sp.contract ?? ""} className={inp}>
            <option value="">Tous contrats</option>
            {["STAGE", "ALTERNANCE", "APPRENTISSAGE", "PROFESSIONNALISATION", "CDI", "CDD"].map((c) => <option key={c} value={c}>{c.toLowerCase()}</option>)}
          </select>
          <select name="days" defaultValue={sp.days ?? ""} className={inp}>
            <option value="">Toute date</option><option value="3">3 derniers jours</option><option value="7">7 jours</option><option value="30">30 jours</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="fav" value="1" defaultChecked={!!sp.fav} />Favoris</label>
          <Button className="md:col-span-2">Filtrer</Button>
        </form>
      </Card>
      <p className="text-sm text-slate-600">{matches.length} offre(s) affichée(s) sur {total} collectée(s), triées par compatibilité. LinkedIn : <a className="text-teal-800 underline" target="_blank" rel="noopener noreferrer" href={links[0].url}>ouvrir ma recherche préremplie</a> (aucune collecte automatique).</p>
      {total === 0 && (laBonneAlternance.isConfigured()
        ? <Card>Aucune offre pour l’instant. Cliquez sur « Actualiser les offres » pour récupérer les offres d’alternance récentes (La bonne alternance).</Card>
        : <Card>Aucune source d’offres réelles n’est configurée sur ce serveur. Ajoutez <code>LBA_API_KEY</code> (clé gratuite La bonne alternance, voir <code>docs/connectors.md</code>), redémarrez, puis cliquez sur « Actualiser les offres ».</Card>)}
      <div className="space-y-3">
        {matches.map((m) => (
          <OfferCard key={m.id} offerId={m.offerId} title={m.offer.title} company={m.offer.company} location={m.offer.location}
            contractType={m.offer.contractType} publishedAt={m.offer.publishedAt} url={m.offer.url} score={m.score}
            isFavorite={favSet.has(m.offerId)} isDemo={m.offer.isDemo} sourceName={m.offer.source.name} />
        ))}
      </div>
    </div>
  );
}
