import "server-only";
import { db } from "./db";

/** Journalisation des actions sensibles (RGPD / traçabilité). Ne jamais y mettre de données personnelles en clair. */
export async function logActivity(
  action: string,
  opts: { userId?: string | null; entity?: string; entityId?: string; meta?: object } = {},
) {
  try {
    await db.activityLog.create({
      data: { action, userId: opts.userId ?? null, entity: opts.entity, entityId: opts.entityId, meta: opts.meta },
    });
  } catch (e) {
    console.error("[log] échec journalisation", action, e);
  }
}
