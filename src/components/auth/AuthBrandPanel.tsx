"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/shared/Logo";
import { TypingText } from "@/components/shared/TypingText";
import { orbFloat, stackContainer, stackItem } from "@/lib/motion";
import {
  ShieldCheck,
  Zap,
  Stethoscope,
  Pill,
  CheckCircle2,
  Quote,
} from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "Zero-paperwork reception",
    body: "Tokens in 10 seconds. Printable slip + WhatsApp to the patient.",
  },
  {
    icon: Stethoscope,
    title: "Consult → prescribe → pharmacy",
    body: "One click and pharmacy sees it. No WhatsApp screenshots.",
  },
  {
    icon: ShieldCheck,
    title: "Isolated per clinic",
    body: "Row-level tenant isolation. Your data can't touch another clinic's.",
  },
] as const;

const PHRASES = [
  "reception in 10 seconds.",
  "tokens that never get lost.",
  "prescriptions straight to pharmacy.",
  "every rupee accounted for.",
];

export function AuthBrandPanel() {
  return (
    <aside className="auth-hero-bg relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:p-12 xl:p-16">
      {/* Doctor photo backdrop — edge-faded */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[55%] opacity-[0.18] mix-blend-luminosity"
      >
        <Image
          src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1200&q=80"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.22_0.05_200)] via-transparent to-transparent" />
      </div>

      {/* Decorative orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        variants={orbFloat(0)}
        animate="animate"
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-10 -left-20 h-96 w-96 rounded-full bg-emerald-300/15 blur-3xl"
        variants={orbFloat(3)}
        animate="animate"
      />

      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px]"
      />

      <Link
        href="/"
        className="relative z-10 inline-flex items-center gap-2.5 self-start"
        aria-label="ClinicOS home"
      >
        <Logo variant="light" />
      </Link>

      {/* Typing headline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mt-10 max-w-md"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/90">
          Clinic management, reinvented
        </div>
        <h1
          className="mt-4 text-balance text-3xl font-semibold leading-[1.14] tracking-tight sm:text-4xl xl:text-[2.4rem]"
          style={{ minHeight: "10.5rem" }}
        >
          Run your clinic like a pro — with{" "}
          <span className="block text-emerald-200">
            <TypingText phrases={PHRASES} />
          </span>
        </h1>
      </motion.div>

      {/* Live product preview cards — slow drift after entrance */}
      <div className="relative z-10 mt-8 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -1.5 }}
          animate={{
            opacity: 1,
            y: [0, -6, 0, 4, 0],
            rotate: [-1.5, -2, -1.5, -1, -1.5],
          }}
          transition={{
            opacity: { duration: 1.4, ease: [0.22, 1, 0.36, 1] },
            y: {
              duration: 11,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.4,
            },
            rotate: {
              duration: 13,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.4,
            },
          }}
          className="relative ml-auto max-w-xs rounded-xl bg-white/10 p-3 shadow-2xl ring-1 ring-inset ring-white/20 backdrop-blur-sm"
        >
          <div className="rounded-lg bg-white p-3.5 text-slate-900 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span>Live queue</span>
              <span className="ml-auto text-slate-500">3 waiting</span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              {[
                {
                  t: "T-007",
                  p: "Muhammad Ali",
                  s: "CALLED",
                  c: "bg-sky-500/10 text-sky-700",
                },
                {
                  t: "T-008",
                  p: "Fatima S.",
                  s: "WAITING",
                  c: "bg-amber-500/10 text-amber-700",
                },
                {
                  t: "T-009",
                  p: "Bilal K.",
                  s: "WAITING",
                  c: "bg-amber-500/10 text-amber-700",
                },
              ].map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.12 }}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${t.c}`}
                >
                  <span className="font-mono font-bold">{t.t}</span>
                  <span className="flex-1 truncate font-medium">{t.p}</span>
                  <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">
                    {t.s}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, rotate: 2 }}
          animate={{
            opacity: 1,
            y: [0, 5, 0, -4, 0],
            rotate: [2, 2.5, 2, 1.5, 2],
          }}
          transition={{
            opacity: { delay: 0.4, duration: 1.4, ease: [0.22, 1, 0.36, 1] },
            y: {
              duration: 13,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.8,
            },
            rotate: {
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.8,
            },
          }}
          className="relative mr-auto max-w-[260px] rounded-xl bg-white/10 p-3 shadow-2xl ring-1 ring-inset ring-white/20 backdrop-blur-sm"
        >
          <div className="rounded-lg bg-white p-3 text-slate-900">
            <div className="flex items-center justify-between text-[11px] font-medium text-primary">
              <span className="inline-flex items-center gap-1">
                <Pill className="h-3 w-3" />
                Prescription sent
              </span>
              <span className="text-[9px] text-slate-500">just now</span>
            </div>
            <div className="mt-1.5 text-xs text-slate-800">
              <div>• Paracetamol 500mg × TDS × 5d</div>
              <div>• Cetirizine 10mg × HS × 5d</div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 mt-auto max-w-md"
        variants={stackContainer}
        initial="initial"
        animate="animate"
      >
        <motion.ul variants={stackContainer} className="space-y-3.5">
          {FEATURES.map((f) => (
            <motion.li
              key={f.title}
              variants={stackItem}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/15 ring-1 ring-inset ring-white/20">
                <f.icon className="h-3.5 w-3.5 text-emerald-200" />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-medium">{f.title}</div>
                <div className="mt-0.5 text-xs text-white/70">{f.body}</div>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        <motion.blockquote
          variants={stackItem}
          className="mt-6 rounded-xl bg-white/5 p-4 ring-1 ring-inset ring-white/10"
        >
          <Quote className="h-4 w-4 text-emerald-200/70" />
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            &ldquo;Our receptionist used to juggle paper slips. Now the whole
            clinic runs off one screen. I should have switched two years
            ago.&rdquo;
          </p>
          <footer className="mt-2.5 text-xs text-white/65">
            Dr. Ayesha Khan · General Physician · Karachi
          </footer>
        </motion.blockquote>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="relative z-10 mt-6 flex flex-wrap items-center gap-4 text-[11px] text-white/60"
      >
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-300" />
          10-day free trial
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-300" />
          No credit card
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-300" />
          Cancel anytime
        </span>
      </motion.div>
    </aside>
  );
}
