"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BedDouble, Plus, Loader2, Bed } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { AdmitDialog } from "./AdmitDialog";
import { DischargeDialog } from "./DischargeDialog";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FieldHelp } from "@/components/shared/FieldHelp";
import { cn } from "@/lib/utils";

type Bed = {
  id: string;
  bedNumber: string;
  wardName: string;
  bedType: string;
  dailyRate: number;
  isOccupied: boolean;
  currentPatient: { id: string; name: string; mrn: string } | null;
};

const TYPE_COLOR: Record<string, string> = {
  GENERAL: "bg-slate-500/10 text-slate-700",
  SEMI_PRIVATE: "bg-sky-500/10 text-sky-700",
  PRIVATE: "bg-violet-500/10 text-violet-700",
  ICU: "bg-destructive/10 text-destructive",
};

export function IpdOverview({
  beds,
  canManageBeds = true,
}: {
  beds: Bed[];
  canManageBeds?: boolean;
}) {
  const router = useRouter();
  const [admitBed, setAdmitBed] = useState<Bed | null>(null);
  const [discharge, setDischarge] = useState<Bed | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bedForm, setBedForm] = useState({
    bedNumber: "",
    wardName: "",
    bedType: "GENERAL" as "GENERAL" | "SEMI_PRIVATE" | "PRIVATE" | "ICU",
    dailyRate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const wards = useMemo(() => {
    const map = new Map<string, Bed[]>();
    for (const b of beds) {
      const arr = map.get(b.wardName) ?? [];
      arr.push(b);
      map.set(b.wardName, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [beds]);

  const occupied = beds.filter((b) => b.isOccupied).length;
  const available = beds.length - occupied;

  async function createBed() {
    if (!bedForm.bedNumber || !bedForm.wardName || !bedForm.dailyRate) {
      toast.error("All fields required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ipd/beds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedNumber: bedForm.bedNumber,
          wardName: bedForm.wardName,
          bedType: bedForm.bedType,
          dailyRate: Number(bedForm.dailyRate),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success("Bed added");
      setAddOpen(false);
      setBedForm({
        bedNumber: "",
        wardName: "",
        bedType: "GENERAL",
        dailyRate: "",
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total beds" value={beds.length} icon="BedDouble" />
        <KpiCard
          label="Occupied"
          value={occupied}
          icon="BedDouble"
          tone={occupied > 0 ? "warning" : "default"}
        />
        <KpiCard label="Available" value={available} icon="BedDouble" tone="success" />
        <KpiCard
          label="Occupancy"
          value={beds.length === 0 ? 0 : Math.round((occupied / beds.length) * 100)}
          format="percent"
          icon="LineChart"
        />
      </div>

      <div className="flex justify-end">
        {canManageBeds && (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add bed
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New bed</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Bed number</Label>
                <Input
                  value={bedForm.bedNumber}
                  onChange={(e) =>
                    setBedForm({ ...bedForm, bedNumber: e.target.value })
                  }
                  className="mt-1"
                  placeholder="B-101"
                />
              </div>
              <div>
                <Label>Ward</Label>
                <Input
                  value={bedForm.wardName}
                  onChange={(e) =>
                    setBedForm({ ...bedForm, wardName: e.target.value })
                  }
                  className="mt-1"
                  placeholder="General Ward A"
                />
              </div>
              <div>
                <Label>
                  Type
                  <FieldHelp>
                    Affects daily rate and patient expectations. ICU implies
                    higher staffing ratio.
                  </FieldHelp>
                </Label>
                <Select
                  value={bedForm.bedType}
                  onValueChange={(v) =>
                    v && setBedForm({ ...bedForm, bedType: v as typeof bedForm.bedType })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="SEMI_PRIVATE">Semi-private</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                    <SelectItem value="ICU">ICU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Daily rate (₨)
                  <FieldHelp>
                    Per-day bed charge. The discharge bill multiplies this
                    by the number of days admitted.
                  </FieldHelp>
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={bedForm.dailyRate}
                  onChange={(e) =>
                    setBedForm({ ...bedForm, dailyRate: e.target.value })
                  }
                  className="mt-1"
                  placeholder="2000"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={createBed} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Adding
                  </>
                ) : (
                  "Add bed"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {beds.length === 0 ? (
        <EmptyState
          icon={Bed}
          title="No bed setup yet"
          description={
            canManageBeds
              ? "Add your first bed to start admitting patients. You can group beds by ward and set daily rates per bed type."
              : "Beds haven't been configured yet. Ask an owner or admin to add beds before admitting patients."
          }
          actionLabel={canManageBeds ? "Add a bed" : undefined}
          onAction={canManageBeds ? () => setAddOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-6">
          {/* Step-by-step guide so a new user understands that clicking a
              bed IS the admission action. Without this banner the page
              looks like a static bed map — staff don't realise it's
              clickable. */}
          <div className="rounded-lg border border-dashed border-primary/25 bg-primary/5 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-primary">
              How to admit a patient:
            </span>{" "}
            <span className="font-medium text-foreground">
              1. Click any green bed
            </span>{" "}
            →{" "}
            <span className="font-medium text-foreground">
              2. Search & pick the patient
            </span>{" "}
            →{" "}
            <span className="font-medium text-foreground">
              3. Pick admitting doctor + diagnosis
            </span>{" "}
            →{" "}
            <span className="font-medium text-foreground">4. Admit</span>.
            Red beds are occupied — click to view chart or discharge.
            Patient must be registered first (use{" "}
            <a
              href="/patients?add=1"
              className="font-medium text-primary hover:underline"
            >
              Patients
            </a>
            ).
          </div>

          {wards.map(([ward, wardBeds]) => (
            <section key={ward}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{ward}</h2>
                <span className="text-xs text-muted-foreground">
                  {wardBeds.filter((b) => b.isOccupied).length}/{wardBeds.length}{" "}
                  occupied
                </span>
              </div>
              <motion.div
                initial="initial"
                animate="animate"
                variants={{
                  animate: { transition: { staggerChildren: 0.02 } },
                }}
                className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
              >
                {wardBeds.map((bed) => (
                  <motion.button
                    key={bed.id}
                    variants={{
                      initial: { opacity: 0, y: 6 },
                      animate: { opacity: 1, y: 0 },
                    }}
                    onClick={async () => {
                      if (!bed.isOccupied) {
                        setAdmitBed(bed);
                        return;
                      }
                      // Resolve the active admission for this bed and navigate
                      try {
                        const res = await fetch(
                          "/api/ipd/admissions?status=ADMITTED",
                        );
                        const body = await res.json();
                        const match = body?.data?.find(
                          (a: { bed: { id: string } | null }) =>
                            a.bed?.id === bed.id,
                        );
                        if (match?.id) {
                          router.push(`/ipd/${match.id}`);
                        } else {
                          setDischarge(bed);
                        }
                      } catch {
                        setDischarge(bed);
                      }
                    }}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition hover:border-primary/40 hover:shadow-sm",
                      bed.isOccupied
                        ? "bg-destructive/5 border-destructive/30"
                        : "bg-emerald-500/5 border-emerald-500/30",
                    )}
                  >
                    <BedDouble
                      className={cn(
                        "h-6 w-6",
                        bed.isOccupied ? "text-destructive" : "text-emerald-600",
                      )}
                    />
                    <div className="font-mono text-sm font-bold">
                      {bed.bedNumber}
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn("text-[9px]", TYPE_COLOR[bed.bedType])}
                    >
                      {bed.bedType.replace("_", " ")}
                    </Badge>
                    <div className="text-[10px] text-muted-foreground">
                      ₨ {Math.round(bed.dailyRate).toLocaleString()}/day
                    </div>
                    {bed.currentPatient && (
                      <div className="mt-0.5 line-clamp-1 w-full truncate text-[10px] font-medium text-destructive">
                        {bed.currentPatient.name}
                      </div>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            </section>
          ))}
        </div>
      )}

      {admitBed && (
        <AdmitDialog
          bed={admitBed}
          onClose={() => setAdmitBed(null)}
          onDone={() => {
            setAdmitBed(null);
            router.refresh();
          }}
        />
      )}
      {discharge && discharge.currentPatient && (
        <DischargeDialog
          bed={discharge}
          onClose={() => setDischarge(null)}
          onDone={() => {
            setDischarge(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
