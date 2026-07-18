import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/** Returns the current session user, or null if signed out. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

/** Fail closed: caller must handle redirect when ok is false. */
export async function requireUser(): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }
  return { ok: true, user };
}
