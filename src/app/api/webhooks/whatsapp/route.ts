import { NextResponse } from "next/server";

import { handleWhatsappInbound } from "@/lib/integrations/whatsapp/handler";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return false;

  const header = request.headers.get("x-teamos-webhook-secret");
  if (header && header === secret) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}

/**
 * Meta Cloud API webhook verification (GET).
 * Set WHATSAPP_VERIFY_TOKEN in env to match Meta's verify token.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * Inbound WhatsApp webhook.
 * Supports:
 * - Twilio form posts (From, Body)
 * - Meta Cloud API JSON (entry[].changes[].value.messages[])
 *
 * Auth: X-TeamOS-Webhook-Secret or ?secret= matching WHATSAPP_WEBHOOK_SECRET
 * (Meta GET verify uses WHATSAPP_VERIFY_TOKEN separately.)
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  // Meta may send without our secret on some setups; still require secret for writes.
  if (!verifyWebhookSecret(request)) {
    // Allow Meta verify-style only on GET; POST always needs secret for pilot safety.
    return unauthorized();
  }

  try {
    if (contentType.includes("application/json")) {
      const json = (await request.json()) as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: Array<{
                from?: string;
                id?: string;
                text?: { body?: string };
              }>;
            };
          }>;
        }>;
        from?: string;
        body?: string;
      };

      // Simple JSON shape for tests: { from, body }
      if (json.from && json.body) {
        const result = await handleWhatsappInbound({
          from: json.from,
          body: json.body,
        });
        return NextResponse.json(result);
      }

      const results = [];
      for (const entry of json.entry ?? []) {
        for (const change of entry.changes ?? []) {
          for (const msg of change.value?.messages ?? []) {
            if (!msg.from || !msg.text?.body) continue;
            results.push(
              await handleWhatsappInbound({
                from: msg.from,
                body: msg.text.body,
                providerMessageId: msg.id,
              }),
            );
          }
        }
      }

      return NextResponse.json({ ok: true, results });
    }

    // Twilio (and many providers): application/x-www-form-urlencoded
    const form = await request.formData();
    const from = String(form.get("From") ?? form.get("from") ?? "");
    const body = String(form.get("Body") ?? form.get("body") ?? "");

    if (!from || !body) {
      return NextResponse.json(
        { ok: false, error: "Missing From/Body" },
        { status: 400 },
      );
    }

    const result = await handleWhatsappInbound({ from, body });

    // Twilio expects 200; TwiML optional — return JSON for simplicity.
    if (result.ok && result.handled) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Logged ${result.count} ${result.channel}</Message></Response>`;
      return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (result.ok && !result.handled) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(result.reason)}</Message></Response>`;
      return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    return NextResponse.json(result, { status: 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
