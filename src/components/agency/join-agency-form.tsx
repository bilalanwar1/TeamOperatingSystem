"use client";

import { useActionState, useState } from "react";

import {
  joinAgencyAction,
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
import type { InvitePreview } from "@/lib/services/invites";

const initialState: ActionState = {};

type JoinAgencyFormProps = {
  token: string;
  invite: InvitePreview;
  signedInEmail?: string | null;
};

export function JoinAgencyForm({
  token,
  invite,
  signedInEmail,
}: JoinAgencyFormProps) {
  const [state, formAction, pending] = useActionState(
    joinAgencyAction,
    initialState,
  );
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const emailMatches =
    !!signedInEmail &&
    signedInEmail.toLowerCase() === invite.email.toLowerCase();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Join {invite.agencyName}</CardTitle>
        <CardDescription>
          Invited as <strong>{invite.role}</strong> · {invite.email}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={invite.email} />
        <input type="hidden" name="mode" value={mode} />
        <CardContent className="flex flex-col gap-4">
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          {signedInEmail && !emailMatches ? (
            <p className="text-sm text-destructive" role="alert">
              You are signed in as {signedInEmail}. Sign out and use{" "}
              {invite.email} to accept this invite.
            </p>
          ) : null}

          {emailMatches ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Full name (optional)</Label>
              <Input id="fullName" name="fullName" autoComplete="name" />
            </div>
          ) : (
            <>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  className={
                    mode === "signup"
                      ? "font-medium underline underline-offset-4"
                      : "text-muted-foreground"
                  }
                  onClick={() => setMode("signup")}
                >
                  Create password
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  className={
                    mode === "signin"
                      ? "font-medium underline underline-offset-4"
                      : "text-muted-foreground"
                  }
                  onClick={() => setMode("signin")}
                >
                  I already have an account
                </button>
              </div>
              {mode === "signup" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" name="fullName" autoComplete="name" />
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  required
                  minLength={mode === "signup" ? 8 : 1}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={pending || (!!signedInEmail && !emailMatches)}
          >
            {pending ? "Joining…" : "Join agency"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
