"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  toggleWhatsappModuleAction,
  updateWhatsappPhoneAction,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/types/database";

type AgencyMember = Database["public"]["Tables"]["agency_members"]["Row"];

const initialState: TeamActionState = {};

export function WhatsappModuleToggle({
  agencySlug,
  enabled,
}: {
  agencySlug: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    toggleWhatsappModuleAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp logging</CardTitle>
        <CardDescription>
          Pilot feature flag. When enabled, linked agents can text{" "}
          <code className="text-xs">5 whatsapp</code> to log outreach.
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
          Status:{" "}
          <strong>{enabled ? "Enabled" : "Disabled"}</strong>
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
                ? "Disable WhatsApp module"
                : "Enable WhatsApp module"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PhoneRow({
  agencySlug,
  member,
}: {
  agencySlug: string;
  member: AgencyMember;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateWhatsappPhoneAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <li className="rounded-lg border px-3 py-3 text-sm">
      <div className="mb-2">
        <p className="font-medium">
          {member.full_name?.trim() || member.email}
        </p>
        <p className="text-muted-foreground">
          {member.role} · {member.email}
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input type="hidden" name="agencySlug" value={agencySlug} />
        <input type="hidden" name="memberId" value={member.id} />
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor={`phone-${member.id}`}>WhatsApp (E.164)</Label>
          <Input
            id={`phone-${member.id}`}
            name="phone"
            placeholder="+971501234567"
            defaultValue={member.whatsapp_phone ?? ""}
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "…" : "Save"}
        </Button>
      </form>
      {state.error ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {state.success}
        </p>
      ) : null}
    </li>
  );
}

export function WhatsappPhoneRoster({
  agencySlug,
  members,
}: {
  agencySlug: string;
  members: AgencyMember[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent WhatsApp numbers</CardTitle>
        <CardDescription>
          Link each agent&apos;s phone so inbound webhook messages map to their
          activity log.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No joined members yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {members.map((member) => (
              <PhoneRow
                key={member.id}
                agencySlug={agencySlug}
                member={member}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
