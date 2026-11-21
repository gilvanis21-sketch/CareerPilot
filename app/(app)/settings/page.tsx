import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PrefsForm, PasswordForm, DeleteForm, EmailForm } from "@/components/settings-forms";
import { Card } from "@/components/ui";
import { oauthConfigured } from "@/services/oauth";

const OAUTH_ERRORS: Record<string, string> = {
  denied: "Connexion annulée : l'autorisation a été refusée côté Google / Microsoft.",
  state: "Session de connexion expirée ou invalide : recommencez.",
  config: "OAuth non configuré sur ce serveur (identifiants client manquants, voir docs/oauth-messagerie.md).",
  rate: "Trop de tentatives : patientez une minute.",
  exchange: "Échec de la connexion à la messagerie. Recommencez ; si cela persiste, voir docs/oauth-messagerie.md.",
};

export default async function Settings({ searchParams }: { searchParams: Promise<{ mail?: string; reason?: string }> }) {
  const q = await searchParams;
  const u = await requireUser();
  const accounts = await db.emailAccount.findMany({ where: { userId: u.id }, select: { id: true, address: true, provider: true, refreshTokenEnc: true } });
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-teal-950">Paramètres</h1>
      <PrefsForm followUpDays={(u.profile?.followUpDays ?? [7, 15]).join(", ")} aiConsent={!!u.aiConsentAt} anonymize={u.profile?.anonymizeForAi ?? true} />
      <EmailForm
        accounts={accounts.map((a) => ({ id: a.id, address: a.address, provider: a.provider, oauth: !!a.refreshTokenEnc }))}
        oauth={{ gmail: oauthConfigured("GMAIL"), outlook: oauthConfigured("OUTLOOK") }}
        notice={q.mail === "ok" ? { ok: "Messagerie connectée ✓ (autorisation OAuth2, aucun mot de passe stocké)" } : q.mail === "error" ? { error: OAUTH_ERRORS[q.reason ?? ""] ?? OAUTH_ERRORS.exchange } : undefined}
      />
      <PasswordForm />
      <Card className="flex items-center justify-between">
        <div><h2 className="font-semibold">Mes données</h2><p className="text-sm text-slate-600">Export complet au format JSON (RGPD).</p></div>
        <a className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50" href="/api/account/export">Télécharger</a>
      </Card>
      <DeleteForm />
    </div>
  );
}
