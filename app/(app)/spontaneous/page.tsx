import { requireUser } from "@/lib/auth/session";
import { SpontaneousForm } from "@/components/spontaneous-form";
import { COMPETENCES_360 } from "@/ai/competences360";

export default async function Spontaneous() {
  const user = await requireUser();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-teal-950">Candidature spontanée</h1>
      <p className="text-sm text-slate-500">Contactez une entreprise qui ne publie pas d’offre. Vous prévisualisez, modifiez et validez avant tout envoi.</p>
      <SpontaneousForm skills={COMPETENCES_360} goal={user.profile?.goal ?? "ALTERNANCE"} />
    </div>
  );
}
