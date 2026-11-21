"use client";
import { useActionState } from "react";
import { Button } from "./ui";
import { uploadCvAction } from "@/app/(app)/cv/actions";

export function CvUpload() {
  const [s, action, pending] = useActionState(uploadCvAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="file" name="cv" accept=".pdf,.docx" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-800 file:px-4 file:py-2 file:text-white" />
      <p className="text-xs text-slate-600">PDF ou DOCX, 5 Mo max. Analyse locale, sans envoi à un service IA externe. Utilisez un CV fictif pendant la phase de test.</p>
      {s?.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}
      {s?.ok && <p className="text-sm text-teal-800">{s.ok}</p>}
      <Button disabled={pending}>{pending ? "Analyse…" : "Importer et analyser"}</Button>
    </form>
  );
}
