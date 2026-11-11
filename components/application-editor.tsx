"use client";
import { useActionState, useState } from "react";
import { Button, Card, Field } from "./ui";
import { saveAction, sendAction } from "@/app/(app)/applications/actions";

type Props = { id: string; subject: string; body: string; recipient: string; validated: boolean; sent: boolean; canValidate: boolean; hasAccount: boolean; accountAddress?: string; remaining: number; limit: number };

export function ApplicationEditor(p: Props) {
  const [saveState, save, saving] = useActionState(saveAction, undefined);
  const [sendState, send, sending] = useActionState(sendAction, undefined);
  const [body, setBody] = useState(p.body);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <Card>
        <form action={save} className="space-y-3">
          <input type="hidden" name="id" value={p.id} />
          <Field label="Destinataire (saisi par vous – jamais deviné)" name="recipient" type="email" defaultValue={p.recipient} placeholder="recrutement@entreprise.fr" />
          <Field label="Objet" name="subject" defaultValue={p.subject} />
          <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Message</span>
            <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20" /></label>
          {saveState?.error && <p role="alert" className="text-sm text-red-600">{saveState.error}</p>}
          {saveState?.ok && <p className="text-sm text-teal-800">{saveState.ok}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving}>Enregistrer les modifications</Button>
            <Button type="button" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(`${p.subject}\n\n${body}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copié ✓" : "Copier le message"}</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Envoi</h2>
        {!p.hasAccount ? <p className="text-sm text-amber-700">Aucune messagerie connectée. <a className="underline" href="/settings">Connectez Gmail/Outlook dans les Paramètres</a> ou copiez le message pour postuler sur le site de l’entreprise.</p>
          : <p className="text-sm text-slate-600">Envoi depuis <b>{p.accountAddress}</b> · {p.remaining}/{p.limit} envois restants aujourd’hui.</p>}
        {!p.validated && <p className="text-sm text-slate-500">Étape 1 : relisez, enregistrez puis cliquez sur « Valider ». Toute modification annule la validation.</p>}
        <form action={send} className="space-y-3">
          <input type="hidden" name="id" value={p.id} />
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" className="mt-1" />Je confirme avoir relu ce message et j’autorise son envoi depuis ma messagerie.</label>
          {sendState?.error && <p role="alert" className="text-sm text-red-600">{sendState.error}</p>}
          {sendState?.ok && <p className="text-sm text-teal-800">{sendState.ok}</p>}
          <Button disabled={sending || !p.validated}>{sending ? "Envoi…" : p.sent ? "Envoyer la relance" : "Envoyer la candidature"}</Button>
        </form>
      </Card>
    </div>
  );
}
