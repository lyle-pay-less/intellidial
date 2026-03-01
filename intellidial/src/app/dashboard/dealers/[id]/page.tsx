"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import Link from "next/link";
import { ProjectDetailContent } from "@/app/dashboard/projects/[id]/ProjectDetailContent";
import { IntelliDialLoader } from "@/app/components/IntelliDialLoader";

type Dealer = {
  id: string;
  name: string;
  address?: string | null;
  phoneNumber?: string | null;
  operationHours?: string | null;
  email?: string | null;
  contextLinks?: Array<{ url: string; label?: string | null }> | null;
  projectId?: string | null;
  forwardingEmail?: string | null;
  callUpdatesEmail?: string | null;
};

export default function DealerConfigPage() {
  const params = useParams();
  const { user } = useAuth();
  const dealerId = params?.id as string | undefined;
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealerId || !user?.uid) {
      setLoading(false);
      return;
    }
    fetch(`/api/dealers/${dealerId}`, { headers: { "x-user-id": user.uid } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDealer)
      .finally(() => setLoading(false));
  }, [dealerId, user?.uid]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-8">
        <IntelliDialLoader />
      </div>
    );
  }

  if (!dealer?.projectId) {
    return (
      <div className="p-6 md:p-8">
        <Link
          href="/dashboard/dealers"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-600 mb-4"
        >
          Back to Dealers
        </Link>
        <p className="text-slate-500">No project linked to this dealer.</p>
      </div>
    );
  }

  return <ProjectDetailContent projectId={dealer.projectId} embedded dealer={dealer} />;
}
