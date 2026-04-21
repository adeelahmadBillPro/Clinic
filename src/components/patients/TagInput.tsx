"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
};

export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  suggestions,
  className,
}: Props) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, t]);
    setDraft("");
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
        {value.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${v}`}
              className="rounded-full p-0.5 hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              remove(value.length - 1);
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="h-7 min-w-[120px] flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
        />
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 6)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
