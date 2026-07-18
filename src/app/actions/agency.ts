"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { normalizeSlug } from "@/lib/agencies/slug";
import { createAgency } from "@/lib/services/agencies";
import {
  acceptAgencyInvite,
  createAgencyInvite,
} from "@/lib/services/invites";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  success?: string;
  inviteUrl?: string;
};

export async function createAgencyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "");
  const slugRaw = String(formData.get("slug") ?? "");
  const slug = normalizeSlug(slugRaw || name);

  const result = await createAgency({ name, slug });
  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/a/${result.agency.slug}`);
}

export async function inviteTeammateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const agencySlug = String(formData.get("agencySlug") ?? "");
  const email = String(formData.get("email") ?? "");
  const roleRaw = String(formData.get("role") ?? "agent");
  const role = roleRaw === "manager" ? "manager" : "agent";

  const result = await createAgencyInvite({
    agencySlug,
    email,
    role,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  if (result.emailed) {
    return {
      success: `Invite emailed to ${email}.`,
      inviteUrl: result.inviteUrl,
    };
  }

  return {
    success:
      "Invite created. Email is not configured (RESEND_API_KEY), so share this link manually:",
    inviteUrl: result.inviteUrl,
  };
}

export async function joinAgencyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const mode = String(formData.get("mode") ?? "signup");

  const previewEmail = String(formData.get("email") ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (mode === "signin") {
      const passwordResult = z.string().min(1).safeParse(password);
      if (!passwordResult.success) {
        return { error: "Password is required" };
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: previewEmail,
        password: passwordResult.data,
      });
      if (error) {
        return { error: error.message };
      }
    } else {
      const passwordResult = z
        .string()
        .min(8, "Password must be at least 8 characters")
        .safeParse(password);
      if (!passwordResult.success) {
        return {
          error: passwordResult.error.issues[0]?.message ?? "Invalid password",
        };
      }
      const { error } = await supabase.auth.signUp({
        email: previewEmail,
        password: passwordResult.data,
        options: {
          data: { full_name: fullName || undefined },
        },
      });
      if (error) {
        return { error: error.message };
      }
    }
  }

  const accepted = await acceptAgencyInvite({ token, fullName });
  if (!accepted.ok) {
    return { error: accepted.error };
  }

  redirect(`/a/${accepted.agencySlug}`);
}
