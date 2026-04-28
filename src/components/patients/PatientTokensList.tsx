"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TokenSlipDialog } from "@/components/reception/TokenSlipDialog";

type TokenRow = {
  id: string;
  displayToken: string;
  status: string;
  issuedAt: string;
  expiresAt: string;
  doctorName: string;
};

type Props = {
  tokens: TokenRow[];
  patientName: string;
  patientPhone: string;
  clinicName: string;
};

export function PatientTokensList({
  tokens,
  patientName,
  patientPhone,
  clinicName,
}: Props) {
  const [reprint, setReprint] = useState<TokenRow | null>(null);

  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This patient has no visits yet.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-1.5 text-sm">
        {tokens.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-2 rounded-md px-1 py-1 transition hover:bg-accent/40"
          >
            <span className="min-w-[5.5rem] font-mono text-xs">
              {t.displayToken}
            </span>
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {t.doctorName}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {t.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(t.issuedAt).toLocaleDateString()}
            </span>
            <button
              type="button"
              onClick={() => setReprint(t)}
              className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              title="Reprint / re-share token slip"
            >
              <Printer className="h-3 w-3" />
              Slip
            </button>
          </li>
        ))}
      </ul>

      {reprint && (
        <TokenSlipDialog
          slip={{
            displayToken: reprint.displayToken,
            patientName,
            patientPhone,
            doctorName: reprint.doctorName,
            issuedAt: reprint.issuedAt,
            expiresAt: reprint.expiresAt,
            clinicName,
          }}
          onClose={() => setReprint(null)}
        />
      )}
    </>
  );
}
