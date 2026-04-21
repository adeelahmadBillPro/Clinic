"use client";

import { motion } from "framer-motion";
import { Zap, ShieldCheck, Clock, Lock } from "lucide-react";

const POINTS = [
  { icon: Zap, label: "Set up in 60 seconds" },
  { icon: Clock, label: "10 days free · no card" },
  { icon: ShieldCheck, label: "Your data is isolated" },
  { icon: Lock, label: "Cancel anytime" },
];

export function AuthSideExtras() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="hidden lg:block"
    >
      <div className="mt-10 rounded-2xl border bg-muted/40 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          What you get today
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {POINTS.map((p) => {
            const Icon = p.icon;
            return (
              <li
                key={p.label}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-3 w-3" />
                </span>
                <span>{p.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 flex items-center gap-3 px-1 text-xs text-muted-foreground">
        <div className="flex -space-x-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-7 w-7 rounded-full border-2 border-background bg-gradient-to-br from-primary/40 to-sky-400/30"
            />
          ))}
        </div>
        <span>
          Trusted by <span className="font-semibold text-foreground">200+</span>{" "}
          clinics
        </span>
      </div>
    </motion.div>
  );
}
