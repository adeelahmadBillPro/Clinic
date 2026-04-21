"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BanknoteArrowDown, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Shift = {
  id: string;
  userId: string;
  userName: string;
  shiftDate: string;
  shiftType: string;
  totalCollected: number;
  declaredCash: number;
  difference: number;
  status: string;
  submittedAt: string | null;
};

export function CashShiftsClient({
  myCashToday,
  shifts,
  isAdmin,
}: {
  myCashToday: number;
  shifts: Shift[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [shiftType, setShiftType] = useState<
    "MORNING" | "EVENING" | "NIGHT" | "FULL_DAY"
  >("FULL_DAY");
  const [declaredCash, setDeclaredCash] = useState(String(myCashToday));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const declared = Number(declaredCash) || 0;
  const diff = declared - myCashToday;

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/cash-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftType,
          declaredCash: declared,
          notes,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success(
        body.data.status === "FLAGGED"
          ? "Shift submitted — flagged for review"
          : "Shift submitted",
      );
      setNotes("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card p-5"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BanknoteArrowDown className="h-4 w-4 text-primary" />
          My cash today
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              System-recorded
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              ₨ {Math.round(myCashToday).toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Declared cash (in hand)
            </div>
            <Input
              type="number"
              value={declaredCash}
              onChange={(e) => setDeclaredCash(e.target.value)}
              className="mt-1 text-2xl font-semibold tabular-nums"
            />
          </div>
          <div
            className={cn(
              "rounded-lg p-3",
              Math.abs(diff) <= 1
                ? "bg-emerald-500/10"
                : "bg-destructive/10 border-destructive/30 border",
            )}
          >
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Difference
            </div>
            <div
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                Math.abs(diff) <= 1 ? "text-emerald-700" : "text-destructive",
              )}
            >
              ₨ {Math.round(diff).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <div>
            <Label className="text-xs">Shift</Label>
            <Select
              value={shiftType}
              onValueChange={(v) =>
                v && setShiftType(v as typeof shiftType)
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MORNING">Morning</SelectItem>
                <SelectItem value="EVENING">Evening</SelectItem>
                <SelectItem value="NIGHT">Night</SelectItem>
                <SelectItem value="FULL_DAY">Full day</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              placeholder="Any discrepancies or context"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Submitting
                </>
              ) : (
                "Submit shift"
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">
          {isAdmin ? "All shifts" : "My recent shifts"}
        </h2>
        {shifts.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No shifts yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {shifts.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border bg-card p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.userName}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {s.shiftType.replace("_", " ")}
                      </Badge>
                      {s.status === "FLAGGED" ? (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/25 border text-[10px]">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          flagged
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/25 border text-[10px]">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {s.status.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.shiftDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>
                      System ₨ {Math.round(s.totalCollected).toLocaleString()}
                    </div>
                    <div>
                      Declared ₨ {Math.round(s.declaredCash).toLocaleString()}
                    </div>
                    <div
                      className={cn(
                        "font-semibold",
                        Math.abs(s.difference) > 1 && "text-destructive",
                      )}
                    >
                      Diff ₨ {Math.round(s.difference).toLocaleString()}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
