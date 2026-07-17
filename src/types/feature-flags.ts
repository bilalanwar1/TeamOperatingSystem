/**
 * Feature flag keys for per-agency rollout.
 * Check in the service layer before enabling gated modules.
 */
export const FEATURE_FLAGS = [
  "whatsapp_module",
  "ai_insights",
  "portal_sync",
  "landlord_tenant",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[number];
