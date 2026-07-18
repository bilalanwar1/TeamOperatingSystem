import { NextResponse } from "next/server";

import { requireCronAuth } from "@/lib/cron/auth";
import { runLeadScoringForEnabledAgencies } from "@/lib/services/ai-scoring";

export const runtime = "nodejs";

/**
 * Nightly lead scoring for agencies with ai_insights enabled.
 * Protect with Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  try {
    const { results } = await runLeadScoringForEnabledAgencies();
    return NextResponse.json({
      ok: true,
      agencies: results.length,
      scored: results.reduce((sum, r) => sum + r.scored, 0),
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lead scoring failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
