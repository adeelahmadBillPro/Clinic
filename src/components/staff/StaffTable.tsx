"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Role } from "@prisma/client";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Power,
  PowerOff,
  Loader2,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EditStaffDialog } from "./EditStaffDialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  specialization: string | null;
  qualification: string | null;
  roomNumber: string | null;
  consultationFee: number | null;
  revenueSharePct: number | null;
  status: string | null;
  isAvailable: boolean | null;
  doctorId: string | null;
};

const ROLE_STYLES: Partial<Record<Role, string>> = {
  OWNER: "bg-primary/10 text-primary border-primary/20",
  ADMIN: "bg-primary/10 text-primary border-primary/20",
  DOCTOR: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  RECEPTIONIST: "bg-sky-500/10 text-sky-700 border-sky-500/25",
  NURSE: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  PHARMACIST: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  LAB_TECH: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/25",
};

function formatRole(r: Role) {
  return r
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function StaffTable({
  staff,
  currentUserId,
}: {
  staff: StaffRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<StaffRow | null>(
    null,
  );
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StaffRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  async function hardDelete(s: StaffRow) {
    setBusyId(s.id);
    try {
      const res = await fetch(`/api/staff/${s.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not delete");
        return;
      }
      if (body.data?.deactivated) {
        toast.success(
          `${s.name} has historical records — deactivated instead of deleted`,
        );
      } else {
        toast.success(`${s.name} removed`);
      }
      setPendingDelete(null);
      setDeleteConfirm("");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Update failed");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  }

  if (staff.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No staff yet. Add your first doctor or receptionist to get started.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border bg-card"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden md:table-cell">Last login</TableHead>
            <TableHead className="hidden lg:table-cell">Details</TableHead>
            <TableHead className="text-right">On&nbsp;duty</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((s) => {
            const isSelf = s.id === currentUserId;
            return (
              <TableRow
                key={s.id}
                className={cn(!s.isActive && "opacity-60")}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/12 text-primary text-xs font-medium">
                        {initialsOf(s.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium">
                        {s.name}
                        {isSelf && (
                          <Badge variant="secondary" className="text-[10px]">
                            you
                          </Badge>
                        )}
                        {!s.isActive && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-muted text-muted-foreground"
                          >
                            inactive
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      ROLE_STYLES[s.role],
                    )}
                  >
                    {formatRole(s.role)}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {timeAgo(s.lastLoginAt)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {s.role === "DOCTOR" ? (
                    <div>
                      <div>{s.specialization}</div>
                      <div className="text-xs">
                        {s.roomNumber && <>Room {s.roomNumber} · </>}₨{" "}
                        {Math.round(s.consultationFee ?? 0).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <span>—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {s.role === "DOCTOR" ? (
                    <Switch
                      checked={!!s.isAvailable}
                      disabled={busyId === s.id || !s.isActive}
                      onCheckedChange={(v) =>
                        patch(s.id, {
                          isAvailable: v,
                          status: v ? "AVAILABLE" : "OFF_DUTY",
                        })
                      }
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busyId === s.id}
                      >
                        {busyId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onSelect={() => setEditing(s)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {s.role === "DOCTOR" && (
                        <>
                          <DropdownMenuItem
                            onSelect={() =>
                              patch(s.id, { status: "AVAILABLE", isAvailable: true })
                            }
                          >
                            Mark Available
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => patch(s.id, { status: "ON_BREAK" })}
                          >
                            On break
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              patch(s.id, { status: "OFF_DUTY", isAvailable: false })
                            }
                          >
                            Off duty
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {s.isActive ? (
                        !isSelf && (
                          <DropdownMenuItem
                            onSelect={() => setPendingDeactivate(s)}
                            className="text-destructive focus:text-destructive"
                          >
                            <PowerOff className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        )
                      ) : (
                        <DropdownMenuItem
                          onSelect={() => patch(s.id, { isActive: true })}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          Reactivate
                        </DropdownMenuItem>
                      )}
                      {!isSelf && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => {
                              setPendingDelete(s);
                              setDeleteConfirm("");
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete permanently
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <EditStaffDialog
        staff={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />

      {/* Delete confirmation */}
      <Dialog
        open={!!pendingDelete}
        onOpenChange={(v) =>
          !v && busyId !== pendingDelete?.id && setPendingDelete(null)
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete {pendingDelete?.name}?
              </span>
            </DialogTitle>
          </DialogHeader>
          {pendingDelete && (
            <>
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <div className="font-medium">
                  {pendingDelete.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {pendingDelete.email}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>
                    • If they have bills collected / consultations / tokens
                    issued, the record is <b>deactivated</b> instead (audit
                    trail preserved).
                  </li>
                  <li>
                    • Otherwise the account and doctor profile are removed
                    permanently.
                  </li>
                </ul>
              </div>
              <div>
                <label className="text-xs font-medium">
                  Type{" "}
                  <span className="font-mono font-semibold">
                    {pendingDelete.name.toLowerCase()}
                  </span>{" "}
                  to confirm
                </label>
                <Input
                  autoFocus
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="mt-1"
                />
              </div>
              <DialogFooter className="sm:justify-stretch">
                <DialogClose asChild>
                  <Button variant="ghost" disabled={busyId === pendingDelete.id}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => hardDelete(pendingDelete)}
                  disabled={
                    busyId === pendingDelete.id ||
                    deleteConfirm.trim().toLowerCase() !==
                      pendingDelete.name.toLowerCase()
                  }
                  className="flex-1"
                >
                  {busyId === pendingDelete.id ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Deleting
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete permanently
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingDeactivate}
        onOpenChange={(v) =>
          !v && busyId !== pendingDeactivate?.id && setPendingDeactivate(null)
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Deactivate {pendingDeactivate?.name}?
              </span>
            </DialogTitle>
          </DialogHeader>
          {pendingDeactivate && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="font-medium">
                {pendingDeactivate.name}{" "}
                <span className="text-xs text-muted-foreground">
                  · {pendingDeactivate.email}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>• They won&rsquo;t be able to log in.</li>
                {pendingDeactivate.role === "DOCTOR" && (
                  <li>• Their doctor profile stays in patient history, but
                    new bookings will skip them.</li>
                )}
                <li>• All their past records stay intact (audit, bills,
                  consultations).</li>
                <li>• You can reactivate them later any time.</li>
              </ul>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDeactivate) {
                  patch(pendingDeactivate.id, { isActive: false });
                  setPendingDeactivate(null);
                }
              }}
              disabled={busyId === pendingDeactivate?.id}
            >
              <PowerOff className="mr-1.5 h-3.5 w-3.5" />
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
