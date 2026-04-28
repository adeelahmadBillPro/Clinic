"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  Stethoscope,
  Settings as SettingsIcon,
  Users,
  Ticket,
  Sparkles,
  X,
} from "lucide-react";

/**
 * First-time owner / admin walkthrough on the dashboard.
 *
 * Each step is computed from real data via `/api/setup/checklist` so it
 * auto-completes the moment the user does the action — no manual ticks,
 * no localStorage tracking. Once all 4 steps are done the panel
 * disappears entirely (it lingers as a one-off "Setup complete!"
 * celebration on the visit where the last step flipped, then dismisses
 * itself).
 *
 * Dismissible mid-setup too: if the admin wants the dashboard space
 * back, the X collapses to a small reopen pill stored in localStorage.
 */

type StepId = "doctor" | "settings" | "patient" | "token";

type ApiStep = {
  id: StepId;
  done: boolean;
  count?: number;
};

type ApiResponse = {
  success: true;
  data: {
    steps: ApiStep[];
    completedCount: number;
    totalCount: number;
    allDone: boolean;
  };
};

const STEP_META: Record<
  StepId,
  {
    title: string;
    description: string;
    href: string;
    icon: typeof Stethoscope;
  }
> = {
  doctor: {
    title: "Add your first doctor",
    description:
      "Without a doctor, reception can't issue tokens. Set their fee, room, and revenue share when adding.",
    href: "/staff?add=1",
    icon: Stethoscope,
  },
  settings: {
    title: "Customize your clinic",
    description:
      "Add your logo, phone, address, set the timezone, and pick when token numbers reset each day.",
    href: "/settings",
    icon: SettingsIcon,
  },
  patient: {
    title: "Register your first patient",
    description:
      "Patient details auto-fill gender from the name and offer Mr/Mrs detection. Try it.",
    href: "/patients",
    icon: Users,
  },
  token: {
    title: "Issue your first token",
    description:
      "Pick a patient and a doctor at reception. The bill auto-generates with the consultation fee.",
    href: "/reception",
    icon: Ticket,
  },
};

const DISMISS_KEY = "clinicos:onboarding-dismissed";

export function OnboardingChecklist() {
  const [data, setData] = useState<ApiResponse["data"] | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    setDismissed(
      typeof window !== "undefined" &&
        window.localStorage.getItem(DISMISS_KEY) === "1",
    );
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/setup/checklist", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as ApiResponse;
        if (aborted) return;
        if (body?.success) setData(body.data);
      } catch {
        // Silent — checklist is non-critical, dashboard renders fine without it.
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (!data) return null;
  // Once everything is done AND the user has dismissed it, never show again.
  if (data.allDone && dismissed) return null;
  // Don't show pre-setup if the user already dismissed it — they can
  // click the small reopen pill to bring it back.
  if (!data.allDone && dismissed) {
    return (
      <button
        type="button"
        onClick={() => {
          window.localStorage.removeItem(DISMISS_KEY);
          setDismissed(false);
        }}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
      >
        <Sparkles className="h-3 w-3" />
        Show setup checklist ({data.completedCount}/{data.totalCount})
      </button>
    );
  }

  const pct = Math.round((data.completedCount / data.totalCount) * 100);

  return (
    <AnimatePresence>
      <motion.section
        key="onboarding"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-emerald-50/40 p-5 shadow-sm dark:to-emerald-950/20"
      >
        {/* Decorative orb */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold tracking-tight">
                {data.allDone
                  ? "Setup complete — your clinic is ready 🎉"
                  : "Get your clinic running"}
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.allDone
                ? "All initial steps done. You can dismiss this card."
                : `${data.completedCount} of ${data.totalCount} done · pick the next step`}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss setup checklist"
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
          />
        </div>

        {/* Steps */}
        <ol className="relative mt-4 grid gap-2 sm:grid-cols-2">
          {data.steps.map((step) => {
            const meta = STEP_META[step.id];
            const Icon = meta.icon;
            return (
              <motion.li
                key={step.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link
                  href={step.done ? "#" : meta.href}
                  className={`group flex items-start gap-3 rounded-xl border p-3 transition ${
                    step.done
                      ? "border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30"
                      : "border-border bg-card hover:-translate-y-[1px] hover:border-primary/40 hover:shadow-sm"
                  }`}
                  onClick={(e) => {
                    if (step.done) e.preventDefault();
                  }}
                >
                  {/* Icon — checkmark spring-pops in when done */}
                  <div className="relative mt-0.5">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                        step.done
                          ? "bg-emerald-500 text-white"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {step.done ? (
                          <motion.span
                            key="check"
                            initial={{ scale: 0.4, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 18,
                            }}
                          >
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="icon"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`flex items-center justify-between gap-2 text-sm font-medium ${
                        step.done
                          ? "text-emerald-900 line-through decoration-emerald-700/40 dark:text-emerald-200"
                          : ""
                      }`}
                    >
                      <span>{meta.title}</span>
                      {!step.done && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                      )}
                    </div>
                    <p
                      className={`mt-0.5 text-xs leading-relaxed ${
                        step.done
                          ? "text-emerald-700/70 dark:text-emerald-300/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {meta.description}
                    </p>
                    {step.done && typeof step.count === "number" && step.count > 0 && (
                      <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
                        {step.count} {step.count === 1 ? "added" : "added"} ✓
                      </span>
                    )}
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ol>
      </motion.section>
    </AnimatePresence>
  );
}
