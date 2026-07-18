"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  logOutreachAction,
  type OutreachActionState,
} from "@/app/actions/outreach";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OUTREACH_CHANNELS } from "@/types/activity";

const initialState: OutreachActionState = {};

const CHANNEL_LABELS: Record<(typeof OUTREACH_CHANNELS)[number], string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  email: "Email",
  calls: "Calls",
};

export function OutreachLoggerForm({ agencySlug }: { agencySlug: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    logOutreachAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log outreach</CardTitle>
        <CardDescription>
          Record messages and calls for today. Managers see these on the team
          dashboard later.
        </CardDescription>
      </CardHeader>
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="agencySlug" value={agencySlug} />
        <CardContent className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="channel">Channel</Label>
            <select
              id="channel"
              name="channel"
              required
              defaultValue="whatsapp"
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            >
              {OUTREACH_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="count">Count</Label>
            <Input
              id="count"
              name="count"
              type="number"
              min={1}
              max={10000}
              defaultValue={1}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" name="notes" maxLength={2000} />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Log outreach"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
