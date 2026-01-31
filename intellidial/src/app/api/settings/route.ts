import { NextResponse } from "next/server";

export async function GET() {
  // Mock data — replace with Stripe/Firestore when wired
  const subscription = {
    plan: "starter" as const,
    planLabel: "Starter",
    callsIncluded: 1000,
    nextBillingDate: "28 Feb 2026",
    amount: "R499",
    interval: "month",
  };

  const paymentMethod = {
    brand: "visa",
    last4: "4242",
    expiryMonth: 12,
    expiryYear: 2027,
  };

  const invoices = [
    { id: "inv-1", date: "28 Jan 2026", amount: "R499", status: "paid" as const },
    { id: "inv-2", date: "28 Dec 2025", amount: "R499", status: "paid" as const },
    { id: "inv-3", date: "28 Nov 2025", amount: "R499", status: "paid" as const },
  ];

  return NextResponse.json({
    subscription,
    paymentMethod,
    invoices,
  });
}
