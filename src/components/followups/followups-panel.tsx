"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  completeFollowupAction,
  type FollowupActionState,
} from "@/app/actions/followups";
import { Button } from "@/components/ui/button";
import type { FollowupItem } from "@/lib/followups/types";
import { LEAD_STATUS_LABELS } from "@/types/leads";

const initialState: FollowupActionState = {};

function CompleteFollowupButton({
  agencySlug,
  leadId,
}: {
  agencySlug: string;
  leadId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    completeFollowupAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="agencySlug" value={agencySlug} />
      <input type="hidden" name="leadId" value={leadId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "Complete"}
      </Button>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

type FollowupsPanelProps = {
  agencySlug: string;
  dayLabel: string;
  dueToday: FollowupItem[];
  overdue: FollowupItem[];
};

export function FollowupsPanel({
  agencySlug,
  dayLabel,
  dueToday,
  overdue,
}: FollowupsPanelProps) {
  const empty = dueToday.length === 0 && overdue.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Based on lead follow-up dates · Dubai {dayLabel}. Set dates on a lead to
        track tasks here.
      </p>

      {empty ? (
        <p className="text-sm text-muted-foreground">
          Nothing due today or overdue.{" "}
          <Link
            href={`/a/${agencySlug}/leads`}
            className="underline underline-offset-4"
          >
            Open leads
          </Link>
        </p>
      ) : null}

      {overdue.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-destructive">
            Overdue ({overdue.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {overdue.map(({ lead }) => (
              <FollowupRow
                key={lead.id}
                agencySlug={agencySlug}
                lead={lead}
                badge="Overdue"
              />
            ))}
          </ul>
        </section>
      ) : null}

      {dueToday.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Due today ({dueToday.length})</h3>
          <ul className="flex flex-col gap-2">
            {dueToday.map(({ lead }) => (
              <FollowupRow
                key={lead.id}
                agencySlug={agencySlug}
                lead={lead}
                badge="Due today"
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FollowupRow({
  agencySlug,
  lead,
  badge,
}: {
  agencySlug: string;
  lead: FollowupItem["lead"];
  badge: string;
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
      <div>
        <p className="font-medium">
          <Link
            href={`/a/${agencySlug}/leads/${lead.id}`}
            className="underline-offset-4 hover:underline"
          >
            {lead.name}
          </Link>
        </p>
        <p className="text-muted-foreground">
          {badge} · {lead.follow_up_date} · {LEAD_STATUS_LABELS[lead.status]}
          {lead.phone ? ` · ${lead.phone}` : ""}
        </p>
      </div>
      <CompleteFollowupButton agencySlug={agencySlug} leadId={lead.id} />
    </li>
  );
}
