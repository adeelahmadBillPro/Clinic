"use client";

import { motion } from "framer-motion";
import { FileX, MessageSquareWarning, Calculator, CheckCircle2 } from "lucide-react";
import {
  container,
  fromLeft,
  fromBottom,
  fromRight,
  fromTop,
  viewportOnce,
} from "@/lib/scrollMotion";

const ITEMS = [
  {
    icon: FileX,
    problem: "Paper tokens get lost",
    solution:
      "Digital tokens with per-doctor numbering, 24h expiry, and live status sync across reception, doctors, and pharmacy.",
    variant: fromLeft,
  },
  {
    icon: MessageSquareWarning,
    problem: "Prescriptions sent over WhatsApp",
    solution:
      "The moment you finish a consultation, the prescription lands at the pharmacy counter — with allergy checks.",
    variant: fromBottom,
  },
  {
    icon: Calculator,
    problem: "No idea how much cash collected today",
    solution:
      "Every bill tracked. Staff submit shift cash reconciliation. Owner sees discrepancies in real-time.",
    variant: fromRight,
  },
];

export function LandingPainPoints() {
  return (
    <section className="relative border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={fromTop}
          className="text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            The real problems
          </span>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            If you run a clinic, you know this pain.
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          {ITEMS.map((item, i) => (
            <motion.div
              key={i}
              variants={item.variant}
              className="rounded-xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.problem}</h3>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item.solution}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
