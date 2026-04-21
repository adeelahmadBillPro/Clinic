"use client";

import { motion } from "framer-motion";
import { Building2, UserPlus, Activity } from "lucide-react";
import {
  container,
  fromLeft,
  fromBottom,
  fromRight,
  fromTop,
  viewportOnce,
} from "@/lib/scrollMotion";

const STEPS = [
  {
    icon: Building2,
    title: "Register your clinic",
    body: "Takes 60 seconds. No credit card. You land straight on the dashboard.",
    variant: fromLeft,
  },
  {
    icon: UserPlus,
    title: "Add your doctors & staff",
    body: "Doctors get rooms and fees. Receptionists, nurses, pharmacists get their own role-specific views.",
    variant: fromBottom,
  },
  {
    icon: Activity,
    title: "Start seeing patients today",
    body: "Issue tokens, consult, dispense, bill. Reports accumulate automatically.",
    variant: fromRight,
  },
];

export function LandingHowItWorks() {
  return (
    <section className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={fromTop}
          className="text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Painless setup
          </span>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            You&rsquo;ll be running the clinic on ClinicOS today.
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          {STEPS.map((s, i) => (
            <motion.div key={i} variants={s.variant}>
              <div className="rounded-xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    {i + 1}
                  </div>
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
