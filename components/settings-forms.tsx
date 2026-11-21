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

export function EmailForm({ accounts, oauth, notice }: {
  accounts: { id: string; address: string; provider: string; oauth: boolean }[];
  oauth: { gmail: boolean; outlook: boolean };
  notice?: { ok?: string; error?: string };
}) {
  const [s, a, p] = useActionState(connectEmailAction, undefined);
  const btn = "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50";
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Messagerie d’envoi</h2>
      <p className="text-sm text-slate-600">Vos candidatures partent de <b>votre</b> adresse. Connectez-la en un clic : vous autorisez uniquement l’<b>envoi</b> de messages chez Google ou Microsoft, sans jamais nous donner votre mot de passe. Vous pouvez retirer l’autorisation à tout moment.</p>
      {notice?.error && <p role="alert" className="text-sm text-red-600">{notice.error}</p>}
      {notice?.ok && <p className="text-sm text-teal-800">{notice.ok}</p>}
      {accounts.map((x) => (
        <form key={x.id} action={disconnectEmailAction} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
          <span>{x.address} · {x.provider.toLowerCase()} · {x.oauth ? "OAuth2" : "mot de passe d’application"}</span><input type="hidden" name="id" value={x.id} /><Button variant="ghost">Déconnecter</Button>
        </form>
      ))}
      <div className="flex flex-wrap gap-3">
        {oauth.gmail ? <a className={btn} href="/api/oauth/gmail/start">Se connecter avec Google (Gmail)</a> : <span className="text-sm text-slate-600">Google : non configuré sur ce serveur.</span>}
        {oauth.outlook ? <a className={btn} href="/api/oauth/outlook/start">Se connecter avec Microsoft (Outlook)</a> : <span className="text-sm text-slate-600">Microsoft : non configuré sur ce serveur.</span>}
      </div>
      <details className="rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Autre méthode : mot de passe d’application (Gmail ou Microsoft 365 avec SMTP activé)</summary>
        <p className="mt-2 text-sm text-slate-600">Gmail : validation en 2 étapes puis <i>mot de passe d’application</i> (compte Google → Sécurité). N’entrez jamais votre mot de passe habituel. Outlook/Hotmail personnel n’accepte plus cette méthode : utilisez le bouton Microsoft ci-dessus.</p>
        <form action={a} className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Fournisseur</span>
            <select name="provider" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="GMAIL">Gmail</option><option value="OUTLOOK">Microsoft 365</option></select></label>
          <Field label="Adresse" name="address" type="email" required />
          <Field label="Mot de passe d’application" name="password" type="password" autoComplete="off" required />
          <div className="md:col-span-3 space-y-2">{s?.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}{s?.ok && <p className="text-sm text-teal-800">{s.ok}</p>}<Button disabled={p}>{p ? "Vérification…" : "Connecter et vérifier"}</Button></div>
        </form>
      </details>
    </Card>
  );
}
