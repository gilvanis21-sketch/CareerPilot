"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, Field } from "./ui";
import { forgotAction } from "@/app/(auth)/reset-actions";
import { resetAction } from "@/app/(auth)/reset-actions";

export function ForgotForm() {
  const [s, action, pending] = useActionState(forgotAction, undefined);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-teal-900">Mot de passe oublié</h1>
        <form action={action} className="space-y-4">
          <Field label="Email" name="email" type="email" required />
          {s?.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}
          {s?.sent && <p className="text-sm text-teal-800">Si ce compte existe, un lien de réinitialisation a été envoyé.</p>}
          {s?.devLink && <p className="break-all text-xs text-slate-600">[dev] <a className="underline" href={s.devLink}>{s.devLink}</a></p>}
          <Button disabled={pending} className="w-full">Envoyer le lien</Button>
        </form>
        <Link href="/login" className="block text-center text-sm text-teal-800 underline">Retour</Link>
      </Card>
    </main>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, action, pending] = useActionState(resetAction.bind(null, token), undefined);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-4 text-xl font-semibold text-teal-900">Nouveau mot de passe</h1>
        <form action={action} className="space-y-4">
          <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" required error={s?.fieldErrors?.password} />
          {s?.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}
          <Button disabled={pending} className="w-full">Réinitialiser</Button>
        </form>
      </Card>
    </main>
  );
}
