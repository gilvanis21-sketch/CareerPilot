import "server-only";
import { db } from "@/lib/db";

/** Passe en « relance nécessaire » les candidatures dont une relance planifiée est échue. Appelé à l'affichage et par le cron. */
export async function refreshFollowUps(userId?: string) {
  const due = await db.followUp.findMany({
    where: { status: "PLANIFIEE", dueAt: { lte: new Date() }, ...(userId ? { userId } : {}), application: { status: { in: ["ENVOYEE", "EN_ATTENTE"] } } },
    select: { applicationId: true },
  });
  const ids = [...new Set(due.map((d) => d.applicationId))];
  if (ids.length) await db.application.updateMany({ where: { id: { in: ids } }, data: { status: "RELANCE_NECESSAIRE" } });
  return ids.length;
}
