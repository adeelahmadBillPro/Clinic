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
import { Search } from "lucide-react";

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
            {filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-sm">{e.userName}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      ACTION_COLORS[e.action] ?? "bg-muted text-muted-foreground"
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
                  {e.details
                    ? JSON.stringify(e.details).slice(0, 80)
                    : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No matching entries.
          </div>
        )}
      </motion.div>
    </div>
  );
}
