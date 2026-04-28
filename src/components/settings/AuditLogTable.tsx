"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, History } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

type Entry = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  PATIENT_REGISTERED: "bg-emerald-500/10 text-emerald-700",
  TOKEN_ISSUED: "bg-sky-500/10 text-sky-700",
  TOKEN_CALLED: "bg-sky-500/10 text-sky-700",
  TOKEN_COMPLETED: "bg-emerald-500/10 text-emerald-700",
  TOKEN_CANCELLED: "bg-destructive/10 text-destructive",
  TOKEN_RESET: "bg-amber-500/10 text-amber-700",
  CONSULTATION_CREATED: "bg-primary/10 text-primary",
  PRESCRIPTION_DISPENSED: "bg-primary/10 text-primary",
  BILL_GENERATED: "bg-sky-500/10 text-sky-700",
  PAYMENT_COLLECTED: "bg-emerald-500/10 text-emerald-700",
  STAFF_ADDED: "bg-emerald-500/10 text-emerald-700",
  STAFF_DEACTIVATED: "bg-destructive/10 text-destructive",
};

// "24 Apr · 14:32" — readable for the demo, no year unless we cross
// into another one.
function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

function detailsString(details: unknown): string {
  if (details === null || details === undefined) return "";
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details);
  } catch {
    return "";
  }
}

export function AuditLogTable({ initial }: { initial: Entry[] }) {
  // Pagination + coarse filters now live on the page (server-side — see
  // P4-59). The client still offers a quick in-page fuzzy filter on the
  // currently-visible entries.
  const entries = initial;
  const [q, setQ] = useState("");

  const filtered = q.trim()
    ? entries.filter(
        (e) =>
          e.action.toLowerCase().includes(q.toLowerCase()) ||
          e.userName.toLowerCase().includes(q.toLowerCase()) ||
          e.entityType.toLowerCase().includes(q.toLowerCase()),
      )
    : entries;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by action, user, or entity..."
          className="pl-9"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-xl border bg-card"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead className="hidden lg:table-cell">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => {
              const full = detailsString(e.details);
              const short = full.slice(0, 80);
              const truncated = full.length > 80;
              const fullDate = new Date(e.createdAt).toLocaleString();
              return (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    <time dateTime={e.createdAt} title={fullDate}>
                      {formatWhen(e.createdAt)}
                    </time>
                  </TableCell>
                  <TableCell className="text-sm">{e.userName}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        ACTION_COLORS[e.action] ??
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {e.action.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.entityType}
                    {e.entityId && (
                      <span className="ml-1 font-mono text-[10px]">
                        {e.entityId.slice(-6)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {!full ? (
                      <span className="opacity-50">—</span>
                    ) : truncated ? (
                      <details className="group max-w-md">
                        <summary className="cursor-pointer list-none">
                          <span className="select-none">{short}…</span>
                          <span className="ml-1 text-[10px] font-medium text-primary group-open:hidden">
                            show
                          </span>
                          <span className="ml-1 hidden text-[10px] font-medium text-primary group-open:inline">
                            hide
                          </span>
                        </summary>
                        <pre className="mt-1.5 max-h-48 max-w-md overflow-auto rounded-md border bg-muted/40 p-2 text-[10px] leading-relaxed">
                          {full}
                        </pre>
                      </details>
                    ) : (
                      short
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={History}
              title="No matching activity"
              description="Try clearing filters or pick a different action and date range."
              className="border-none bg-transparent p-6"
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
