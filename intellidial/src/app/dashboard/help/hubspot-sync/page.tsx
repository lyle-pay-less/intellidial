"use client";

import Link from "next/link";
import { ArrowLeft, FileText, MapPin, AlertCircle, BarChart3, RefreshCw } from "lucide-react";

export default function HubSpotSyncHelpPage() {
  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <Link
        href="/dashboard/integrations"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Integrations
      </Link>

      <h1 className="font-display text-2xl font-bold text-slate-900">
        How Intellidial syncs to HubSpot
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        One place for what gets updated, where to see it, and what to do if something fails.
      </p>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FileText className="h-5 w-5 text-teal-600" />
          What gets updated
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          When a call completes, we update the contact in HubSpot with:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>
            <strong>Lead Status</strong> — set by outcome (e.g. CONNECTED, ATTEMPTED_TO_CONTACT,
            MEETING_SCHEDULED). You choose the exact values in{" "}
            <Link href="/dashboard/integrations" className="text-teal-600 hover:underline">
              HubSpot Sync Settings
            </Link>
            .
          </li>
          <li>
            <strong>Note</strong> — a note on the contact timeline titled &quot;Intellidial Call –
            Success&quot; or &quot;Intellidial Call – Failed&quot; with the transcript, duration, and
            (if enabled) recording link.
          </li>
          <li>
            <strong>Recording URL</strong> — a property linking to the call recording (if enabled in
            settings).
          </li>
          <li>
            <strong>Call activity</strong> — last call date, last call duration, and call count on
            the contact.
          </li>
          <li>
            <strong>Custom properties</strong> — any field mapping you set (e.g. captured answers
            → HubSpot properties) in Sync Settings.
          </li>
          <li>
            <strong>Intellidial sync status</strong> — &quot;success&quot; or &quot;failed&quot; so
            you can see sync health on the contact record or build HubSpot reports (e.g. filter
            contacts where sync failed).
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <MapPin className="h-5 w-5 text-teal-600" />
          Where do I see it in HubSpot?
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>
            <strong>Contact record</strong> — Open the contact in HubSpot. The updated Lead Status
            and properties appear in the left-hand properties panel.
          </li>
          <li>
            <strong>Timeline</strong> — The note shows on the contact&apos;s activity timeline as
            &quot;Intellidial Call – Success&quot; or &quot;Intellidial Call – Failed&quot; so you
            can see at a glance that it was an Intellidial call.
          </li>
          <li>
            <strong>Recording</strong> — The recording URL is stored in a contact property (and
            included in the note). You can add it to your contact record layout or use it in
            reports.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <RefreshCw className="h-5 w-5 text-teal-600" />
          Two-way sync: HubSpot → Intellidial
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          When you update a contact in HubSpot (e.g. set Lead Status to &quot;Do not call&quot; or
          &quot;Not contacted&quot;), Intellidial respects it. We check HubSpot before placing a
          call: if the contact&apos;s current Lead Status is in your &quot;Do not call&quot; list
          (in HubSpot Sync Settings), we skip that contact and do not call them.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Configure which Lead Statuses mean &quot;do not call&quot; in{" "}
          <Link href="/dashboard/integrations" className="text-teal-600 hover:underline">
            Integrations → HubSpot → HubSpot Sync Settings
          </Link>
          — &quot;Lead Statuses to skip when calling&quot;. That way you manage who to call in
          HubSpot and Intellidial follows it.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          What do I do if sync failed?
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>
            <strong>Retry failed syncs</strong> — On any project that uses HubSpot, open the
            Contacts tab and find the &quot;HubSpot Sync Activity&quot; section. If there are
            failed syncs, use &quot;Retry failed syncs&quot; to try again.
          </li>
          <li>
            <strong>Check your connection</strong> — If HubSpot shows as expired or disconnected in{" "}
            <Link href="/dashboard/integrations" className="text-teal-600 hover:underline">
              Integrations
            </Link>
            , reconnect HubSpot. Syncing is paused until the connection is valid.
          </li>
          <li>
            <strong>See what went wrong</strong> — In HubSpot Sync Activity, failed syncs show an
            error message. Common causes: invalid or expired token (reconnect HubSpot), contact
            removed in HubSpot, or a temporary HubSpot API issue (retry later).
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <BarChart3 className="h-5 w-5 text-teal-600" />
          Reporting in HubSpot
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          You can build HubSpot reports and lists using the properties we update. In HubSpot, go to
          Reports or use contact list filters with these properties:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>
            <strong>Lead Status</strong> — see outcomes (e.g. CONNECTED, MEETING_SCHEDULED)
          </li>
          <li>
            <strong>Intellidial sync status</strong> — success or failed (filter contacts that
            failed to sync)
          </li>
          <li>
            <strong>Intellidial last call date</strong> — when we last called
          </li>
          <li>
            <strong>Intellidial last call duration</strong> — call length in seconds
          </li>
          <li>
            <strong>Intellidial call count</strong> — number of calls
          </li>
          <li>
            <strong>Intellidial recording URL</strong> — link to the recording (if enabled)
          </li>
          <li>Any custom properties you map in Sync Settings</li>
        </ul>
        <p className="mt-2 text-sm text-slate-600">
          Use these in contact lists and reports to show call volume, last contact date, and
          outcomes in the same place you already report.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <RefreshCw className="h-5 w-5 text-teal-600" />
          Trigger from HubSpot (add to queue automatically)
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          You can add contacts to an Intellidial call queue automatically when something happens in
          HubSpot (e.g. contact is added to a list, or Lead Status changes). Use a HubSpot workflow
          with a &quot;Send webhook&quot; action that calls our webhook URL.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>
            In your project, open the &quot;Import from HubSpot&quot; section and expand &quot;Trigger
            from HubSpot (workflow → add to queue)&quot; to see the webhook URL and the JSON body to
            send.
          </li>
          <li>
            In HubSpot: Workflows → Create workflow → Choose trigger (e.g. &quot;Contact added to
            list&quot; or &quot;Contact property value changed&quot;) → Add action &quot;Send
            webhook&quot; → POST to the URL, with body containing <code>projectId</code> and{" "}
            <code>hubspotContactId</code> (use <code>{"{{ contact.id }}"}</code> in HubSpot).
          </li>
          <li>
            Optional: set <code>HUBSPOT_WEBHOOK_SECRET</code> in your environment and include it in
            the request so only your workflow can call the webhook.
          </li>
        </ul>
      </section>

      <div className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          To change what gets synced (Lead Status values, transcript, recording, field mapping),
          go to{" "}
          <Link href="/dashboard/integrations" className="font-medium text-teal-600 hover:underline">
            Integrations → HubSpot → HubSpot Sync Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
