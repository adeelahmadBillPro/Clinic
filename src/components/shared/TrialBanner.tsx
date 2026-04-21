"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  trialEndsAt: Date | string | null;
  status?: string;
};

export function TrialBanner({ trialEndsAt, status }: Props) {
  if (!trialEndsAt) return null;
  if (status && status !== "trialing") return null;

  const end = new Date(trialEndsAt);
  const msLeft = end.getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

  if (daysLeft <= 0) {
    return (
      <div className="bg-destructive text-destructive-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Your trial has ended. Upgrade to keep using ClinicOS.</span>
          </div>
          <Link
            href="/subscription"
            className="rounded-md bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25 transition"
          >
            Upgrade now
          </Link>
        </div>
      </div>
    );
  }

  let tone: "info" | "warning" | "urgent";
  if (daysLeft >= 4) tone = "info";
  else if (daysLeft >= 2) tone = "warning";
  else tone = "urgent";

  const toneStyles = {
    info: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    urgent: "bg-destructive/10 text-destructive border-destructive/30",
  }[tone];

  const Icon = tone === "info" ? Sparkles : tone === "warning" ? Clock : AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={
        tone === "urgent"
          ? {
              opacity: 1,
              y: 0,
              x: [0, -3, 3, -2, 2, 0],
              transition: {
                x: { duration: 0.5, repeat: Infinity, repeatDelay: 5 },
              },
            }
          : { opacity: 1, y: 0 }
      }
      className={cn("border-b", toneStyles)}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span>
            {tone === "info" && (
              <>
                Trial active — <strong>{daysLeft} days</strong> left on all Pro
                features.
              </>
            )}
            {tone === "warning" && (
              <>
                Only <strong>{daysLeft} days</strong> left on your trial. Upgrade
                to keep access.
              </>
            )}
            {tone === "urgent" && (
              <>
                Trial ends in <strong>{daysLeft} day{daysLeft === 1 ? "" : "s"}</strong>.
                Upgrade now to avoid losing access.
              </>
            )}
          </span>
        </div>
        <Link
          href="/subscription"
          className="rounded-md bg-background/60 px-3 py-1 text-xs font-medium hover:bg-background transition"
        >
          {tone === "urgent" ? "Upgrade now" : "View plans"}
        </Link>
      </div>
    </motion.div>
  );
}
