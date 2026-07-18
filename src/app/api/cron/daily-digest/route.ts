import { NextResponse } from "next/server";

import { requireCronAuth } from "@/lib/cron/auth";
import { sendDailyManagerDigests } from "@/lib/services/digest";

export const runtime = "nodejs";

/**
 * Vercel Cron / manual trigger.
 * Protect with Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  try {
    const result = await sendDailyManagerDigests();
    return NextResponse.json({
      ok: true,
      dayLabel: result.dayLabel,
      agencies: result.results.length,
      emailed: result.results.filter((r) => r.emailed).length,
      results: result.results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Digest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
