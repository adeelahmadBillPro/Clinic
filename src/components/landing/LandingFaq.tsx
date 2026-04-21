"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  container,
  fromLeft,
  fromRight,
  fromTop,
  viewportOnce,
} from "@/lib/scrollMotion";

const FAQS = [
  {
    q: "Do I need a credit card for the trial?",
    a: "No. Just your email and clinic name. You get 10 days of every Pro feature — no card required.",
  },
  {
    q: "Can I export my data if I leave?",
    a: "Yes. Owners can export a full ZIP of all clinic data (patients, tokens, bills, consultations) as CSV files.",
  },
  {
    q: "Is my data isolated from other clinics?",
    a: "Every clinic's data is tagged and scoped at the database query level. You can't see other clinics' records, and they can't see yours.",
  },
  {
    q: "Does it work on mobile?",
    a: "Yes. ClinicOS is mobile-first. Reception, doctor, and pharmacy screens all work on phones and tablets with a bottom tab bar.",
  },
  {
    q: "Can I run multiple clinics?",
    a: "Pro plan supports up to 5 branches under one owner account. Each branch has its own data, staff, and reports.",
  },
  {
    q: "How does WhatsApp integration work?",
    a: "Plug in your Twilio credentials in settings. When a token is called or a lab report is ready, the patient gets an automated WhatsApp message.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={fromTop}
          className="text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Good questions
          </span>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Frequently asked
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-10 divide-y rounded-xl border bg-card"
        >
          {FAQS.map((f, i) => {
            const expanded = open === i;
            return (
              <motion.div
                key={i}
                variants={i % 2 === 0 ? fromLeft : fromRight}
              >
                <button
                  onClick={() => setOpen(expanded ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="font-medium">{f.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-sm text-muted-foreground">
                        {f.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
