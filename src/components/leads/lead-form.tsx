"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createLeadAction,
  updateLeadAction,
  type LeadActionState,
} from "@/app/actions/leads";
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
import type { Database } from "@/types/database";
import {
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
} from "@/types/leads";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const initialState: LeadActionState = {};

type LeadFormProps = {
  agencySlug: string;
  lead?: Lead;
};

export function LeadForm({ agencySlug, lead }: LeadFormProps) {
  const router = useRouter();
  const isEdit = Boolean(lead);
  const action = isEdit ? updateLeadAction : createLeadAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit lead" : "New lead"}</CardTitle>
        <CardDescription>
          Status changes are written to the activity log for reports.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="agencySlug" value={agencySlug} />
        {lead ? <input type="hidden" name="leadId" value={lead.id} /> : null}
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
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={lead?.name ?? ""}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={lead?.phone ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={lead?.email ?? ""}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={lead?.status ?? "new"}
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {LEAD_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="source">Source</Label>
              <select
                id="source"
                name="source"
                defaultValue={lead?.source ?? "other"}
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {LEAD_SOURCE_LABELS[source]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="follow_up_date">Follow-up date</Label>
            <Input
              id="follow_up_date"
              name="follow_up_date"
              type="date"
              defaultValue={lead?.follow_up_date ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={lead?.notes ?? ""}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create lead"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
