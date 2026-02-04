"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  CreditCard,
  Calendar,
  Download,
  Mail,
  Zap,
  ChevronRight,
  ExternalLink,
  FileText,
  Check,
} from "lucide-react";
import Link from "next/link";

type Plan = "starter" | "growth" | "business";

type Subscription = {
  plan: Plan;
  planLabel: string;
  callsIncluded: number;
  nextBillingDate: string;
  amount: string;
  interval: string;
};

type PaymentMethod = {
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
};

type Invoice = {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "pending";
  pdfUrl?: string;
};

const PLAN_CONFIG: Record<
  Plan,
  { label: string; calls: number; price: string; description: string }
> = {
  starter: {
    label: "Starter",
    calls: 1000,
    price: "R499",
    description: "Up to 1,000 calls/month",
  },
  growth: {
    label: "Growth",
    calls: 5000,
    price: "R1,499",
    description: "Up to 5,000 calls/month",
  },
  business: {
    label: "Business",
    calls: 20000,
    price: "R4,499",
    description: "Up to 20,000 calls/month",
  },
};

export default function SettingsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription ?? null);
        setPaymentMethod(data.paymentMethod ?? null);
        setInvoices(data.invoices ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    setDownloadMessage(null);
    try {
      const res = await fetch(`/api/settings/invoices/${invoiceId}/download`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDownloadMessage("Invoice download will be available when billing is connected.");
        window.setTimeout(() => setDownloadMessage(null), 4000);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-8 flex items-center gap-2">
          <Settings className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Settings</h1>
        </div>
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const nextBilling = subscription?.nextBillingDate ?? "—";
  const planConfig = subscription ? PLAN_CONFIG[subscription.plan] : null;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center gap-2">
        <Settings className="h-6 w-6 text-teal-600" />
        <h1 className="font-display text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      {/* Subscription */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-teal-600" />
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Subscription
            </h2>
          </div>
          <Link
            href="/dashboard/settings?tab=plan"
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50"
          >
            Change plan
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="mb-1 text-xs font-medium text-slate-500">Current plan</p>
            <p className="font-display text-lg font-semibold text-slate-900">
              {planConfig?.label ?? subscription?.planLabel ?? "—"}
            </p>
            <p className="text-sm text-slate-600">{planConfig?.description ?? ""}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="mb-1 text-xs font-medium text-slate-500">Next billing date</p>
            <p className="font-display text-lg font-semibold text-slate-900">
              {nextBilling}
            </p>
            <p className="text-sm text-slate-600">
              {subscription?.amount ?? "—"} per {subscription?.interval ?? "month"}
            </p>
          </div>
        </div>
      </section>

      {/* Payment method */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-600" />
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Payment method
            </h2>
          </div>
          <Link
            href="/dashboard/settings?tab=payment"
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50"
          >
            Update card
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {paymentMethod ? (
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200">
              <CreditCard className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900 capitalize">
                {paymentMethod.brand} •••• {paymentMethod.last4}
              </p>
              <p className="text-sm text-slate-500">
                Expires {String(paymentMethod.expiryMonth).padStart(2, "0")}/
                {paymentMethod.expiryYear}
              </p>
            </div>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Check className="h-3 w-3" />
              Active
            </span>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 px-4 py-6 text-center text-sm text-slate-500">
            No payment method on file. Add a card to continue your subscription.
          </p>
        )}
      </section>

      {/* Invoices */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-teal-600" />
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Invoices
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Download past invoices for your records.
        </p>
        {downloadMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
            <Check className="h-4 w-4" />
            {downloadMessage}
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                    No invoices yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-50 hover:bg-slate-50/30"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900">{inv.date}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {inv.amount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.status === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {inv.status === "paid" && <Check className="h-3 w-3" />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(inv.id)}
                        disabled={downloadingId === inv.id}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-50"
                      >
                        {downloadingId === inv.id ? (
                          "Preparing..."
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Download
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Contact Intellidial */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-teal-600" />
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Contact Intellidial
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Billing questions, technical support, or partnership inquiries.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="mailto:support@intellidial.com"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300"
          >
            <Mail className="h-4 w-4 text-teal-600" />
            support@intellidial.com
          </a>
          <a
            href="mailto:billing@intellidial.com"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300"
          >
            <CreditCard className="h-4 w-4 text-teal-600" />
            billing@intellidial.com
          </a>
          <Link
            href="/#contact"
            className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-100"
          >
            <ExternalLink className="h-4 w-4" />
            Contact form
          </Link>
        </div>
      </section>
    </div>
  );
}
