"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  PlayCircle,
  Sparkles,
  Stethoscope,
  Pill,
  Receipt,
  Activity,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stackContainer, stackItem, orbFloat } from "@/lib/motion";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24">
      {/* decorative orbs */}
      <motion.div
        aria-hidden
        variants={orbFloat(0)}
        animate="animate"
        className="pointer-events-none absolute -top-20 -left-32 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
      />
      <motion.div
        aria-hidden
        variants={orbFloat(4)}
        animate="animate"
        className="pointer-events-none absolute -top-10 right-0 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:32px_32px]"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 lg:grid-cols-[1fr_1fr]">
        <motion.div variants={stackContainer} initial="initial" animate="animate">
          <motion.div variants={stackItem}>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              10-day free trial · no credit card
            </span>
          </motion.div>
          <motion.h1
            variants={stackItem}
            className="mt-5 text-balance text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Run your clinic like a pro — from reception to{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-br from-primary to-emerald-500 bg-clip-text text-transparent">
                pharmacy
              </span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-emerald-300/30 blur-sm"
              />
            </span>
            .
          </motion.h1>
          <motion.p
            variants={stackItem}
            className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            One workspace for tokens, consultations, prescriptions, inventory,
            IPD, lab, and billing. Built for busy clinics who can&rsquo;t afford
            paperwork or guesswork.
          </motion.p>
          <motion.div variants={stackItem} className="mt-7 flex flex-wrap gap-3">
            {/* Breathing glow behind the primary CTA — draws the eye on
                first paint without being loud. Sits behind the button
                and is aria-hidden; pointer-events none so it never
                intercepts clicks. The group-hover scale gives a tiny
                magnetic "lean in" when the cursor is near. */}
            <div className="relative group">
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/40 via-emerald-400/40 to-primary/40 blur-lg opacity-60"
                animate={{
                  opacity: [0.45, 0.75, 0.45],
                  scale: [0.98, 1.02, 0.98],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "relative text-base transition-transform group-hover:scale-[1.02]",
                )}
              >
                Start 10-day free trial
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <a
              href="#features"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "text-base",
              )}
            >
              <PlayCircle className="mr-1.5 h-4 w-4" />
              See how it works
            </a>
          </motion.div>
          <motion.div
            variants={stackItem}
            className="mt-6 flex items-center gap-3 text-xs text-muted-foreground"
          >
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-full border-2 border-background bg-gradient-to-br from-primary/40 to-sky-400/30"
                />
              ))}
            </div>
            <span>
              Trusted by clinics running thousands of visits every week
            </span>
          </motion.div>

          <motion.div
            variants={stackItem}
            className="mt-10 grid grid-cols-3 gap-6 border-t pt-6"
          >
            {[
              { label: "Visits tracked", value: "48k+" },
              { label: "Tokens issued", value: "120k+" },
              { label: "Active clinics", value: "200+" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-2xl font-bold tracking-tight">
                  {s.value}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Floating meta labels */}
          <motion.div
            initial={{ opacity: 0, x: -20, y: -8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="absolute -left-3 top-4 z-10 hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-500/20 sm:inline-flex"
          >
            <Activity className="h-3 w-3" />
            Live
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20, y: -8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            className="absolute -right-3 top-16 z-10 hidden items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary ring-1 ring-primary/20 sm:inline-flex"
          >
            <Pill className="h-3 w-3" />
            Prescription sent
          </motion.div>

          <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl auth-card-shadow">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
              <span className="ml-2 text-[10px] text-muted-foreground">
                dashboard.clinicos.app
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Your clinic today
                  </div>
                  <div className="mt-0.5 text-sm font-semibold">
                    Live overview
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  live
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Patients today",
                    value: "48",
                    icon: Stethoscope,
                    color: "text-primary",
                    bg: "bg-primary/8",
                  },
                  {
                    label: "Revenue",
                    value: "₨ 78k",
                    icon: Receipt,
                    color: "text-emerald-600",
                    bg: "bg-emerald-500/8",
                  },
                  {
                    label: "Waiting",
                    value: "6",
                    icon: Activity,
                    color: "text-amber-600",
                    bg: "bg-amber-500/8",
                  },
                ].map((k, i) => {
                  const Icon = k.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="rounded-lg border p-3"
                    >
                      <div
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-md",
                          k.bg,
                          k.color,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-1.5 text-xl font-bold tabular-nums">
                        {k.value}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {k.label}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  {
                    t: "T-012",
                    p: "Muhammad Ali",
                    s: "CALLED",
                    c: "border-sky-500/30 bg-sky-500/5",
                  },
                  {
                    t: "T-013",
                    p: "Fatima Sheikh",
                    s: "WAITING",
                    c: "border-amber-500/30 bg-amber-500/5",
                  },
                  {
                    t: "T-014",
                    p: "Bilal Khan",
                    s: "IN PROGRESS",
                    c: "border-emerald-500/30 bg-emerald-500/5",
                  },
                ].map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-2.5 py-2 text-xs",
                      t.c,
                    )}
                  >
                    <span className="font-mono font-bold text-primary">
                      {t.t}
                    </span>
                    <span className="flex-1 font-medium">{t.p}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {t.s}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
