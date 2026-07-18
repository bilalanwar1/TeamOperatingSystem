import { Resend } from "resend";

export type SendEmailResult =
  | { ok: true; emailed: boolean }
  | { ok: false; error: string };

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Shared Resend sender. Without RESEND_API_KEY, returns emailed=false.
 */
export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: true, emailed: false };
  }

  const from =
    process.env.EMAIL_FROM?.trim() || "TeamOS <onboarding@resend.dev>";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, emailed: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { ok: false, error: message };
  }
}
