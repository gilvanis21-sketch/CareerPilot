import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { readResume } from "@/lib/storage";

// Téléchargement d'un CV : réservé à son propriétaire (le stockage est hors /public).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getCurrentUser();
  if (!u) return new NextResponse("Non authentifié", { status: 401 });
  const { id } = await params;
  const r = await db.resume.findFirst({ where: { id, userId: u.id } });
  if (!r) return new NextResponse("Introuvable", { status: 404 });
  let buf: Buffer;
  try { buf = await readResume(r.storagePath); } catch { return new NextResponse("Fichier absent", { status: 404 }); }
  const name = encodeURIComponent(r.fileName);
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": r.mimeType, "Content-Disposition": `attachment; filename*=UTF-8''${name}`, "Cache-Control": "private, no-store" },
  });
}
