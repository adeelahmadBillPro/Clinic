"use client";

import { useEffect, useState, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PatientHit = {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  gender: string;
  dob: string | null;
  bloodGroup: string | null;
  allergies: string[];
};

type Props = {
  placeholder?: string;
  onSelect?: (p: PatientHit) => void;
  autoFocus?: boolean;
  className?: string;
};

export function PatientSearch({
  placeholder = "Search patients by name, phone, or MRN...",
  onSelect,
  autoFocus,
  className,
}: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      setOpen(false);
      return;
    }
    // Cancel in-flight fetches when the user keeps typing — otherwise a
    // slow reply for "Bas" can clobber the fresh results for "Basim".
    const ac = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/patients?q=${encodeURIComponent(q)}&limit=8`,
          { signal: ac.signal },
        );
        const body = await res.json();
        if (body?.success) {
          setHits(body.data);
          setOpen(true);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") throw e;
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(handle);
      ac.abort();
    };
  }, [q]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim() && setOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-9 h-11 text-sm"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-9 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-lg border bg-popover shadow-lg">
          {hits.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No matching patients. Register a new one below.
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect?.(h);
                      setOpen(false);
                      setQ("");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        {h.name}
                        {h.allergies.length > 0 && (
                          <span className="inline-block rounded-full bg-destructive/12 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                            allergy
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {h.mrn} · {h.phone}
                        {h.bloodGroup && <> · {h.bloodGroup}</>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
