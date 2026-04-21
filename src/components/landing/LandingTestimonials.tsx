"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import {
  container,
  fromLeft,
  fromBottom,
  fromRight,
  fromTop,
  viewportOnce,
} from "@/lib/scrollMotion";

const QUOTES = [
  {
    quote:
      "Our tokens used to be scraps of paper. Now I can see the whole clinic from my phone. My receptionist can't hide cash differences anymore.",
    name: "Dr. Ayesha Khan",
    role: "General Physician · Karachi",
    initials: "AK",
    tone: "from-primary/20 to-sky-400/10",
    variant: fromLeft,
  },
  {
    quote:
      "The prescription → pharmacy handoff is instant. No more patients waiting 20 minutes for the pharmacy to figure out what I wrote.",
    name: "Dr. Bilal Hussain",
    role: "Pediatrics · Lahore",
    initials: "BH",
    tone: "from-emerald-400/20 to-primary/10",
    variant: fromBottom,
  },
  {
    quote:
      "Month-end reports used to take my accountant 3 days. Now it's a screen. I wish I switched two years ago.",
    name: "Dr. Sara Ahmed",
    role: "Clinic owner · Islamabad",
    initials: "SA",
    tone: "from-violet-400/20 to-sky-400/10",
    variant: fromRight,
  },
];

export function LandingTestimonials() {
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
            What doctors say
          </span>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Real clinics. Real wins.
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          {QUOTES.map((q, i) => (
            <motion.div
              key={i}
              variants={q.variant}
              whileHover={{ y: -5 }}
              className="relative rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <Quote className="h-6 w-6 text-primary/60" />
              <p className="mt-3 leading-relaxed">{q.quote}</p>
              <div className="mt-5 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${q.tone} text-sm font-semibold`}
                >
                  {q.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold">{q.name}</div>
                  <div className="text-xs text-muted-foreground">{q.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
