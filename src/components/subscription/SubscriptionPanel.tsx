"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  CreditCard,
  Check,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ManualUpgradeDialog } from "./ManualUpgradeDialog";

type Access = {
  clinicId: string;
  planName: string;
  planFeatures: Record<string, unknown>;
  maxDoctors: number;
  maxPatients: number;
  onTrial: boolean;
  trialEndsAt: string | null;
  subscriptionStatus: string | null;
};

type Plan = {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number | null;
  oneTimePrice: number | null;
  maxDoctors: number;
  maxPatients: number;
  features: Record<string, unknown>;
};

function daysLeft(iso: string | null) {
  if (!iso) return 0;
  return Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
}

export function SubscriptionPanel({
  access,
  plans,
  usage,
  flash,
}: {
  access: Access;
  plans: Plan[];
  usage: { doctorCount: number; patientsThisMonth: number };
  flash: { success: boolean; cancelled: boolean };
}) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState(false);
  const [manualUpgrade, setManualUpgrade] = useState<
    | {
        planName: "BASIC" | "STANDARD" | "PRO";
        cycle: "monthly" | "yearly" | "oneTime";
      }
    | null
  >(null);

  const stripeEnabled = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    if (flash.success) toast.success("Subscription updated — thanks!");
    if (flash.cancelled) toast.info("Checkout cancelled.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subscribe(planName: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName, cycle }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Checkout failed");
        return;
      }
      if (body.data?.url) window.location.href = body.data.url;
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not open portal");
        return;
      }
      if (body.data?.url) window.location.href = body.data.url;
    } finally {
      setBusy(false);
    }
  }

  const trialDays = daysLeft(access.trialEndsAt);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Current plan</span>
              <Badge variant="secondary">{access.planName}</Badge>
              {access.onTrial && (
                <Badge
                  variant="secondary"
                  className="bg-amber-500/10 text-amber-700 border-amber-500/25 border"
                >
                  Trial · {trialDays} days left
                </Badge>
              )}
              {access.subscriptionStatus && (
                <Badge variant="secondary">{access.subscriptionStatus}</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Up to{" "}
              <span className="font-medium text-foreground">
                {access.maxDoctors === -1 ? "unlimited" : access.maxDoctors}
              </span>{" "}
              doctors and{" "}
              <span className="font-medium text-foreground">
                {access.maxPatients === -1
                  ? "unlimited"
                  : access.maxPatients.toLocaleString()}
              </span>{" "}
              patients.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={openPortal}
            disabled={busy || !access.subscriptionStatus}
          >
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Manage billing
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Active doctors
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {usage.doctorCount}
              {access.maxDoctors !== -1 && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / {access.maxDoctors}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              New patients this month
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {usage.patientsThisMonth.toLocaleString()}
              {access.maxPatients !== -1 && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / {access.maxPatients.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Available plans</h2>
          <div className="inline-flex items-center gap-1 rounded-full border bg-muted/30 p-1 text-xs">
            {(
              [
                { v: "monthly", label: "Monthly" },
                { v: "yearly", label: "Yearly" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                onClick={() => setCycle(o.v)}
                className={cn(
                  "rounded-full px-3 py-1 font-medium",
                  cycle === o.v
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => {
            const price =
              cycle === "yearly" ? (p.yearlyPrice ?? p.monthlyPrice * 10) : p.monthlyPrice;
            const isCurrent = p.name === access.planName && !access.onTrial;
            return (
              <div
                key={p.id}
                className={cn(
                  "relative rounded-2xl border bg-card p-6",
                  isCurrent && "border-primary/40 ring-2 ring-primary/20",
                )}
              >
                {p.name === "STANDARD" && (
                  <div className="absolute -top-0 right-5 inline-flex items-center gap-1 rounded-b-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                    <Sparkles className="h-3 w-3" />
                    Most popular
                  </div>
                )}
                <h3 className="text-base font-semibold">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">
                    ₨ {Math.round(price).toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{cycle === "yearly" ? "yr" : "mo"}
                  </span>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {Object.entries(p.features).map(([k, v]) => {
                    if (typeof v === "boolean") {
                      return (
                        <li key={k} className="flex items-start gap-2">
                          <Check
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              v ? "text-primary" : "text-muted-foreground/40",
                            )}
                          />
                          <span
                            className={cn(
                              !v && "text-muted-foreground line-through",
                            )}
                          >
                            {k}
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={k} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>
                          {k}: {String(v)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {isCurrent ? (
                  <Button disabled className="mt-5 w-full" variant="outline">
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                    Current plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (stripeEnabled) {
                        subscribe(p.name);
                      } else {
                        setManualUpgrade({
                          planName: p.name as "BASIC" | "STANDARD" | "PRO",
                          cycle,
                        });
                      }
                    }}
                    disabled={busy}
                    className="mt-5 w-full"
                    variant={p.name === "STANDARD" ? "default" : "outline"}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Opening...
                      </>
                    ) : !stripeEnabled ? (
                      <>
                        <Banknote className="mr-1.5 h-3.5 w-3.5" />
                        Pay &amp; upgrade
                      </>
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {!stripeEnabled && (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Banknote className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-semibold text-foreground">
                  Online card payments coming soon
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  For now, pick a plan and pay via{" "}
                  <span className="font-medium text-foreground">
                    bank transfer, JazzCash, Easypaisa, or cash
                  </span>
                  . Submit your transaction reference and we&rsquo;ll verify
                  + activate within 24 hours.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {manualUpgrade && (
        <ManualUpgradeDialog
          open={!!manualUpgrade}
          onOpenChange={(v) => !v && setManualUpgrade(null)}
          planName={manualUpgrade.planName}
          cycle={manualUpgrade.cycle}
        />
      )}
    </div>
  );
}
