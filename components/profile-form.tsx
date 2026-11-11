"use client";
import { useActionState } from "react";
import { Button, Card, Field } from "./ui";
import { saveProfileAction } from "@/app/(app)/profile/actions";

type P = { firstName: string; lastName: string; phone: string; formation: string; studyYear: string; goal: string; locations: string; keywords: string; skills: string; dailySendLimit: number };

export function ProfileForm({ p }: { p: P }) {
  const [s, action, pending] = useActionState(saveProfileAction, undefined);
  const sel = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
  return (
    <form action={action} className="space-y-4">
      <Card className="grid gap-4 md:grid-cols-2">
        <Field label="Prénom" name="firstName" defaultValue={p.firstName} />
        <Field label="Nom" name="lastName" defaultValue={p.lastName} />
        <Field label="Téléphone" name="phone" defaultValue={p.phone} />
        <Field label="Formation" name="formation" defaultValue={p.formation} />
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Année d’étude</span>
          <select name="studyYear" defaultValue={p.studyYear} className={sel}><option value="">—</option>{["B1", "B2", "B3", "B4"].map((y) => <option key={y}>{y}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Objectif</span>
          <select name="goal" defaultValue={p.goal} className={sel}><option value="STAGE">Stage</option><option value="ALTERNANCE">Alternance</option></select></label>
      </Card>
      <Card className="space-y-4">
        <Field label="Compétences (séparées par des virgules)" name="skills" defaultValue={p.skills} />
        <Field label="Localisations souhaitées" name="locations" defaultValue={p.locations} />
        <Field label="Mots-clés de recherche" name="keywords" defaultValue={p.keywords} />
        <Field label="Plafond quotidien d’envois" name="dailySendLimit" type="number" min={1} max={50} defaultValue={p.dailySendLimit} />
      </Card>
      {s?.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}
      {s?.ok && <p className="text-sm text-teal-800">Profil enregistré ✓</p>}
      <Button disabled={pending}>{pending ? "…" : "Enregistrer"}</Button>
    </form>
  );
}
