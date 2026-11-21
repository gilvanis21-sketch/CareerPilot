import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { refreshFollowUps } from "@/services/followups";

const LABEL: Record<string, string> = { BROUILLON: "Brouillon", A_VALIDER: "À valider", ENVOYEE: "Envoyée", EN_ATTENTE: "En attente", ENTRETIEN: "Entretien", REFUSEE: "Refusée", ACCEPTEE: "Acceptée", RELANCE_NECESSAIRE: "Relance nécessaire" };

export default async function Applications({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const { status } = await searchParams;
  await refreshFollowUps(user.id);
  const apps = await db.application.findMany({ where: { userId: user.id, ...(status && LABEL[status] ? { status: status as never } : {}) }, orderBy: { createdAt: "desc" }, include: { offer: true } });
  return (
    <div className="max-w-3xl space-y-3">
      <h1 className="text-2xl font-semibold text-teal-950">Suivi des candidatures</h1>
      <p className="text-sm text-slate-600">Rien n’est envoyé sans votre validation explicite.</p>
      <nav className="flex flex-wrap gap-1 text-xs" aria-label="Filtrer par statut">
        <Link href="/applications" className={`rounded-full px-3 py-1 ${!status ? "bg-teal-800 text-white" : "bg-slate-100"}`}>Toutes</Link>
        {Object.entries(LABEL).map(([k, v]) => <Link key={k} href={`/applications?status=${k}`} className={`rounded-full px-3 py-1 ${status === k ? "bg-teal-800 text-white" : "bg-slate-100"}`}>{v}</Link>)}
      </nav>
      {apps.length === 0 && <Card>Aucune candidature. Choisissez une offre ou lancez une <Link className="underline" href="/spontaneous">candidature spontanée</Link>.</Card>}
      {apps.map((a) => (
        <Link key={a.id} href={`/applications/${a.id}`} className="block">
          <Card className="flex items-center justify-between transition hover:shadow-md">
            <div><p className="font-medium">{a.offer?.title ?? "Candidature spontanée"}</p><p className="text-sm text-slate-600">{a.companyName}{a.sentAt ? ` · envoyée le ${a.sentAt.toLocaleDateString("fr-FR")}` : ""}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs ${a.status === "RELANCE_NECESSAIRE" ? "bg-amber-100 text-amber-900" : "bg-slate-100"}`}>{LABEL[a.status]}</span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
