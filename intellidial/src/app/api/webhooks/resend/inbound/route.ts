import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { parseEnquiryEmail } from "@/lib/dealer-forwarding/parse-email";
import { runForwardedEnquiryPipeline } from "@/lib/dealer-forwarding/pipeline";
import { listDealers, getFirstOrgIdIfSingle, updateContact } from "@/lib/data/store";

/**
 * POST /api/webhooks/resend/inbound
 *
 * Resend sends this when an email is received at an inbound address (e.g. leads@ulkieyen.resend.app).
 * Event type: email.received
 * Payload does NOT include body — we must call Resend API to get full email (subject, html, text).
 *
 * If RESEND_WEBHOOK_SECRET is set, the request is verified using the Resend webhook signing secret (Svix).
 * Use the raw request body for verification; do not parse as JSON before verifying.
 *
 * Task 1–2: Receive, fetch body, run only when subject contains "AutoTrader".
 * Task 3–7: Parse name/phone/link, create contact, fetch vehicle context, update project, place call.
 */

type ResendInboundEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
  };
};

/** Fetch full received email from Resend API (SDK may not expose receiving). */
async function fetchReceivedEmail(emailId: string, apiKey: string) {
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API ${res.status}: ${err}`);
  }
  return res.json() as Promise<{
    id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    html?: string | null;
    text?: string | null;
    headers?: Record<string, string>;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();

    let body: ResendInboundEvent;
    if (webhookSecret) {
      const id = req.headers.get("svix-id");
      const timestamp = req.headers.get("svix-timestamp");
      const signature = req.headers.get("svix-signature");
      if (!id || !timestamp || !signature) {
        return NextResponse.json(
          { error: "Missing Svix webhook headers" },
          { status: 400 }
        );
      }
      try {
        const wh = new Webhook(webhookSecret);
        body = wh.verify(rawBody, {
          "svix-id": id,
          "svix-timestamp": timestamp,
          "svix-signature": signature,
        }) as ResendInboundEvent;
      } catch (e) {
        console.warn("[Resend inbound] Webhook signature verification failed:", e);
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    } else {
      body = JSON.parse(rawBody) as ResendInboundEvent;
    }

    if (body?.type !== "email.received") {
      return NextResponse.json({ ok: true, ignored: "not email.received" });
    }

    const emailId = body.data?.email_id;
    if (!emailId || typeof emailId !== "string") {
      return NextResponse.json(
        { error: "Missing email_id in webhook data" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      console.error("[Resend inbound] RESEND_API_KEY not set");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 503 }
      );
    }

    // Fetch full email body (subject, html, text) — webhook only gives metadata
    const email = await fetchReceivedEmail(emailId, apiKey);
    const subject = (email?.subject ?? "").trim();
    const text = email?.text ?? "";
    const html = email?.html ?? "";

    // Task 2: Only run automation when subject contains "AutoTrader"
    const shouldRun = /autotrader/i.test(subject);
    if (!shouldRun) {
      console.log("[Resend inbound] Subject does not contain AutoTrader, skipping:", subject);
      return NextResponse.json({ ok: true, skipped: "subject not AutoTrader" });
    }

    // Task 3: Parse body for name, contact number, vehicle link
    const enquiry = parseEnquiryEmail(text, html);
    if (!enquiry) {
      console.warn("[Resend inbound] Could not parse name/phone/link from body");
      return NextResponse.json({
        ok: false,
        error: "Could not parse enquiry: need name, phone, and vehicle link in email body",
        emailId,
      }, { status: 400 });
    }
    // Add sender email (from metadata)
    const fromRaw = (email?.from ?? "").trim();
    if (fromRaw) {
      const match = fromRaw.match(/<([^>]+)>/);
      enquiry.email = match ? match[1].trim() : fromRaw;
    }

    // One org owns all dealers (single-tenant). Resolve project by dealer Forwarding email.
    const rawTo = body.data?.to ?? email?.to ?? [];
    const toAddresses = (Array.isArray(rawTo) ? rawTo : [rawTo])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const orgId = process.env.DEALER_FORWARDING_ORG_ID?.trim() ?? (await getFirstOrgIdIfSingle()) ?? null;
    let projectId = process.env.DEALER_FORWARDING_PROJECT_ID?.trim() ?? null;

    if (orgId) {
      const dealersList = await listDealers(orgId);
      const dealer = toAddresses.length > 0
        ? dealersList.find(
            (d) => d.forwardingEmail && toAddresses.includes(d.forwardingEmail.trim().toLowerCase())
          )
        : dealersList.find((d) => d.forwardingEmail?.trim().toLowerCase() === "leads@ulkieyen.resend.app");
      if (dealer?.projectId) projectId = dealer.projectId;
      if (!projectId && (toAddresses.length > 0 || dealersList.length > 0)) {
        console.log("[Resend inbound] Dealer lookup:", { orgId, toAddresses, dealerCount: dealersList.length, forwardingEmails: dealersList.map((d) => d.forwardingEmail) });
      }
    }

    if (!projectId) {
      console.error(
        "[Resend inbound] No project: orgId=%s toAddresses=%s — add a dealer with Forwarding email set to this inbox (and a linked project), or set DEALER_FORWARDING_ORG_ID if multiple orgs.",
        orgId ?? "null",
        JSON.stringify(toAddresses)
      );
      return NextResponse.json({
        ok: false,
        error:
          "No dealer matched this inbox: set a dealer's Forwarding email to this address and link a project. (Multi-org: set DEALER_FORWARDING_ORG_ID.)",
        emailId,
      }, { status: 503 });
    }

    // Tasks 4–7: Create contact, fetch vehicle context, update project, place call (result stored by call-ended webhook)
    const result = await runForwardedEnquiryPipeline(projectId, enquiry);
    if (!result.ok) {
      console.error("[Resend inbound] Pipeline failed:", result.error);
      return NextResponse.json({
        ok: false,
        error: result.error,
        emailId,
      }, { status: 502 });
    }

    // Persist VAPI call ID and status so Sync call status can update the contact if webhook is missed
    await updateContact(result.contactId, { vapiCallId: result.callId, status: "calling" });

    console.log("[Resend inbound] Call placed:", { callId: result.callId, contactId: result.contactId, emailId });
    return NextResponse.json({
      ok: true,
      emailId,
      subject,
      triggered: true,
      callId: result.callId,
      contactId: result.contactId,
    });
  } catch (e) {
    console.error("[Resend inbound] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook failed" },
      { status: 500 }
    );
  }
}
