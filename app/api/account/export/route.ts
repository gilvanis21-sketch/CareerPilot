import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/log";

// Droit à la portabilité (RGPD art. 20) : export JSON de toutes les données de l'utilisateur connecté.
export async function GET() {
  const u = await getCurrentUser();
  if (!u) return new NextResponse("Non authentifié", { status: 401 });
  const data = await db.user.findUniqueOrThrow({
    where: { id: u.id },
    select: {
      email: true, createdAt: true, consentAt: true, aiConsentAt: true,
      profile: { include: { skills: true, experiences: true } },
      resumes: { select: { fileName: true, createdAt: true, parsedJson: true } },
      favorites: true, matches: true, applications: { include: { messages: true, followUps: true } },
      emailAccounts: { select: { provider: true, address: true } }, // jamais les tokens
    },
  });
  await logActivity("account.exported", { userId: u.id });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="careerpilot-export.json"' },
  });
}
