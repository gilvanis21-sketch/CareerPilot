import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, Button } from "@/components/ui";
import { CvUpload } from "@/components/cv-upload";
import { deleteCvAction } from "./actions";

export default async function CvPage() {
  const user = await requireUser();
  const resumes = await db.resume.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-teal-950">Mon CV</h1>
      <Card><CvUpload /></Card>
      {resumes.map((r) => (
        <Card key={r.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium">{r.fileName} {r.isActive && <span className="ml-2 rounded bg-teal-100 px-2 py-0.5 text-xs text-teal-900">actif</span>}</p>
            <p className="text-xs text-slate-500">{r.createdAt.toLocaleDateString("fr-FR")} · {(r.sizeBytes / 1024).toFixed(0)} Ko</p>
          </div>
          <div className="flex items-center gap-2"><a href={`/api/cv/${r.id}`} className="text-sm text-teal-800 underline">Télécharger</a><form action={deleteCvAction}><input type="hidden" name="id" value={r.id} /><Button variant="danger">Supprimer</Button></form></div>
        </Card>
      ))}
    </div>
  );
}
