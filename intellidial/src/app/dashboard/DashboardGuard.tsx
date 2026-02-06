"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { IntelliDialLoader } from "@/app/components/IntelliDialLoader";

/**
 * Protects /dashboard/* — redirects to /login if not signed in.
 * Also checks if user has an organization, redirects to /setup if not.
 */
export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingOrg, setCheckingOrg] = useState(true); // Start as true to prevent flash
  const [orgChecked, setOrgChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    // Check if user has an organization BEFORE rendering dashboard
    // This prevents any flash of dashboard content
    checkOrganization();
  }, [user, loading, router]);

  const checkOrganization = async () => {
    if (!user) return;
    
    setCheckingOrg(true);
    try {
      const res = await fetch("/api/auth/check-org", {
        headers: {
          "x-user-id": user.uid,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (!data.hasOrganization) {
          // User doesn't have organization - redirect to setup to create one
          // This is the standard flow: authenticated user creates org and becomes owner
          router.replace("/setup");
          return;
        }
        // User has organization, allow access
        setOrgChecked(true);
        setCheckingOrg(false);
        return;
      }
      
      // If API call failed, redirect to setup (user can create org)
      router.replace("/setup");
    } catch (err) {
      console.error("Failed to check organization", err);
      // On error, redirect to setup (user can create org)
      router.replace("/setup");
    } finally {
      setCheckingOrg(false);
    }
  };

  // Show loading while checking auth or organization
  // NEVER render dashboard content until org check is complete
  if (loading || checkingOrg || !orgChecked) {
    return <IntelliDialLoader fullScreen={true} />;
  }

  if (!user) {
    return null; // Redirecting to login
  }

  // Only render dashboard if user has organization
  return <>{children}</>;
}
