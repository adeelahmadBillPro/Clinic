"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { v: "AVAILABLE", label: "Available", color: "bg-emerald-500" },
  { v: "BUSY", label: "Busy", color: "bg-amber-500" },
  { v: "ON_BREAK", label: "On break", color: "bg-slate-400" },
  { v: "OFF_DUTY", label: "Off duty", color: "bg-slate-300" },
] as const;

export function DoctorStatusSwitcher({
  doctorId,
  status,
  isAvailable,
  onChanged,
}: {
  doctorId: string;
  status: string;
  isAvailable: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function set(next: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/doctor-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          status: next,
          isAvailable: next === "AVAILABLE",
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Update failed");
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        My status
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
        {OPTIONS.map((o) => {
          const active = o.v === status || (o.v === "AVAILABLE" && isAvailable && status === "AVAILABLE");
          return (
            <button
              key={o.v}
              disabled={busy}
              onClick={() => set(o.v)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", o.color)} />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
