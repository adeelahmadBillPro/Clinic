"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Zap, HeartPulse } from "lucide-react";
import { container, directionAt, viewportOnce } from "@/lib/scrollMotion";

const BADGES = [
  { icon: Lock, label: "Row-level data isolation" },
  { icon: ShieldCheck, label: "Encrypted at rest & in transit" },
  { icon: Zap, label: "Real-time queue sync" },
  { icon: HeartPulse, label: "Mobile-first for busy clinics" },
];

export function LandingTrustBand() {
  return (
    <section className="border-y bg-card">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs text-muted-foreground sm:gap-x-12"
        >
          {BADGES.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.label}
                variants={directionAt(i, 4)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{b.label}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
