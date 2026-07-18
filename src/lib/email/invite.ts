import { randomBytes } from "crypto";

import { escapeHtml, sendEmail } from "@/lib/email/resend";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function createInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function buildInviteUrl(agencySlug: string, token: string): string {
  return `${appUrl()}/a/${agencySlug}/join?token=${encodeURIComponent(token)}`;
}

export type SendInviteEmailInput = {
  to: string;
  agencyName: string;
  inviteUrl: string;
  inviterEmail?: string;
};

export type SendInviteEmailResult =
  | { ok: true; emailed: boolean }
  | { ok: false; error: string };

/**
 * Sends invite via Resend when RESEND_API_KEY is set.
 * Without a key, returns ok with emailed=false so the UI can show the link
 * for local/dev copy-paste.
 */
export async function sendInviteEmail(
  input: SendInviteEmailInput,
): Promise<SendInviteEmailResult> {
  return sendEmail({
    to: input.to,
    subject: `You're invited to ${input.agencyName} on TeamOS`,
    html: `
      <p>You've been invited to join <strong>${escapeHtml(input.agencyName)}</strong> on TeamOS.</p>
      ${input.inviterEmail ? `<p>Invited by ${escapeHtml(input.inviterEmail)}</p>` : ""}
      <p><a href="${escapeHtml(input.inviteUrl)}">Accept invite</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });
}
