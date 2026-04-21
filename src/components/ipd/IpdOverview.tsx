"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BedDouble, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  activeAdmissions,
}: {
  beds: Bed[];
  activeAdmissions: number;
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
                <Label>Type</Label>
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
                <Label>Daily rate (₨)</Label>
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
      </div>

      {beds.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No beds configured yet. Add your first bed to get started.
        </div>
      ) : (
        <div className="space-y-6">
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
                    onClick={() =>
                      bed.isOccupied ? setDischarge(bed) : setAdmitBed(bed)
                    }
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
