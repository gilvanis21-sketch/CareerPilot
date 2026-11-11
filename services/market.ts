import "server-only";
import { db } from "@/lib/db";
import { aggregateBySector, popularKeywords, topCounts } from "./market-aggregate";

export async function getMarketStats() {
  const [offers, apps, profiles] = await Promise.all([
    db.jobOffer.findMany({ select: { sector: true, skills: true, contractType: true, collectedAt: true, isDemo: true } }),
    db.application.findMany({ select: { userId: true, companySector: true, sentAt: true, respondedAt: true } }),
    db.studentProfile.findMany({ select: { keywords: true } }),
  ]);
  const bySector = topCounts(offers.map((o) => o.sector ?? ""), 8);
  const skills = topCounts(offers.flatMap((o) => o.skills), 10);
  const contracts = topCounts(offers.map((o) => o.contractType), 8);

  const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
  const evolution = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(tomorrow.getTime() - (7 - 1 - i) * 7 * 864e5);
    const start = new Date(end.getTime() - 7 * 864e5);
    return { semaine: start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), offres: offers.filter((o) => o.collectedAt >= start && o.collectedAt < end).length };
  });

  const { published, hiddenGroups } = aggregateBySector(apps.map((a) => ({ userId: a.userId, sector: a.companySector, sentAt: a.sentAt, respondedAt: a.respondedAt })));
  return {
    totalOffers: offers.length, demoShare: offers.length ? Math.round((offers.filter((o) => o.isDemo).length / offers.length) * 100) : 0,
    bySector, skills, contracts, evolution,
    sectorResponses: published, hiddenGroups,
    roles: popularKeywords(profiles.map((p) => p.keywords)),
  };
}
