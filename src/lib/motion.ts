import type { Variants, Transition } from "framer-motion";

export const easeOut: Transition["ease"] = [0.22, 1, 0.36, 1];

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.3, ease: easeOut } },
};

export const stackContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.08 },
  },
};

export const stackItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4, ease: easeOut } },
};

export const shakeX: Variants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.45 },
  },
};

export const pulseAlert: Variants = {
  animate: {
    x: [0, -4, 4, -4, 4, -2, 2, 0],
    transition: { duration: 0.55, repeat: Infinity, repeatDelay: 3.5 },
  },
};

export const orbFloat = (seed = 0): Variants => ({
  animate: {
    y: [0, -14, 0, 10, 0],
    x: [0, 8, 0, -6, 0],
    scale: [1, 1.04, 1, 0.98, 1],
    transition: {
      duration: 14 + seed,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
});
