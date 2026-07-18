import type { LeadSource, LeadStatus } from "@/types/database";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "negotiating",
  "closed_won",
  "closed_lost",
] as const satisfies readonly LeadStatus[];

export const LEAD_SOURCES = [
  "facebook",
  "instagram",
  "linkedin",
  "whatsapp",
  "email",
  "calls",
  "referral",
  "portal",
  "other",
] as const satisfies readonly LeadSource[];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  negotiating: "Negotiating",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  email: "Email",
  calls: "Calls",
  referral: "Referral",
  portal: "Portal",
  other: "Other",
};
