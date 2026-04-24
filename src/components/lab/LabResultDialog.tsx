"use client";

import { useEffect, useState } from "react";
import { Loader2, Printer, CheckCircle2, Beaker } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  tests: Array<{
    code: string;
    name: string;
    parameters?: Array<{
      name: string;
      unit: string;
      normalMin?: number;
      normalMax?: number;
      normalRange?: string;
    }>;
  }>;
  patient: { id: string; name: string; mrn: string; phone: string } | null;
};

type ResultRow = {
  testCode: string;
  testName: string;
  parameter: string;
  value: string;
  unit: string;
  normalRange: string;
  isAbnormal: boolean;
};

function rangeText(p: { normalMin?: number; normalMax?: number; normalRange?: string }) {
  if (p.normalRange) return p.normalRange;
  if (p.normalMin !== undefined && p.normalMax !== undefined)
    return `${p.normalMin} – ${p.normalMax}`;
  return "—";
}

function isValueAbnormal(
  value: string,
  p: { normalMin?: number; normalMax?: number },
) {
  const n = Number(value);
  if (!isFinite(n)) return false;
  if (p.normalMin !== undefined && n < p.normalMin) return true;
  if (p.normalMax !== undefined && n > p.normalMax) return true;
  return false;
}

export function LabResultDialog({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [status, setStatus] = useState(order.status);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Load existing results if any
    fetch(`/api/lab/orders/${order.id}`)
      .then((r) => r.json())
      .then((b) => {
        if (!b?.success) return;
        const existing = (b.data.results as ResultRow[] | null) ?? [];
        const byParam = new Map(
          existing.map((r) => [`${r.testCode}::${r.parameter}`, r]),
        );
        const initial: ResultRow[] = [];
        for (const t of order.tests) {
          for (const p of t.parameters ?? []) {
            const key = `${t.code}::${p.name}`;
            const prev = byParam.get(key);
            initial.push({
              testCode: t.code,
              testName: t.name,
              parameter: p.name,
              value: prev?.value ?? "",
              unit: p.unit,
              normalRange: rangeText(p),
              isAbnormal: prev?.isAbnormal ?? false,
            });
          }
        }
        setRows(initial);
      });
  }, [order.id, order.tests]);

  function updateRow(i: number, value: string) {
    setRows((prev) => {
      const next = [...prev];
      const test = order.tests.find((t) => t.code === next[i].testCode);
      const p = test?.parameters?.find((x) => x.name === next[i].parameter);
      const abnormal = p ? isValueAbnormal(value, p) : false;
      next[i] = { ...next[i], value, isAbnormal: abnormal };
      return next;
    });
  }

  async function save(newStatus?: typeof status) {
    const targetStatus = newStatus ?? status;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lab/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          results: rows.map((r) => ({
            testCode: r.testCode,
            parameter: r.parameter,
            value: r.value,
            unit: r.unit,
            normalRange: r.normalRange,
            isAbnormal: r.isAbnormal,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Save failed");
        return;
      }
      toast.success("Saved");
      if (targetStatus === "COMPLETED") onSaved();
      else setStatus(targetStatus);
    } finally {
      setSubmitting(false);
    }
  }

  function printReport() {
    const win = window.open("", "_blank", "width=820,height=1100");
    if (!win) return;
    const rowsHtml = rows
      .map(
        (r) => `
          <tr>
            <td>${r.parameter}</td>
            <td class="num ${r.isAbnormal ? "abn" : ""}">${r.value || "—"}</td>
            <td>${r.unit}</td>
            <td>${r.normalRange}</td>
            <td>${r.isAbnormal ? "H/L" : ""}</td>
          </tr>
        `,
      )
      .join("");
    win.document.write(`
      <html>
        <head>
          <title>${order.orderNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 32px; color: #0f172a; }
            h1 { color: #0F6E56; margin-bottom: 4px }
            .meta { color: #64748b; font-size: 12px; margin-bottom: 16px }
            table { width: 100%; border-collapse: collapse; margin-top: 12px }
            th, td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: left }
            th { color: #64748b; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em }
            .num { font-variant-numeric: tabular-nums; text-align: right }
            .abn { color: #b91c1c; font-weight: 600 }
          </style>
        </head>
        <body onload="window.print(); setTimeout(()=>window.close(), 300)">
          <h1>Lab Report</h1>
          <div class="meta">
            ${order.orderNumber} · ${order.patient?.name ?? ""} (${order.patient?.mrn ?? ""})
            · Printed ${new Date().toLocaleString()}
          </div>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th class="num">Result</th>
                <th>Unit</th>
                <th>Normal range</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm">{order.orderNumber}</span>
            <Badge variant="secondary">{status.replace("_", " ")}</Badge>
          </DialogTitle>
        </DialogHeader>

        {order.patient && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{order.patient.name}</div>
            <div className="text-xs text-muted-foreground">
              {order.patient.mrn} · {order.patient.phone}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant={status === "SAMPLE_COLLECTED" || status === "IN_PROGRESS" || status === "COMPLETED" ? "default" : "outline"}
            size="sm"
            disabled={status === "SAMPLE_COLLECTED" || status === "IN_PROGRESS" || status === "COMPLETED"}
            onClick={() => save("SAMPLE_COLLECTED")}
          >
            Mark sample collected
          </Button>
          <Button
            variant={status === "IN_PROGRESS" || status === "COMPLETED" ? "default" : "outline"}
            size="sm"
            disabled={status === "IN_PROGRESS" || status === "COMPLETED"}
            onClick={() => save("IN_PROGRESS")}
          >
            Mark in progress
          </Button>
        </div>

        <div className="space-y-5">
          {order.tests.map((t) => {
            const testRows = rows
              .map((r, idx) => ({ r, idx }))
              .filter((x) => x.r.testCode === t.code);
            if (testRows.length === 0) return null;
            return (
              <div key={t.code} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs font-semibold text-primary">
                      {t.code}
                    </div>
                    <div className="text-sm font-medium">{t.name}</div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="py-1 text-left font-medium">Parameter</th>
                        <th className="w-32 py-1 text-left font-medium">Result</th>
                        <th className="w-16 py-1 text-left font-medium">Unit</th>
                        <th className="w-36 py-1 text-left font-medium">Normal</th>
                        <th className="w-14 py-1 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {testRows.map(({ r, idx }) => (
                        <tr key={idx} className="border-t">
                          <td className="py-1.5">{r.parameter}</td>
                          <td className="py-1.5 pr-2">
                            <Input
                              value={r.value}
                              onChange={(e) => updateRow(idx, e.target.value)}
                              className={cn(
                                "h-8",
                                r.isAbnormal && "border-destructive text-destructive font-semibold",
                              )}
                            />
                          </td>
                          <td className="py-1.5 text-xs text-muted-foreground">
                            {r.unit}
                          </td>
                          <td className="py-1.5 text-xs text-muted-foreground">
                            {r.normalRange}
                          </td>
                          <td className="py-1.5 text-center text-xs font-semibold text-destructive">
                            {r.isAbnormal ? "H/L" : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-wrap">
          <Button variant="outline" onClick={printReport}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print report
          </Button>
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Close
            </Button>
          </DialogClose>
          <Button onClick={() => save()} disabled={submitting} variant="outline">
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving
              </>
            ) : (
              "Save draft"
            )}
          </Button>
          <Button onClick={() => save("COMPLETED")} disabled={submitting}>
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Save & complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
