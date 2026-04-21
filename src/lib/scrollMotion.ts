import type { Variants } from "framer-motion";

export const easeOut = [0.22, 1, 0.36, 1] as const;

/** Slide in from the left. */
export const fromLeft: Variants = {
  hidden: { opacity: 0, x: -48, y: 0 },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.65, ease: easeOut },
  },
};

/** Slide in from the right. */
export const fromRight: Variants = {
  hidden: { opacity: 0, x: 48, y: 0 },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.65, ease: easeOut },
  },
};

/** Rise from below. */
export const fromBottom: Variants = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

/** Drop from above. */
export const fromTop: Variants = {
  hidden: { opacity: 0, y: -32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

/** Pop up with slight scale. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 14 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOut },
  },
};

/** Direction map based on index within a row. */
export function directionAt(i: number, columns = 3): Variants {
  // edges slide in sideways, middle rises from bottom — creates a "wrapping" feel
  const col = i % columns;
  if (col === 0) return fromLeft;
  if (col === columns - 1) return fromRight;
  return fromBottom;
}

export const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

/** Re-animates every time the section enters the viewport (scroll down + back up). */
export const viewportOnce = { once: false, margin: "-80px" };
