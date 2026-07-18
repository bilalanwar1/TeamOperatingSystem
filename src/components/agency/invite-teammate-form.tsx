"use client";

import { useActionState } from "react";

import {
  inviteTeammateAction,
  type ActionState,
} from "@/app/actions/agency";
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

const initialState: ActionState = {};

export function InviteTeammateForm({ agencySlug }: { agencySlug: string }) {
  const [state, formAction, pending] = useActionState(
    inviteTeammateAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite teammate</CardTitle>
        <CardDescription>
          Sends an email when Resend is configured. Otherwise you get a shareable
          link.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="agencySlug" value={agencySlug} />
        <CardContent className="flex flex-col gap-4">
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <div className="space-y-2 text-sm text-muted-foreground" role="status">
              <p>{state.success}</p>
              {state.inviteUrl ? (
                <p className="break-all rounded-md border bg-muted/40 p-2 font-mono text-xs text-foreground">
                  {state.inviteUrl}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue="agent"
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="agent">Agent</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Inviting…" : "Send invite"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
