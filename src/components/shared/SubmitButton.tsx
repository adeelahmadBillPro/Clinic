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
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="inline-flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
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
    </Button>
  );
}
