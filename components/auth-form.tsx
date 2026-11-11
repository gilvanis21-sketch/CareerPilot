"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, Field } from "./ui";
import type { FormState } from "@/app/(auth)/actions";

export function AuthForm({ mode, action }: { mode: "login" | "register"; action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const reg = mode === "register";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-teal-900">CareerPilot</h1>
        <p className="mb-6 text-sm text-slate-500">{reg ? "Créez votre espace étudiant" : "Connectez-vous à votre espace"}</p>
        <form action={formAction} className="space-y-4">
          <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} />
          <Field label="Mot de passe" name="password" type="password" autoComplete={reg ? "new-password" : "current-password"} required error={state?.fieldErrors?.password} />
          {reg && (
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input type="checkbox" name="consent" className="mt-0.5" required />
              J’accepte que mes données (profil, CV) soient traitées pour la recherche de stage/alternance, conformément à la politique RGPD. Je peux supprimer mon compte à tout moment.
            </label>
          )}
          {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">{pending ? "…" : reg ? "Créer mon compte" : "Se connecter"}</Button>
        </form>
        {!reg && <p className="mt-3 text-center text-sm"><Link className="text-teal-800 underline" href="/forgot">Mot de passe oublié ?</Link></p>}
        <p className="mt-4 text-center text-sm text-slate-500">
          {reg ? <>Déjà inscrit ? <Link className="text-teal-800 underline" href="/login">Connexion</Link></> : <>Pas de compte ? <Link className="text-teal-800 underline" href="/register">Inscription</Link></>}
        </p>
      </Card>
    </main>
  );
}
