import type { Database } from "@/types/database";

export type FollowupLead = Database["public"]["Tables"]["leads"]["Row"];

export type FollowupItem = {
  lead: FollowupLead;
  status: "due_today" | "overdue";
};
