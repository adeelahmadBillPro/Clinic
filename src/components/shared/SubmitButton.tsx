"use client";

import { Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingText?: string;
  succeeded?: boolean;
  successText?: string;
};

// Six sparkles placed roughly around the button centre; deterministic so the
// burst reads the same every time instead of "random confetti-ish".
const SPARKLES = [
  { x: -44, y: -18, d: 0.00 },
  { x: 38, y: -22, d: 0.04 },
  { x: -28, y: 20, d: 0.07 },
  { x: 46, y: 16, d: 0.02 },
  { x: -52, y: 2, d: 0.05 },
  { x: 54, y: -2, d: 0.08 },
];

export function SubmitButton({
  loading,
  loadingText,
  succeeded,
  successText,
  children,
  disabled,
  className,
  ...props
}: Props) {
  return (
    <Button
      type="submit"
      disabled={loading || disabled}
      className={cn(
        "relative h-11 w-full overflow-hidden font-medium text-base",
        className,
      )}
      {...props}
    >
      {/* Shimmer sweep while loading — a soft diagonal highlight that
          loops left→right so the button reads as "working" instead of
          just "frozen with a spinner". Pointer-events none so it never
          steals clicks; z-0 keeps it behind the label. */}
      <AnimatePresence>
        {loading && (
          <motion.span
            key="shimmer"
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.span
              className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              initial={{ x: "-120%" }}
              animate={{ x: "320%" }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Success burst — a single expanding ring + a handful of sparkles
          that fly outward and fade. Fires once when `succeeded` flips
          true thanks to AnimatePresence. Lives above the shimmer but
          behind the label. */}
      <AnimatePresence>
        {succeeded && (
          <motion.span
            key="burst"
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              className="absolute h-16 w-16 rounded-full border-2 border-emerald-300/70"
              initial={{ scale: 0.2, opacity: 0.8 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
            {SPARKLES.map((s, i) => (
              <motion.span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-white"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{
                  x: s.x,
                  y: s.y,
                  opacity: [0, 1, 0],
                  scale: [0.4, 1, 0.6],
                }}
                transition={{
                  duration: 0.75,
                  delay: s.d,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Label layer — keeps the existing idle / loading / success swap. */}
      <span className="relative z-10 inline-flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="inline-flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {loadingText ?? "Please wait..."}
            </motion.span>
          ) : succeeded ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 18,
              }}
              className="inline-flex items-center gap-2"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.08,
                  type: "spring",
                  stiffness: 500,
                  damping: 14,
                }}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </motion.span>
              {successText ?? "Done"}
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="inline-flex items-center gap-1.5"
            >
              {children}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </Button>
  );
}
