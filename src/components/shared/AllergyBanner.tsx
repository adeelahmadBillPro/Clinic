"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export function AllergyBanner({
  allergies,
}: {
  allergies: string[] | null | undefined;
}) {
  if (!allergies || allergies.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{
        opacity: 1,
        y: 0,
        x: [0, -3, 3, -3, 3, -1.5, 1.5, 0],
        transition: {
          x: { duration: 0.55, repeat: Infinity, repeatDelay: 5 },
        },
      }}
      className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
      role="alert"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <span className="font-semibold uppercase tracking-wider">
          Allergy alert:
        </span>{" "}
        <span className="font-medium">{allergies.join(", ")}</span>
      </div>
    </motion.div>
  );
}
