import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PrefsForm, PasswordForm, DeleteForm, EmailForm } from "@/components/settings-forms";
import { Card } from "@/components/ui";

export default async function Settings() {
  const u = await requireUser();
  const accounts = await db.emailAccount.findMany({ where: { userId: u.id }, select: { id: true, address: true, provider: true } });
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-teal-950">Paramètres</h1>
      <PrefsForm followUpDays={(u.profile?.followUpDays ?? [7, 15]).join(", ")} aiConsent={!!u.aiConsentAt} anonymize={u.profile?.anonymizeForAi ?? true} />
      <EmailForm accounts={accounts} />
      <PasswordForm />
      <Card className="flex items-center justify-between">
        <div><h2 className="font-semibold">Mes données</h2><p className="text-sm text-slate-500">Export complet au format JSON (RGPD).</p></div>
        <a className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50" href="/api/account/export">Télécharger</a>
      </Card>
      <DeleteForm />
    </div>
  );
}
