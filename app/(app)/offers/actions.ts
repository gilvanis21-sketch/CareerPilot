"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { syncOffersForUser, computeMatches } from "@/services/offer-sync";

export async function syncAction() {
  const u = await requireUser();
  if (!rateLimit(`sync:${u.id}`, 3, 10 * 60_000)) return;
  await syncOffersForUser(u.id);
  revalidatePath("/offers");
}
export async function recomputeAction() {
  const u = await requireUser();
  if (!rateLimit(`recompute:${u.id}`, 10, 60_000)) return;
  await computeMatches(u.id);
  revalidatePath("/offers");
}
export async function toggleFavoriteAction(fd: FormData) {
  const u = await requireUser();
  const offerId = String(fd.get("offerId"));
  const key = { userId_offerId: { userId: u.id, offerId } };
  if (await db.favorite.findUnique({ where: key })) await db.favorite.delete({ where: key });
  else await db.favorite.create({ data: { userId: u.id, offerId } });
  revalidatePath("/offers");
}
export async function rejectAction(fd: FormData) {
  const u = await requireUser();
  await db.jobMatch.updateMany({ where: { userId: u.id, offerId: String(fd.get("offerId")) }, data: { rejected: true } });
  revalidatePath("/offers");
}
/** Crée un BROUILLON. Aucun envoi : la génération et la validation viennent au Sprint 3. */
export async function prepareApplicationAction(fd: FormData) {
  const u = await requireUser();
  const offerId = String(fd.get("offerId"));
  const offer = await db.jobOffer.findUnique({ where: { id: offerId } });
  if (!offer) return;
  const exists = await db.application.findFirst({ where: { userId: u.id, offerId } });
  if (!exists) await db.application.create({ data: { userId: u.id, offerId, companyName: offer.company ?? "Entreprise", companySector: offer.sector, status: "BROUILLON" } });
  redirect("/applications");
}
