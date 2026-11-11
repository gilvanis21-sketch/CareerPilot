import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Button, Card } from "@/components/ui";
import { ApplicationEditor } from "@/components/application-editor";
import { startOfDay } from "@/lib/dates";
import { findInventedSkills } from "@/ai/generate";
import { generateAction, validateAction, setStatusAction, deleteApplicationAction } from "../actions";

const LABEL: Record<string, string> = { BROUILLON: "Brouillon", A_VALIDER: "À valider", ENVOYEE: "Envoyée", EN_ATTENTE: "En attente de réponse", ENTRETIEN: "Entretien proposé", REFUSEE: "Refusée", ACCEPTEE: "Acceptée", RELANCE_NECESSAIRE: "Relance nécessaire" };

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const app = await db.application.findFirst({ where: { id, userId: user.id }, include: { offer: true, followUps: { orderBy: { dueAt: "asc" } } } });
  if (!app) notFound();
  const msg = await db.generatedMessage.findFirst({ where: { applicationId: id }, orderBy: { version: "desc" } });
  const [account, profile] = await Promise.all([
    db.emailAccount.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.studentProfile.findUniqueOrThrow({ where: { userId: user.id }, include: { skills: true } }),
  ]);
  const sentToday = await db.activityLog.count({ where: { userId: user.id, action: "mail.sent", createdAt: { gte: startOfDay() } } });
  const invented = msg ? findInventedSkills(`${msg.subject} ${msg.body}`, [...profile.skills.map((s) => s.name), ...app.skills360], app.offer?.skills ?? []) : [];

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/applications" className="text-sm text-teal-800 underline">← Candidatures</Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-teal-950">{app.offer?.title ?? "Candidature spontanée"}</h1>
          <p className="text-slate-600">{app.companyName}{app.companySector ? ` · ${app.companySector}` : ""}</p>
        </div>
        <span className="rounded-full bg-teal-100 px-3 py-1 text-sm text-teal-900">{LABEL[app.status]}</span>
      </div>

      {app.spontaneous && app.skills360.length > 0 && <p className="text-sm text-slate-600"><b>Compétences 360 mises en avant :</b> {app.skills360.join(", ")}</p>}

      {!msg ? (
        <Card className="space-y-3"><p>Aucun message pour l’instant.</p>
          <form action={generateAction}><input type="hidden" name="id" value={app.id} /><Button>Générer le message</Button></form></Card>
      ) : (
        <>
          {invented.length > 0 && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">⚠ Technologies citées absentes de votre profil : {invented.join(", ")}. Corrigez avant d’envoyer.</p>}
          <ApplicationEditor key={msg.id} id={app.id} subject={msg.subject ?? ""} body={msg.body} recipient={app.recipientEmail ?? ""}
            validated={!!app.validatedAt} sent={!!app.sentAt} canValidate hasAccount={!!account} accountAddress={account?.address}
            remaining={Math.max(0, profile.dailySendLimit - sentToday)} limit={profile.dailySendLimit} />
          <Card className="flex flex-wrap items-center gap-2">
            <form action={validateAction}><input type="hidden" name="id" value={app.id} /><Button variant="ghost" disabled={!!app.validatedAt}>{app.validatedAt ? "Validée ✓" : "Valider ce message"}</Button></form>
            <form action={generateAction}><input type="hidden" name="id" value={app.id} /><Button variant="ghost">Régénérer</Button></form>
            {app.sentAt && <form action={generateAction}><input type="hidden" name="id" value={app.id} /><input type="hidden" name="relance" value="1" /><Button variant="ghost">Préparer une relance</Button></form>}
          </Card>
        </>
      )}

      <Card className="space-y-3">
        <h2 className="font-semibold">Suivi</h2>
        <form action={setStatusAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={app.id} />
          <select name="status" defaultValue={app.status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Button variant="ghost">Mettre à jour</Button>
        </form>
        {app.followUps.length > 0 && <ul className="text-sm text-slate-600">{app.followUps.map((f) => <li key={f.id}>Relance J+{f.dayOffset} · {f.dueAt.toLocaleDateString("fr-FR")} · {f.status.toLowerCase()}</li>)}</ul>}
        <form action={deleteApplicationAction}><input type="hidden" name="id" value={app.id} /><Button variant="danger">Supprimer</Button></form>
      </Card>
    </div>
  );
}
