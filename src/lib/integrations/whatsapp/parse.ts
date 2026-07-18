import { OUTREACH_CHANNELS, type OutreachChannel } from "@/types/activity";

export type ParsedOutreachCommand = {
  channel: OutreachChannel;
  count: number;
  raw: string;
};

/**
 * Parse agent WhatsApp messages into outreach logs.
 * Examples: "5 whatsapp", "log 3 calls", "LOG 10 facebook"
 */
export function parseOutreachMessage(body: string): ParsedOutreachCommand | null {
  const text = body.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return null;

  const match = text.match(
    /^(?:log\s+)?(\d+)\s+(facebook|instagram|linkedin|whatsapp|email|calls)\b/,
  );
  if (!match) return null;

  const count = Number(match[1]);
  const channel = match[2] as OutreachChannel;
  if (!Number.isFinite(count) || count < 1 || count > 10_000) return null;
  if (!(OUTREACH_CHANNELS as readonly string[]).includes(channel)) return null;

  return { channel, count, raw: body.trim() };
}

/** Normalize Twilio/Meta phone values to E.164 (+digits). */
export function normalizeWhatsappPhone(input: string): string | null {
  let value = input.trim();
  if (value.toLowerCase().startsWith("whatsapp:")) {
    value = value.slice("whatsapp:".length);
  }
  value = value.replace(/[^\d+]/g, "");
  if (value.startsWith("00")) {
    value = `+${value.slice(2)}`;
  }
  if (!value.startsWith("+") && /^\d{8,15}$/.test(value)) {
    value = `+${value}`;
  }
  if (!/^\+\d{8,15}$/.test(value)) {
    return null;
  }
  return value;
}
