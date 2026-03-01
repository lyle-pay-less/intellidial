import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { Webhook } from "svix";
import { parseEnquiryEmail } from "@/lib/dealer-forwarding/parse-email";
import { runForwardedEnquiryPipeline } from "@/lib/dealer-forwarding/pipeline";
import { listDealers, getFirstOrgIdIfSingle, updateContact } from "@/lib/data/store";

/**
 * POST /api/webhooks/resend/inbound
 *
 * CRITICAL FOR 60s SLA: Return 200 to Resend immediately after validation.
 * The pipeline (fetch + Gemini + VAPI ~10-15s) runs via next/server after()
 * so the runtime keeps CPU allocated while we process in the background.
 * Without this, Resend retries on timeout with backoff up to 2 hours.
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

/**
 * Background pipeline: run after response is sent. Uses after() so the
 * runtime keeps CPU allocated (Cloud Run won't throttle after response).
 */
function schedulePipelineAfterResponse(projectId: string, enquiry: Parameters<typeof runForwardedEnquiryPipeline>[1], emailId: string) {
  after(async () => {
    const start = Date.now();
    try {
      const result = await runForwardedEnquiryPipeline(projectId, enquiry);
      if (!result.ok) {
        console.error("[Resend inbound] Pipeline failed after %dms: %s (emailId=%s)", Date.now() - start, result.error, emailId);
        return;
      }
      await updateContact(result.contactId, { vapiCallId: result.callId, status: "calling" });
      console.log("[Resend inbound] Call placed in %dms: callId=%s contactId=%s emailId=%s", Date.now() - start, result.callId, result.contactId, emailId);
    } catch (e) {
      console.error("[Resend inbound] Background pipeline error after %dms (emailId=%s):", Date.now() - start, emailId, e);
    }
  });
}

export async function POST(req: NextRequest) {
  const webhookReceivedAt = Date.now();
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

    // Fetch full email body — this is fast (Resend API, ~200ms)
    const email = await fetchReceivedEmail(emailId, apiKey);
    const subject = (email?.subject ?? "").trim();
    const text = email?.text ?? "";
    const html = email?.html ?? "";

    const shouldRun = /autotrader/i.test(subject);
    if (!shouldRun) {
      console.log("[Resend inbound] Subject does not contain AutoTrader, skipping:", subject);
      return NextResponse.json({ ok: true, skipped: "subject not AutoTrader" });
    }

    const enquiry = parseEnquiryEmail(text, html);
    if (!enquiry) {
      console.warn("[Resend inbound] Could not parse name/phone/link from body");
      return NextResponse.json({
        ok: false,
        error: "Could not parse enquiry: need name, phone, and vehicle link in email body",
        emailId,
      }, { status: 400 });
    }
    const fromRaw = (email?.from ?? "").trim();
    if (fromRaw) {
      const match = fromRaw.match(/<([^>]+)>/);
      enquiry.email = match ? match[1].trim() : fromRaw;
    }

    // Resolve project by dealer forwarding email
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

    const validationMs = Date.now() - webhookReceivedAt;
    console.log("[Resend inbound] Validated in %dms — launching pipeline in background (emailId=%s, phone=%s)", validationMs, emailId, enquiry.phone);

    // Schedule pipeline to run AFTER response is sent (via next/server after()).
    // This ensures we return 200 to Resend within milliseconds while the
    // runtime keeps CPU allocated for the pipeline (~10-15s for fetch + VAPI call).
    schedulePipelineAfterResponse(projectId, enquiry, emailId);

    return NextResponse.json({
      ok: true,
      emailId,
      subject,
      triggered: true,
      validationMs,
    });
  } catch (e) {
    console.error("[Resend inbound] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook failed" },
      { status: 500 }
    );
  }
}
