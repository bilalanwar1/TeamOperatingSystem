"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  refreshLeadScoresAction,
  type AiActionState,
} from "@/app/actions/ai";
import { Button } from "@/components/ui/button";

const initialState: AiActionState = {};

export function RefreshLeadScoresButton({
  agencySlug,
}: {
  agencySlug: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    refreshLeadScoresAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <div className="flex flex-col gap-2">
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
      <form action={formAction}>
        <input type="hidden" name="agencySlug" value={agencySlug} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Scoring…" : "Refresh lead scores"}
        </Button>
      </form>
    </div>
  );
}
