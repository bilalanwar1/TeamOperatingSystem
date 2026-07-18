"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  toggleAiInsightsAction,
  type TeamActionState,
} from "@/app/actions/team";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: TeamActionState = {};

export function AiInsightsToggle({
  agencySlug,
  enabled,
}: {
  agencySlug: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    toggleAiInsightsAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI insights</CardTitle>
        <CardDescription>
          Lead scoring and weekly &quot;agents slipping&quot; alerts. Pilot
          flag — enable for one agency first.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-muted-foreground" role="status">
            {state.success}
          </p>
        ) : null}
        <p className="text-sm">
          Status: <strong>{enabled ? "Enabled" : "Disabled"}</strong>
        </p>
        <form action={formAction}>
          <input type="hidden" name="agencySlug" value={agencySlug} />
          <input
            type="hidden"
            name="enabled"
            value={enabled ? "false" : "true"}
          />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending
              ? "Saving…"
              : enabled
                ? "Disable AI insights"
                : "Enable AI insights"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
