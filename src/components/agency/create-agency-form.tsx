"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createAgencyAction,
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
import { normalizeSlug } from "@/lib/agencies/slug";

const initialState: ActionState = {};

export function CreateAgencyForm() {
  const [state, formAction, pending] = useActionState(
    createAgencyAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const previewSlug = useMemo(() => {
    if (slugTouched) return slug;
    return normalizeSlug(name);
  }, [name, slug, slugTouched]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your agency</CardTitle>
        <CardDescription>
          You become the agency owner. Invite teammates after setup.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Agency name</Label>
            <Input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Desert Homes Realty"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              value={slugTouched ? slug : previewSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(normalizeSlug(e.target.value));
              }}
              placeholder="desert-homes"
            />
            <p className="text-xs text-muted-foreground">
              Workspace URL: /a/{previewSlug || "…"}
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create agency"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
