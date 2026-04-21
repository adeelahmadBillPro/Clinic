"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Search,
  Building2,
  Calendar,
  Users,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Clinic = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  owner: { name: string; email: string } | null;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    planName: string | null;
    monthlyPrice: number | null;
  } | null;
  userCount: number;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "trial", label: "Trial" },
  { id: "suspended", label: "Suspended" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function AdminClinicsClient() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<Clinic | null>(null);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (filter !== "all") params.set("filter", filter);
      const res = await fetch(`/api/admin/clinics?${params.toString()}`);
      const body = await res.json();
      if (body?.success) setClinics(body.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function act(
    c: Clinic,
    action: "suspend" | "activate" | "extendTrial",
    days?: number,
  ) {
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/clinics/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, days }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Action failed");
        return;
      }
      toast.success(
        action === "suspend"
          ? `${c.name} suspended`
          : action === "activate"
            ? `${c.name} activated`
            : `Trial extended by ${days ?? 14} days`,
      );
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function del() {
    if (!deletePrompt) return;
    if (confirmSlug !== deletePrompt.slug) {
      toast.error("Type the clinic slug exactly to confirm");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/clinics/${deletePrompt.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmSlug }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Delete failed");
        return;
      }
      toast.success(`${deletePrompt.name} deleted permanently`);
      setDeletePrompt(null);
      setConfirmSlug("");
      await load();
    } finally {
      setDeleting(false);
    }
  }

  const counts = useMemo(() => {
    const c = { total: clinics.length };
    return c;
  }, [clinics]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clinic by name or slug"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                filter === f.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "bg-card hover:bg-accent/60",
              )}
            >
              {f.label}
            </button>
          ))}
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
      </div>

      <div className="card-surface overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading clinics...
          </div>
        ) : clinics.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <div className="mt-3 text-sm font-medium">No clinics match</div>
            <div className="text-xs text-muted-foreground">
              Try a different filter or search.
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {clinics.map((c) => (
              <ClinicRow
                key={c.id}
                clinic={c}
                busy={busyId === c.id}
                onAct={act}
                onDelete={(cl) => {
                  setDeletePrompt(cl);
                  setConfirmSlug("");
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-right text-xs text-muted-foreground">
        {counts.total} {counts.total === 1 ? "clinic" : "clinics"}
      </div>

      <Dialog
        open={!!deletePrompt}
        onOpenChange={(v) => !v && !deleting && setDeletePrompt(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete clinic permanently?
              </span>
            </DialogTitle>
          </DialogHeader>
          {deletePrompt && (
            <>
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <div className="font-medium">{deletePrompt.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  slug: <span className="font-mono">{deletePrompt.slug}</span>
                  {" · "}
                  {deletePrompt.userCount} staff
                </div>
                <div className="mt-2 text-xs text-destructive">
                  This removes every patient, bill, prescription, and user under
                  this clinic. Cannot be undone.
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">
                  Type{" "}
                  <span className="font-mono font-semibold">
                    {deletePrompt.slug}
                  </span>{" "}
                  to confirm
                </label>
                <Input
                  value={confirmSlug}
                  onChange={(e) => setConfirmSlug(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <DialogFooter className="sm:justify-stretch">
                <Button
                  variant="ghost"
                  onClick={() => setDeletePrompt(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={del}
                  disabled={deleting || confirmSlug !== deletePrompt.slug}
                  className="flex-1"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Delete permanently
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

function ClinicRow({
  clinic: c,
  busy,
  onAct,
  onDelete,
}: {
  clinic: Clinic;
  busy: boolean;
  onAct: (
    c: Clinic,
    action: "suspend" | "activate" | "extendTrial",
    days?: number,
  ) => void;
  onDelete: (c: Clinic) => void;
}) {
  const now = new Date();
  const trialDate = c.trialEndsAt ? new Date(c.trialEndsAt) : null;
  const isTrial = c.isActive && trialDate && trialDate > now;
  const daysLeft = trialDate
    ? Math.ceil((trialDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <motion.div
      layout
      className="flex flex-col gap-3 p-4 transition hover:bg-accent/30 sm:flex-row sm:items-center"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Building2 className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{c.name}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            {c.slug}
          </span>
          {!c.isActive ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
              Suspended
            </span>
          ) : isTrial ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              Trial · {daysLeft}d left
            </span>
          ) : c.subscription?.status === "ACTIVE" ? (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              Paying · {c.subscription.planName ?? "Plan"}
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Free
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
          {c.owner && (
            <span>
              Owner:{" "}
              <span className="text-foreground">{c.owner.name}</span>
              {" · "}
              {c.owner.email}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {c.userCount} staff
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Joined{" "}
            {new Date(c.createdAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        {c.subscription?.monthlyPrice !== undefined &&
          c.subscription?.monthlyPrice !== null && (
            <div className="text-right text-xs">
              <div className="text-muted-foreground">Monthly</div>
              <div className="font-semibold tabular-nums">
                ₨ {Math.round(c.subscription.monthlyPrice).toLocaleString()}
              </div>
            </div>
          )}

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition hover:bg-accent"
            aria-label="Actions"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {c.isActive ? (
              <DropdownMenuItem onClick={() => onAct(c, "suspend")}>
                <Pause className="mr-2 h-4 w-4 text-destructive" />
                Suspend clinic
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onAct(c, "activate")}>
                <Play className="mr-2 h-4 w-4 text-emerald-600" />
                Reactivate clinic
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onAct(c, "extendTrial", 7)}>
              <Plus className="mr-2 h-4 w-4" />
              Extend trial +7 days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAct(c, "extendTrial", 14)}>
              <Plus className="mr-2 h-4 w-4" />
              Extend trial +14 days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAct(c, "extendTrial", 30)}>
              <Plus className="mr-2 h-4 w-4" />
              Extend trial +30 days
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(c)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete clinic permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
