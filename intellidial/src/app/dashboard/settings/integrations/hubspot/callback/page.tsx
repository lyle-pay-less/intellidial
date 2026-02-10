"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Page that handles HubSpot OAuth callback.
 * HubSpot redirects here with code and state.
 * We redirect to the API route which processes the callback and redirects to settings.
 */
export default function HubSpotCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to API route which will process the callback and redirect to settings
    const callbackUrl = `/api/integrations/hubspot/callback?${searchParams.toString()}`;
    window.location.href = callbackUrl;
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
        <p className="mt-4 text-lg font-medium text-slate-900">Processing connection...</p>
      </div>
    </div>
  );
}
