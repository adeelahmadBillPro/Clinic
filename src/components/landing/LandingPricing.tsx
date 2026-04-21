"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Cycle = "monthly" | "yearly" | "oneTime";

const PLANS = {
  monthly: [
    { name: "Basic", price: 3000, suffix: "/mo" },
    { name: "Standard", price: 7500, suffix: "/mo", popular: true },
    { name: "Pro", price: 15000, suffix: "/mo" },
  ],
  yearly: [
    { name: "Basic", price: 30000, suffix: "/yr", save: "Save ₨ 6,000" },
    {
      name: "Standard",
      price: 75000,
      suffix: "/yr",
      popular: true,
      save: "Save ₨ 15,000",
    },
    { name: "Pro", price: 150000, suffix: "/yr", save: "Save ₨ 30,000" },
  ],
  oneTime: [
    { name: "Basic", price: 9000, suffix: "once" },
    { name: "Standard", price: 22500, suffix: "once", popular: true },
    { name: "Pro", price: 45000, suffix: "once" },
  ],
} as Record<
  Cycle,
  Array<{
    name: string;
    price: number;
    suffix: string;
    popular?: boolean;
    save?: string;
  }>
>;

const FEATURES: Record<string, string[]> = {
  Basic: [
    "1 doctor",
    "Up to 2,000 patients",
    "Reception + tokens",
    "OPD billing & receipts",
    "Basic analytics",
  ],
  Standard: [
    "Up to 5 doctors",
    "Up to 20,000 patients",
    "Everything in Basic",
    "Pharmacy + inventory",
    "Lab orders & reports",
    "WhatsApp notifications",
    "Standard analytics",
  ],
  Pro: [
    "Unlimited doctors & patients",
    "Everything in Standard",
    "IPD + beds + nursing notes",
    "Full analytics",
    "Up to 5 branches",
    "1-year audit log",
    "Priority support",
  ],
};

function fmt(n: number) {
  return `₨ ${n.toLocaleString()}`;
}

export function LandingPricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const plans = PLANS[cycle];

  return (
    <section id="pricing" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Simple pricing · All in PKR
          </span>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Pricing that pays for itself in a week.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Every plan starts with a 10-day free trial on every Pro feature.
            No credit card. Cancel anytime.
          </p>

          <div className="mt-6 inline-flex items-center gap-1 rounded-full border bg-muted/30 p-1 text-sm">
            {(
              [
                { v: "monthly", label: "Monthly" },
                { v: "yearly", label: "Yearly" },
                { v: "oneTime", label: "One-time" },
              ] as Array<{ v: Cycle; label: string }>
            ).map((o) => (
              <button
                key={o.v}
                onClick={() => setCycle(o.v)}
                className={cn(
                  "rounded-full px-4 py-1.5 font-medium transition",
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

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <AnimatePresence mode="wait">
            {plans.map((p, i) => {
              const initialX = i === 0 ? -40 : i === plans.length - 1 ? 40 : 0;
              const initialY = i === 0 || i === plans.length - 1 ? 10 : 30;
              return (
              <motion.div
                key={`${cycle}-${p.name}`}
                initial={{ opacity: 0, x: initialX, y: initialY }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: false, margin: "-80px" }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -6 }}
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-card p-7 transition-shadow",
                  p.popular && "border-primary/40 ring-2 ring-primary/20 shadow-lg hover:shadow-xl",
                  !p.popular && "hover:shadow-md",
                )}
              >
                {p.popular && (
                  <div className="absolute -top-0 right-5 inline-flex items-center gap-1 rounded-b-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                    <Sparkles className="h-3 w-3" />
                    Most popular
                  </div>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {fmt(p.price)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {p.suffix}
                  </span>
                </div>
                {p.save && (
                  <div className="mt-1 text-xs font-medium text-emerald-600">
                    {p.save}
                  </div>
                )}
                <ul className="mt-5 space-y-2">
                  {FEATURES[p.name].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants(
                      p.popular ? undefined : { variant: "outline" },
                    ),
                    "mt-6 h-11 w-full",
                  )}
                >
                  Start free trial
                </Link>
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
