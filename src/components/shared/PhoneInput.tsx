"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES, DEFAULT_COUNTRY, splitPhone, type Country } from "@/lib/countries";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (combined: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  id?: string;
  /** If true, show just the national number with the flag + dial code beside it. */
  defaultCountryCode?: string;
};

export function PhoneInput({
  value,
  onChange,
  placeholder = "300 1234567",
  className,
  autoComplete = "tel",
  id,
  defaultCountryCode,
}: Props) {
  const initial = useMemo(() => {
    const split = splitPhone(value);
    if (!value && defaultCountryCode) {
      const fromCode =
        COUNTRIES.find((c) => c.code === defaultCountryCode) ?? DEFAULT_COUNTRY;
      return { country: fromCode, national: "" };
    }
    return split;
  }, [value, defaultCountryCode]);

  const [country, setCountry] = useState<Country>(initial.country);
  const [national, setNational] = useState<string>(initial.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  function commit(next: Country, nationalRaw: string) {
    const n = nationalRaw.replace(/[^\d]/g, "");
    const combined = n ? `${next.dialCode}${n}` : "";
    onChange(combined);
  }

  return (
    <div className={cn("flex items-stretch gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Select country"
          onClick={() => setTimeout(() => searchRef.current?.focus(), 50)}
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="text-muted-foreground">{country.dialCode}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-0">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a country"
                className="h-8 pl-7 text-sm"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setCountry(c);
                  setOpen(false);
                  setQuery("");
                  commit(c, national);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-accent",
                  c.code === country.code && "bg-accent/60",
                )}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.dialCode}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No match
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={national}
        onChange={(e) => {
          let next = e.target.value.replace(/[^\d+\s\-()]/g, "");
          const digitsOnly = next.replace(/\D/g, "");
          const dialDigits = country.dialCode.replace(/\D/g, "");
          // If user typed/pasted the country code at the start, strip it
          if (next.startsWith("+") && digitsOnly.startsWith(dialDigits)) {
            next = digitsOnly.slice(dialDigits.length);
          } else if (digitsOnly.length > dialDigits.length && digitsOnly.startsWith(dialDigits)) {
            next = digitsOnly.slice(dialDigits.length);
          }
          // Also handle leading 0 (PK mobile format like 0300-1234567)
          if (country.code === "PK" && next.startsWith("0")) {
            next = next.slice(1);
          }
          // Drop any stray + left in the middle
          next = next.replace(/\+/g, "");
          setNational(next);
          commit(country, next);
        }}
        className="flex-1"
      />
    </div>
  );
}
