import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const p = await db.studentProfile.findUniqueOrThrow({ where: { userId: user.id }, include: { skills: true } });
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-teal-950">Mon profil</h1>
      <p className="text-sm text-slate-500">Ces informations sont modifiables : vous restez la référence, l’analyse du CV n’est qu’une aide.</p>
      <ProfileForm p={{
        firstName: p.firstName ?? "", lastName: p.lastName ?? "", phone: p.phone ?? "", formation: p.formation ?? "",
        studyYear: p.studyYear ?? "", goal: p.goal, locations: p.locations.join(", "), keywords: p.keywords.join(", "),
        skills: p.skills.map((s) => s.name).join(", "), dailySendLimit: p.dailySendLimit,
      }} />
    </div>
  );
}
