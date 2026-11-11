import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { refreshFollowUps } from "@/services/followups";

// Tâche planifiée (cron système / Vercel Cron) : GET avec l'en-tête Authorization: Bearer $CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return new NextResponse("Interdit", { status: 403 });
  return NextResponse.json({ updated: await refreshFollowUps() });
}
