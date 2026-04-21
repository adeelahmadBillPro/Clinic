"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  phrases: string[];
  typingSpeed?: number; // ms per character
  pause?: number; // ms to hold the finished phrase
  className?: string;
  cursorClassName?: string;
};

export function TypingText({
  phrases,
  typingSpeed = 95,
  pause = 2400,
  className,
  cursorClassName,
}: Props) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (phrases.length === 0) return;
    const current = phrases[index % phrases.length];

    if (!deleting && text === current) {
      const hold = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(hold);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setIndex((i) => (i + 1) % phrases.length);
      return;
    }

    const nextSpeed = deleting ? typingSpeed / 2 : typingSpeed;
    const t = setTimeout(() => {
      setText((prev) =>
        deleting ? prev.slice(0, -1) : current.slice(0, prev.length + 1),
      );
    }, nextSpeed);
    return () => clearTimeout(t);
  }, [text, deleting, index, phrases, typingSpeed, pause]);

  return (
    <span className={cn("inline", className)}>
      {text}
      <motion.span
        aria-hidden
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.9, repeat: Infinity }}
        className={cn(
          "ml-0.5 inline-block w-0.5 -translate-y-[2px] align-middle bg-current",
          "h-[1em]",
          cursorClassName,
        )}
      />
    </span>
  );
}
