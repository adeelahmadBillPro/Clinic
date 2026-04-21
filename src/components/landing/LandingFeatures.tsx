"use client";

import { motion } from "framer-motion";
import {
  CircleUserRound,
  Stethoscope,
  Pill,
  Package,
  BedDouble,
  FlaskConical,
  LineChart,
  MessageCircle,
} from "lucide-react";
import {
  container,
  directionAt,
  fromTop,
  viewportOnce,
} from "@/lib/scrollMotion";

const FEATURES = [
  {
    icon: CircleUserRound,
    title: "Reception & tokens",
    body: "Live token board, auto-increment per doctor, 24h expiry, printable slip + WhatsApp share.",
  },
  {
    icon: Stethoscope,
    title: "Doctor dashboard",
    body: "Queue sidebar, SOAP notes, ICD-10 diagnosis search, digital prescriptions with allergy warnings.",
  },
  {
    icon: Pill,
    title: "Pharmacy counter",
    body: "Prescriptions land automatically. Stock check, partial dispense, instant receipt + stock decrement.",
  },
  {
    icon: Package,
    title: "Inventory",
    body: "Medicines, purchase orders, GRN on receipt, expiry tracker, low-stock alerts.",
  },
  {
    icon: BedDouble,
    title: "IPD & beds",
    body: "Visual ward grid, admission workflow, nursing notes, consolidated discharge bill.",
  },
  {
    icon: FlaskConical,
    title: "Lab",
    body: "Test catalog, result entry with abnormal flagging, printable reports.",
  },
  {
    icon: LineChart,
    title: "Analytics",
    body: "Revenue mix, daily patient volume, doctor load, peak hours heatmap.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp & online booking",
    body: "Token-called messages, appointment reminders, public booking page per clinic.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={fromTop}
          className="text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Everything in one place
          </span>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Replace six apps with one.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            ClinicOS covers every part of your clinic workflow — reception,
            consultation, pharmacy, billing, analytics.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              variants={directionAt(i, 4)}
              className="group relative overflow-hidden rounded-xl border bg-card p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition group-hover:opacity-100" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
