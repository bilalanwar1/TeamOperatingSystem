"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().email("Enter a valid email");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export type AuthActionState = {
  error?: string;
  success?: string;
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const emailResult = emailSchema.safeParse(formData.get("email"));
  const passwordResult = passwordSchema.safeParse(formData.get("password"));
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message ?? "Invalid email" };
  }
  if (!passwordResult.success) {
    return {
      error: passwordResult.error.issues[0]?.message ?? "Invalid password",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: emailResult.data,
    password: passwordResult.data,
    options: {
      data: { full_name: fullName || undefined },
      emailRedirectTo: `${appUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      "Check your email to confirm your account, then sign in. (If confirmations are disabled in Supabase, you can sign in now.)",
  };
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const emailResult = emailSchema.safeParse(formData.get("email"));
  const passwordResult = z.string().min(1, "Password is required").safeParse(
    formData.get("password"),
  );

  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message ?? "Invalid email" };
  }
  if (!passwordResult.success) {
    return {
      error: passwordResult.error.issues[0]?.message ?? "Password required",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailResult.data,
    password: passwordResult.data,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/account");
}

export async function magicLinkAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const emailResult = emailSchema.safeParse(formData.get("email"));

  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message ?? "Invalid email" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: emailResult.data,
    options: {
      emailRedirectTo: `${appUrl()}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Check your email for the magic link to sign in.",
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
