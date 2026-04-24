"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";

type Props = {
  /** Scroll distance (px) before the button appears. */
  threshold?: number;
  /** Extra bottom offset — pass this when there's a mobile bottom nav (e.g. 80). */
  bottomOffset?: number;
};

export function ScrollToTop({ threshold = 320, bottomOffset = 0 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={scrollTop}
          aria-label="Scroll to top"
          initial={{ opacity: 0, y: 16, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          whileHover={{ y: -2, scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border bg-background/90 text-primary shadow-lg backdrop-blur-md ring-1 ring-primary/20 transition-shadow hover:shadow-xl sm:right-6 sm:h-12 sm:w-12"
          style={{
            bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px) + 16px)`,
          }}
        >
          {/* Subtle pulse ring to draw attention once visible */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
          <ChevronUp className="relative h-5 w-5 sm:h-5.5 sm:w-5.5" strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
