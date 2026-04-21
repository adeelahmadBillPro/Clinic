"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Clinic Owner",
  ADMIN: "Admin",
  DOCTOR: "Doctor",
  RECEPTIONIST: "Receptionist",
  NURSE: "Nurse",
  PHARMACIST: "Pharmacist",
  LAB_TECH: "Lab Technician",
};

export function AccessDeniedToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const denied = params.get("denied");
    const role = params.get("role");
    if (!denied) return;

    const label = role ? ROLE_LABEL[role] ?? role : "your role";
    toast.error(`This area isn't available for ${label}`, {
      description: `You were redirected because "${denied}" is outside your permissions.`,
      duration: 5000,
    });

    // Clean the URL so the toast doesn't re-fire on refresh
    const cleanParams = new URLSearchParams(params.toString());
    cleanParams.delete("denied");
    cleanParams.delete("role");
    const q = cleanParams.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [params, router, pathname]);

  return null;
}
