/**
 * Canonical activity event types.
 * Dashboards / leaderboards / reports query activity_events by these strings.
 * Add new types here when modules land — do not create per-feature activity tables.
 */
export const ACTIVITY_EVENT_TYPES = [
  "outreach_logged",
  "lead_created",
  "lead_status_changed",
  "followup_completed",
  // Future modules (Phase 3+):
  // "listing_synced",
  // "tenancy_created",
  // "ai_score_updated",
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export type OutreachChannel =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "whatsapp"
  | "email"
  | "calls";

export type OutreachLoggedPayload = {
  channel: OutreachChannel;
  count: number;
  notes?: string;
  /** Set by WhatsApp webhook adapter later — dashboard form uses "web". */
  source?: "web" | "whatsapp";
};
