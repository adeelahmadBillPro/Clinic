"use client";

import { motion } from "framer-motion";
import { passwordStrength } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

const COLORS = [
  "bg-muted",
  "bg-rose-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-emerald-500",
] as const;

const LABEL_COLORS = [
  "text-muted-foreground",
  "text-rose-600",
  "text-amber-600",
  "text-yellow-700",
  "text-emerald-600",
] as const;

export function PasswordStrengthMeter({ value }: { value: string }) {
  const { score, label } = passwordStrength(value);
  const bars = [0, 1, 2, 3];
  const hasValue = value.length > 0;

  return (
    <div className={cn("mt-2", !hasValue && "opacity-60")}>
      <div className="flex items-center gap-1.5">
        {bars.map((i) => {
          const active = hasValue && i < score;
          return (
            <motion.div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                active ? COLORS[score] : "bg-muted",
              )}
              initial={false}
              animate={{ scaleY: active ? 1 : 0.7, opacity: active ? 1 : 0.6 }}
              transition={{ duration: 0.25 }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className={cn(LABEL_COLORS[hasValue ? score : 0])}>
          {hasValue ? label : "Password strength"}
        </span>
        {hasValue && score < 3 && (
          <span className="text-muted-foreground">
            Use uppercase, lowercase & a number
          </span>
        )}
      </div>
    </div>
  );
}
