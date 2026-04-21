"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

export function OtpInput({ value, onChange, length = 6, disabled }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current = refs.current.slice(0, length);
  }, [length]);

  const chars = value.padEnd(length, " ").slice(0, length).split("");

  const setAt = (i: number, ch: string) => {
    const digits = value.split("");
    while (digits.length < length) digits.push("");
    digits[i] = ch;
    onChange(digits.join("").replace(/\s+/g, "").slice(0, length));
  };

  const handleChange = (i: number, next: string) => {
    const cleaned = next.replace(/\D/g, "");
    if (!cleaned) {
      setAt(i, "");
      return;
    }
    if (cleaned.length === 1) {
      setAt(i, cleaned);
      refs.current[Math.min(i + 1, length - 1)]?.focus();
    } else {
      const arr = cleaned.slice(0, length).split("");
      onChange(arr.join("").padEnd(Math.min(arr.length, length), ""));
      refs.current[Math.min(arr.length, length - 1)]?.focus();
    }
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
      setAt(i - 1, "");
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
      refs.current[Math.min(pasted.length - 1, length - 1)]?.focus();
    }
  };

  return (
    <div className="flex items-center gap-2 tabular-nums">
      {Array.from({ length }).map((_, i) => {
        const ch = chars[i].trim();
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={ch}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.currentTarget.select()}
            className={cn(
              "h-12 w-11 rounded-lg border border-input bg-background text-center text-lg font-semibold",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25",
              ch && "border-primary/60",
            )}
            aria-label={`Digit ${i + 1}`}
          />
        );
      })}
    </div>
  );
}
