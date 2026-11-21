"use client";
import { useActionState, useState } from "react";
import { Button, Card, Field } from "./ui";
import { createSpontaneousAction } from "@/app/(app)/applications/actions";
import { suggestSkills360 } from "@/ai/competences360";

export function SpontaneousForm({ skills, goal }: { skills: readonly string[]; goal: string }) {
  const [s, action, pending] = useActionState(createSpontaneousAction, undefined);
  const [sector, setSector] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  return (
    <form action={action} className="space-y-4">
      <Card className="grid gap-4 md:grid-cols-2">
        <Field label="Nom de l’entreprise" name="company" required />
        <Field label="Secteur" name="sector" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="ex : banque, e-commerce, santé…" />
        <div className="md:col-span-2"><Field label="Adresse email professionnelle de contact (à saisir vous-même)" name="email" type="email" required />
          <p className="mt-1 text-xs text-slate-600">Trouvez-la sur le site de l’entreprise ou auprès d’un contact : l’application n’en devine jamais.</p></div>
      </Card>
      <Card className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Compétences 360 à mettre en avant</h2>
          <Button type="button" variant="ghost" onClick={() => setPicked(suggestSkills360(sector))}>Suggérer selon le secteur</Button></div>
        <div className="grid gap-2 md:grid-cols-2">
          {skills.map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="skills" value={k} checked={picked.includes(k)} onChange={() => toggle(k)} />{k}</label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="unpaid" defaultChecked={goal === "STAGE"} />Proposer un stage de deux mois pouvant ne pas être rémunéré</label>
      </Card>
      {s?.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}
      <Button disabled={pending}>{pending ? "Génération…" : "Générer le message"}</Button>
    </form>
  );
}
