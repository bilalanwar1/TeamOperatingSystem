import { z } from "zod";

import {
  buildInviteUrl,
  createInviteToken,
  sendInviteEmail,
} from "@/lib/email/invite";
import { hasRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getMembershipBySlug } from "@/lib/services/membership";
import type { AgencyRole } from "@/types/database";
import type { Database } from "@/types/database";

type AgencyInvite = Database["public"]["Tables"]["agency_invites"]["Row"];
type AgencyMember = Database["public"]["Tables"]["agency_members"]["Row"];

const emailSchema = z.string().email().transform((v) => v.trim().toLowerCase());

export type InvitePreview = {
  agencyId: string;
  agencyName: string;
  agencySlug: string;
  email: string;
  role: AgencyRole;
  expiresAt: string;
  acceptedAt: string | null;
};

export type CreateInviteResult =
  | {
      ok: true;
      invite: AgencyInvite;
      inviteUrl: string;
      emailed: boolean;
    }
  | { ok: false; error: string };

export type AcceptInviteResult =
  | { ok: true; member: AgencyMember; agencySlug: string }
  | { ok: false; error: string };

export async function getInviteByToken(
  token: string,
): Promise<{ ok: true; invite: InvitePreview } | { ok: false; error: string }> {
  if (!token || token.length < 16) {
    return { ok: false, error: "Invalid invite token" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_by_token", {
    p_token: token,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { ok: false, error: "Invite not found" };
  }

  return {
    ok: true,
    invite: {
      agencyId: row.agency_id,
      agencyName: row.agency_name,
      agencySlug: row.agency_slug,
      email: row.email,
      role: row.role,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
    },
  };
}

export async function createAgencyInvite(input: {
  agencySlug: string;
  email: string;
  role?: AgencyRole;
}): Promise<CreateInviteResult> {
  const emailResult = emailSchema.safeParse(input.email);
  if (!emailResult.success) {
    return { ok: false, error: "Enter a valid email" };
  }

  const role: AgencyRole = input.role ?? "agent";
  if (role === "super_admin" || role === "agency_owner") {
    return { ok: false, error: "Cannot invite as owner/super_admin" };
  }

  const membership = await getMembershipBySlug(input.agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }

  if (!hasRole(membership.context.role, "manager")) {
    return { ok: false, error: "Only managers and owners can invite teammates" };
  }

  const token = createInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const supabase = await createClient();
  const { data: invite, error } = await supabase
    .from("agency_invites")
    .insert({
      agency_id: membership.context.agency.id,
      email: emailResult.data,
      role,
      token,
      invited_by: membership.context.member.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "An invite for this email already exists for this agency",
      };
    }
    return { ok: false, error: error.message };
  }

  const inviteUrl = buildInviteUrl(membership.context.agency.slug, token);
  const emailSend = await sendInviteEmail({
    to: emailResult.data,
    agencyName: membership.context.agency.name,
    inviteUrl,
    inviterEmail: membership.context.member.email,
  });

  if (!emailSend.ok) {
    // Invite row exists; surface email failure but still return link for manual share.
    return {
      ok: true,
      invite,
      inviteUrl,
      emailed: false,
    };
  }

  return {
    ok: true,
    invite,
    inviteUrl,
    emailed: emailSend.emailed,
  };
}

export async function listAgencyInvites(agencySlug: string): Promise<AgencyInvite[]> {
  const membership = await getMembershipBySlug(agencySlug);
  if (!membership.ok || !hasRole(membership.context.role, "manager")) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("agency_invites")
    .select("*")
    .eq("agency_id", membership.context.agency.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function acceptAgencyInvite(input: {
  token: string;
  fullName?: string;
}): Promise<AcceptInviteResult> {
  const preview = await getInviteByToken(input.token);
  if (!preview.ok) {
    return { ok: false, error: preview.error };
  }

  if (preview.invite.acceptedAt) {
    return { ok: false, error: "Invite already accepted" };
  }

  if (new Date(preview.invite.expiresAt) < new Date()) {
    return { ok: false, error: "Invite expired" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Not authenticated" };
  }

  if (user.email.toLowerCase() !== preview.invite.email.toLowerCase()) {
    return {
      ok: false,
      error: `Sign in as ${preview.invite.email} to accept this invite`,
    };
  }

  const { data: member, error } = await supabase.rpc("accept_agency_invite", {
    p_token: input.token,
    p_full_name: input.fullName?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!member) {
    return { ok: false, error: "Failed to accept invite" };
  }

  return {
    ok: true,
    member,
    agencySlug: preview.invite.agencySlug,
  };
}
