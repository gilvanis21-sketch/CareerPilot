import "server-only";
import { db } from "@/lib/db";

export const RELEVANT_THRESHOLD = 60;
export const ratio = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export async function getUserStats(userId: string) {
  const [collected, relevant, apps] = await Promise.all([
    db.jobOffer.count(),
    db.jobMatch.count({ where: { userId, score: { gte: RELEVANT_THRESHOLD }, rejected: false } }),
    db.application.findMany({ where: { userId }, select: { status: true, sentAt: true, respondedAt: true } }),
  ]);
  const sent = apps.filter((a) => a.sentAt).length;
  const interviews = apps.filter((a) => a.status === "ENTRETIEN" || a.status === "ACCEPTEE").length;
  const refusals = apps.filter((a) => a.status === "REFUSEE").length;
  const responses = apps.filter((a) => a.respondedAt).length;

  // Série hebdomadaire sur 8 semaines : envois vs réponses
  const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(tomorrow.getTime() - (7 - 1 - i) * 7 * 864e5); // fenêtres glissantes de 7 jours, la dernière finit demain
    const start = new Date(end.getTime() - 7 * 864e5);
    const inW = (d: Date | null) => !!d && d >= start && d < end;
    return {
      semaine: start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      envoyées: apps.filter((a) => inW(a.sentAt)).length,
      réponses: apps.filter((a) => inW(a.respondedAt)).length,
    };
  });
  return { collected, relevant, sent, responses, interviews, refusals, responseRate: ratio(responses, sent), interviewRate: ratio(interviews, sent), weeks };
}
