"use client";
import { useActionState } from "react";
import { Button, Card, Field } from "./ui";
import { savePrefsAction, changePasswordAction, deleteAccountAction } from "@/app/(app)/settings/actions";
import { connectEmailAction, disconnectEmailAction } from "@/app/(app)/applications/actions";

const Msg = ({ s }: { s?: { error?: string; ok?: string } }) => (
  <>{s?.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}{s?.ok && <p className="text-sm text-teal-800">{s.ok}</p>}</>
);

export function PrefsForm({ followUpDays, aiConsent, anonymize }: { followUpDays: string; aiConsent: boolean; anonymize: boolean }) {
  const [s, a, p] = useActionState(savePrefsAction, undefined);
  return (
    <Card><form action={a} className="space-y-3">
      <h2 className="font-semibold">Relances et IA</h2>
      <Field label="Jours de relance (ex : 7, 15)" name="followUpDays" defaultValue={followUpDays} />
      <label className="flex gap-2 text-sm"><input type="checkbox" name="aiConsent" defaultChecked={aiConsent} />J’autorise l’envoi de mon CV à un modèle de langage hébergé pour générer mes messages.</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="anonymize" defaultChecked={anonymize} />Anonymiser mes coordonnées avant tout envoi à l’IA (recommandé).</label>
      <Msg s={s} /><Button disabled={p}>Enregistrer</Button>
    </form></Card>
  );
}

export function PasswordForm() {
  const [s, a, p] = useActionState(changePasswordAction, undefined);
  return (
    <Card><form action={a} className="space-y-3">
      <h2 className="font-semibold">Mot de passe</h2>
      <Field label="Actuel" name="current" type="password" autoComplete="current-password" required />
      <Field label="Nouveau" name="next" type="password" autoComplete="new-password" required />
      <Msg s={s} /><Button disabled={p}>Modifier</Button>
    </form></Card>
  );
}

export function DeleteForm() {
  const [s, a, p] = useActionState(deleteAccountAction, undefined);
  return (
    <Card className="border-red-200"><form action={a} className="space-y-3">
      <h2 className="font-semibold text-red-700">Supprimer mon compte</h2>
      <p className="text-sm text-slate-600">Suppression définitive du profil, des CV, des candidatures et des messages.</p>
      <Field label="Mot de passe" name="password" type="password" required />
      <Field label="Tapez SUPPRIMER" name="confirm" required />
      <Msg s={s} /><Button variant="danger" disabled={p}>Supprimer définitivement</Button>
    </form></Card>
  );
}

export function EmailForm({ accounts }: { accounts: { id: string; address: string; provider: string }[] }) {
  const [s, a, p] = useActionState(connectEmailAction, undefined);
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Messagerie d’envoi</h2>
      <p className="text-sm text-slate-600">Vos candidatures partent de <b>votre</b> adresse. Gmail : activez la validation en 2 étapes puis créez un <i>mot de passe d’application</i> (compte Google → Sécurité). N’entrez jamais votre mot de passe habituel. Il est chiffré et vérifié avant enregistrement. Outlook personnel n’est plus compatible (Microsoft a désactivé ce mode) ; Microsoft 365 uniquement si votre organisation a activé le SMTP.</p>
      {accounts.map((x) => (
        <form key={x.id} action={disconnectEmailAction} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
          <span>{x.address} · {x.provider.toLowerCase()}</span><input type="hidden" name="id" value={x.id} /><Button variant="ghost">Déconnecter</Button>
        </form>
      ))}
      <form action={a} className="grid gap-3 md:grid-cols-3">
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Fournisseur</span>
          <select name="provider" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="GMAIL">Gmail</option><option value="OUTLOOK">Outlook / Microsoft 365</option></select></label>
        <Field label="Adresse" name="address" type="email" required />
        <Field label="Mot de passe d’application" name="password" type="password" autoComplete="off" required />
        <div className="md:col-span-3 space-y-2">{s?.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}{s?.ok && <p className="text-sm text-teal-800">{s.ok}</p>}<Button disabled={p}>{p ? "Vérification…" : "Connecter et vérifier"}</Button></div>
      </form>
    </Card>
  );
}
