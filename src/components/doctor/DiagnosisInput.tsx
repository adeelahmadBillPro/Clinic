"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { DiagnosisItem } from "@/lib/validations/consultation";

// Common ICD-10 starter set — doctor can type anything else freely.
const COMMON_ICD10 = [
  { code: "J06.9", description: "Acute upper respiratory infection" },
  { code: "K59.1", description: "Diarrhea" },
  { code: "I10", description: "Essential hypertension" },
  { code: "E11.9", description: "Type 2 diabetes mellitus, uncomplicated" },
  { code: "R50.9", description: "Fever, unspecified" },
  { code: "R51", description: "Headache" },
  { code: "J45.9", description: "Asthma, unspecified" },
  { code: "M54.5", description: "Low back pain" },
  { code: "N39.0", description: "Urinary tract infection, site unspecified" },
  { code: "B34.9", description: "Viral infection, unspecified" },
];

export function DiagnosisInput({
  value,
  onChange,
}: {
  value: DiagnosisItem[];
  onChange: (v: DiagnosisItem[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");

  const suggestions = COMMON_ICD10.filter(
    (d) =>
      d.code.toLowerCase().includes(query.toLowerCase()) ||
      d.description.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 8);

  function add(item: DiagnosisItem) {
    if (
      value.some(
        (v) =>
          v.description.toLowerCase() === item.description.toLowerCase(),
      )
    ) {
      return;
    }
    onChange([...value, item]);
    setQuery("");
    setCustom("");
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Search ICD-10</Label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="fever, J06, headache..."
          className="mt-1.5"
        />
        {query && suggestions.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-lg border bg-popover">
            <ul className="max-h-56 overflow-y-auto">
              {suggestions.map((s) => (
                <li key={s.code}>
                  <button
                    type="button"
                    onClick={() => add(s)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-mono text-xs font-semibold text-primary">
                      {s.code}
                    </span>
                    <span className="text-muted-foreground">{s.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label>Custom diagnosis</Label>
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Type a diagnosis not in the list"
            className="mt-1.5"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!custom.trim()}
          onClick={() => add({ description: custom.trim() })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">No diagnoses added yet.</p>
      ) : (
        <ul className="space-y-2">
          {value.map((d, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
            >
              <div className="flex items-center gap-3">
                {d.code && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    {d.code}
                  </span>
                )}
                <span className="text-sm">{d.description}</span>
              </div>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={() => remove(i)}
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
