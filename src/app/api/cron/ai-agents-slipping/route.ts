import { NextResponse } from "next/server";

import { requireCronAuth } from "@/lib/cron/auth";
import { runAgentsSlippingAlerts } from "@/lib/services/ai-slipping";

export const runtime = "nodejs";

/**
 * Weekly "agents slipping" alerts for agencies with ai_insights enabled.
 * Protect with Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  try {
    const { results } = await runAgentsSlippingAlerts();
    return NextResponse.json({
      ok: true,
      agencies: results.length,
      alerted: results.filter((r) => r.slipping.length > 0).length,
      emailed: results.filter((r) => r.emailed).length,
      results,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Agents slipping job failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
