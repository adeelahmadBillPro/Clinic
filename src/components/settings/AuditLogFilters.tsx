"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, X } from "lucide-react";

type UserOption = { id: string; name: string; role: string };

type Props = {
  initial: {
    action?: string;
    userId?: string;
    entityType?: string;
    from?: string;
    to?: string;
  };
  users: UserOption[];
};

// Map of UI labels to backend `entityType` strings used by various
// audit-writing endpoints. See `entityType:` references across
// `src/app/api/**` — these strings are the truth.
const ENTITY_OPTIONS: { label: string; value: string }[] = [
  { label: "Patient", value: "Patient" },
  { label: "Bill", value: "Bill" },
  { label: "Token", value: "Token" },
  { label: "Consultation", value: "Consultation" },
  { label: "Pharmacy order", value: "PharmacyOrder" },
  { label: "User", value: "User" },
  { label: "IPD", value: "IpdAdmission" },
  { label: "Lab order", value: "LabOrder" },
  { label: "Subscription", value: "Subscription" },
  { label: "Clinic", value: "Clinic" },
  { label: "Cash shift", value: "CashShift" },
  { label: "Purchase order", value: "PurchaseOrder" },
  { label: "Review", value: "Review" },
];

const ALL = "__ALL__";

export function AuditLogFilters({ initial, users }: Props) {
  const router = useRouter();
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState<string>(initial.action ?? ALL);
  const [userId, setUserId] = useState<string>(initial.userId ?? ALL);
  const [entityType, setEntityType] = useState<string>(
    initial.entityType ?? ALL,
  );
  const [from, setFrom] = useState<string>(initial.from ?? "");
  const [to, setTo] = useState<string>(initial.to ?? "");

  useEffect(() => {
    let abort = false;
    fetch("/api/audit/actions")
      .then((r) => r.json())
      .then((body) => {
        if (!abort && body?.success) setActions(body.data as string[]);
      })
      .catch(() => {
        /* not fatal — dropdown just stays empty until reload */
      });
    return () => {
      abort = true;
    };
  }, []);

  const hasAny =
    action !== ALL ||
    userId !== ALL ||
    entityType !== ALL ||
    from !== "" ||
    to !== "";

  function apply() {
    const qs = new URLSearchParams();
    qs.set("page", "1");
    if (action && action !== ALL) qs.set("action", action);
    if (userId && userId !== ALL) qs.set("userId", userId);
    if (entityType && entityType !== ALL) qs.set("entityType", entityType);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    router.push(`/settings/audit-log?${qs.toString()}`);
  }

  function clear() {
    setAction(ALL);
    setUserId(ALL);
    setEntityType(ALL);
    setFrom("");
    setTo("");
    router.push("/settings/audit-log");
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
      <div className="min-w-[200px]">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Action
        </label>
        <Select
          value={action}
          onValueChange={(v) => setAction(v ?? ALL)}
        >
          <SelectTrigger className="h-8 w-56">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a.replaceAll("_", " ").toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[200px]">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          User
        </label>
        <Select
          value={userId}
          onValueChange={(v) => setUserId(v ?? ALL)}
        >
          <SelectTrigger className="h-8 w-56">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All users</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name} ({u.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[180px]">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Entity type
        </label>
        <Select
          value={entityType}
          onValueChange={(v) => setEntityType(v ?? ALL)}
        >
          <SelectTrigger className="h-8 w-48">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All entities</SelectItem>
            {ENTITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          From
        </label>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-8 w-40"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          To
        </label>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-8 w-40"
        />
      </div>

      <button
        type="button"
        onClick={apply}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Filter className="h-3.5 w-3.5" />
        Filter
      </button>
      {hasAny && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium hover:bg-accent"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
