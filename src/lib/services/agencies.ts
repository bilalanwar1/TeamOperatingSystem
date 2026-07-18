import { z } from "zod";

import { normalizeSlug } from "@/lib/agencies/slug";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export { normalizeSlug };

type Agency = Database["public"]["Tables"]["agencies"]["Row"];

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, hyphens")
  .min(2)
  .max(48);

const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(80);

export type CreateAgencyInput = {
  name: string;
  slug: string;
};

export type CreateAgencyResult =
  | { ok: true; agency: Agency }
  | { ok: false; error: string };

export async function createAgency(
  input: CreateAgencyInput,
): Promise<CreateAgencyResult> {
  const nameResult = nameSchema.safeParse(input.name);
  const slugResult = slugSchema.safeParse(input.slug);

  if (!nameResult.success) {
    return { ok: false, error: nameResult.error.issues[0]?.message ?? "Invalid name" };
  }
  if (!slugResult.success) {
    return { ok: false, error: slugResult.error.issues[0]?.message ?? "Invalid slug" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase.rpc("create_agency", {
    p_name: nameResult.data,
    p_slug: slugResult.data,
  });

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { ok: false, error: "That agency URL slug is already taken" };
    }
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Failed to create agency" };
  }

  return { ok: true, agency: data };
}
