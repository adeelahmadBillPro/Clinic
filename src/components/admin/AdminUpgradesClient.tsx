"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Check,
  X,
  RefreshCcw,
  Building2,
  Banknote,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Request = {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicSlug: string | null;
  clinicActive: boolean;
  submitterName: string;
  submitterEmail: string;
  planName: string;
  cycle: string;
  method: string;
  referenceNumber: string;
  amountPaid: number;
  notes: string | null;
  status: string;
  reviewerName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
};

const STATUSES = [
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "ALL", label: "All" },
] as const;

export function AdminUpgradesClient() {
  const [tab, setTab] = useState<(typeof STATUSES)[number]["id"]>("PENDING");
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<{
    req: Request;
    action: "approve" | "reject";
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/upgrade-requests?status=${tab}`);
      const body = await res.json();
      if (body?.success) setRequests(body.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function submitReview() {
    if (!pendingAction) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/upgrade-requests/${pendingAction.req.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: pendingAction.action,
            reviewNotes,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success(
        pendingAction.action === "approve"
          ? `${pendingAction.req.clinicName} activated with ${pendingAction.req.planName} plan`
          : `Request rejected`,
      );
      setPendingAction(null);
      setReviewNotes("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setTab(s.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                tab === s.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "bg-card hover:bg-accent/60",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={load}
          aria-label="Refresh"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card-surface flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : requests.length === 0 ? (
          <div className="card-surface py-16 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/60" />
            <div className="mt-3 text-sm font-medium">All clear</div>
            <div className="text-xs text-muted-foreground">
              {tab === "PENDING"
                ? "No pending upgrade requests."
                : "No requests with this status."}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {requests.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                onApprove={() => setPendingAction({ req: r, action: "approve" })}
                onReject={() => setPendingAction({ req: r, action: "reject" })}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Review dialog */}
      <Dialog
        open={!!pendingAction}
        onOpenChange={(v) => !v && !submitting && setPendingAction(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.action === "approve" ? (
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Approve upgrade?
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  Reject upgrade?
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {pendingAction && (
            <>
              <div className="rounded-xl bg-muted/40 p-3 text-sm">
                <div className="font-medium">{pendingAction.req.clinicName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {pendingAction.req.planName} · {pendingAction.req.cycle} ·{" "}
                  {pendingAction.req.method} · ref{" "}
                  <span className="font-mono">
                    {pendingAction.req.referenceNumber}
                  </span>
                </div>
                <div className="mt-1 text-xs">
                  Amount:{" "}
                  <span className="font-semibold">
                    ₨{" "}
                    {Math.round(pendingAction.req.amountPaid).toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">
                  Internal notes (optional)
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    pendingAction.action === "approve"
                      ? "Verified bank statement · activated manually"
                      : "Reason — e.g. reference not found in our account"
                  }
                  className="mt-1"
                />
              </div>
              <DialogFooter className="sm:justify-stretch">
                <Button
                  variant="ghost"
                  onClick={() => setPendingAction(null)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  variant={
                    pendingAction.action === "reject" ? "destructive" : "default"
                  }
                  onClick={submitReview}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : pendingAction.action === "approve" ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      Approve & activate
                    </>
                  ) : (
                    <>
                      <X className="mr-1.5 h-4 w-4" />
                      Reject request
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({
  request: r,
  onApprove,
  onReject,
}: {
  request: Request;
  onApprove: () => void;
  onReject: () => void;
}) {
  const pending = r.status === "PENDING";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="card-surface p-4"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{r.clinicName}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {r.planName} · {r.cycle}
            </span>
            {pending ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                <Clock className="h-3 w-3" />
                Pending review
              </span>
            ) : r.status === "APPROVED" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                <XCircle className="h-3 w-3" />
                Rejected
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Submitted by{" "}
            <span className="text-foreground">{r.submitterName}</span> · {r.submitterEmail}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground">Amount</div>
          <div className="text-base font-semibold tabular-nums">
            ₨ {Math.round(r.amountPaid).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-lg border bg-muted/30 p-3 text-xs sm:grid-cols-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Method
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 font-medium">
            <Banknote className="h-3.5 w-3.5" />
            {r.method.replace(/_/g, " ")}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Reference
          </div>
          <div className="mt-0.5 font-mono font-medium">{r.referenceNumber}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Submitted
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 font-medium">
            <CalendarClock className="h-3.5 w-3.5" />
            {new Date(r.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
        </div>
      </div>

      {r.notes && (
        <div className="mt-3 rounded-lg border-l-4 border-primary/30 bg-muted/30 p-3 text-xs">
          <span className="font-medium">Note from clinic:</span> {r.notes}
        </div>
      )}

      {!pending && (r.reviewNotes || r.reviewerName) && (
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs">
          <div className="font-medium">
            {r.status === "APPROVED" ? "Approved" : "Rejected"} by{" "}
            {r.reviewerName} ·{" "}
            {r.reviewedAt
              ? new Date(r.reviewedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : ""}
          </div>
          {r.reviewNotes && (
            <div className="mt-1 text-muted-foreground">{r.reviewNotes}</div>
          )}
        </div>
      )}

      {pending && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onReject}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Reject
          </Button>
          <Button size="sm" onClick={onApprove}>
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Approve & activate
          </Button>
        </div>
      )}
    </motion.div>
  );
}
