"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";

/**
 * ClinicOS toast style.
 *
 * Sonner handles the queue + positioning; we customise the look/feel:
 *   • Per-variant accent stripe on the left (mint / red / amber / sky)
 *   • Motion-wrapped icons so success "pops", error "shakes", warning
 *     "wobbles" — each animation fires once on mount, taking < 500ms.
 *   • Heavier shadow + ring so it feels premium, not flat.
 *   • Pure CSS entry keyframe (`toastEnter`) with a slight overshoot so
 *     new toasts pounce in rather than slide politely.
 */

function SuccessIcon() {
  return (
    <motion.span
      initial={{ scale: 0.2, rotate: -12, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 16 }}
      className="inline-flex"
    >
      <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2.4} />
    </motion.span>
  );
}

function ErrorIcon() {
  return (
    <motion.span
      // Sharp horizontal shake — communicates "something's wrong" viscerally.
      initial={{ scale: 0.6, opacity: 0, x: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        x: [0, -4, 4, -3, 3, -2, 0],
      }}
      transition={{
        scale: { type: "spring", stiffness: 400, damping: 15 },
        opacity: { duration: 0.18 },
        x: { duration: 0.5, delay: 0.05 },
      }}
      className="inline-flex"
    >
      <XCircle className="h-5 w-5 text-red-600" strokeWidth={2.4} />
    </motion.span>
  );
}

function WarningIcon() {
  return (
    <motion.span
      // Gentle wobble — alerting but not alarming.
      initial={{ scale: 0.5, rotate: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: [0, -8, 8, -4, 4, 0],
      }}
      transition={{
        scale: { type: "spring", stiffness: 400, damping: 18 },
        opacity: { duration: 0.2 },
        rotate: { duration: 0.55, delay: 0.08 },
      }}
      className="inline-flex"
    >
      <AlertTriangle className="h-5 w-5 text-amber-600" strokeWidth={2.4} />
    </motion.span>
  );
}

function InfoIconAnim() {
  return (
    <motion.span
      initial={{ scale: 0.6, y: -6, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 450, damping: 20 }}
      className="inline-flex"
    >
      <Info className="h-5 w-5 text-sky-600" strokeWidth={2.4} />
    </motion.span>
  );
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <>
      {/* Tailwind JIT can't pick up animation names defined at runtime, so
          the entry keyframe lives here as a global style. Sonner's data
          attributes let us target new toasts specifically. */}
      <style jsx global>{`
        @keyframes toastPounce {
          0% {
            opacity: 0;
            transform: translateY(-14px) scale(0.92);
          }
          60% {
            opacity: 1;
            transform: translateY(2px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        [data-sonner-toast][data-mounted="true"] {
          animation: toastPounce 0.38s cubic-bezier(0.22, 1, 0.36, 1);
        }
        /* Close button: sonner ships it at top-left by default. Flip to
           top-right — matches what most users expect (UX standard), and
           stops the button colliding with our left accent stripe. */
        [data-sonner-toast] [data-close-button] {
          left: auto !important;
          right: -8px !important;
          top: -8px !important;
        }
        /* Mobile: stretch toasts to nearly full viewport width and pull
           them away from the right edge so they don't kiss the screen.
           Default sonner width (~356px) is fine on tablets+ but cramped
           on a 360px phone, especially with longer error messages. */
        @media (max-width: 640px) {
          [data-sonner-toaster][data-y-position="top"] {
            top: max(env(safe-area-inset-top, 0px), 0.5rem) !important;
          }
          [data-sonner-toaster][data-x-position="right"] {
            right: 0.5rem !important;
            left: 0.5rem !important;
            width: auto !important;
          }
          [data-sonner-toast] {
            width: 100% !important;
          }
        }
      `}</style>

      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        icons={{
          success: <SuccessIcon />,
          info: <InfoIconAnim />,
          warning: <WarningIcon />,
          error: <ErrorIcon />,
          loading: <Loader2 className="h-5 w-5 animate-spin text-foreground/70" />,
        }}
        toastOptions={{
          unstyled: false,
          classNames: {
            // Container: premium feel — thicker shadow, ring, rounded-2xl.
            // Accent stripe comes from `border-l-4` + per-variant left-
            // border colour below (not a `before:` pseudo-element, because
            // that required overflow-hidden and clipped sonner's close
            // button).
            toast:
              "group relative pl-4 pr-4 py-3.5 rounded-2xl border border-l-4 shadow-[0_10px_30px_-10px_rgb(0_0_0_/_0.18)] ring-1 ring-inset ring-white/60 backdrop-blur-md",
            title: "text-sm font-semibold tracking-tight leading-snug",
            description: "text-[12.5px] leading-relaxed opacity-80",
            closeButton:
              "!size-6 !bg-white !border !border-border/60 !text-foreground/70 hover:!text-foreground hover:!border-foreground/30 hover:!scale-110 transition shadow-sm",
            actionButton:
              "!bg-primary !text-primary-foreground !rounded-md !px-3 !py-1 !text-xs !font-medium hover:!brightness-95",
            cancelButton:
              "!bg-transparent !text-foreground/70 hover:!text-foreground !text-xs",
            // Per-type palette — `border-l-*` is the accent stripe.
            success:
              "!bg-emerald-50/95 !text-emerald-950 !border-emerald-400/30 !border-l-emerald-500 dark:!bg-emerald-950/60 dark:!text-emerald-50 dark:!border-emerald-400/40 dark:!border-l-emerald-400",
            error:
              "!bg-red-50/95 !text-red-950 !border-red-400/35 !border-l-red-500 dark:!bg-red-950/60 dark:!text-red-50 dark:!border-red-400/40 dark:!border-l-red-400",
            warning:
              "!bg-amber-50/95 !text-amber-950 !border-amber-400/35 !border-l-amber-500 dark:!bg-amber-950/60 dark:!text-amber-50 dark:!border-amber-400/40 dark:!border-l-amber-400",
            info:
              "!bg-sky-50/95 !text-sky-950 !border-sky-400/35 !border-l-sky-500 dark:!bg-sky-950/60 dark:!text-sky-50 dark:!border-sky-400/40 dark:!border-l-sky-400",
            loading:
              "!bg-card/95 !text-foreground !border-border !border-l-foreground/30 !ring-white/60",
          },
        }}
        {...props}
      />
    </>
  );
};

export { Toaster };
