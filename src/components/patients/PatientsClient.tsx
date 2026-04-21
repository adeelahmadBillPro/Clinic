"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { UserPlus, Search, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RegisterPatientForm } from "./RegisterPatientForm";

type Row = {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  gender: string;
  dob: string | null;
  bloodGroup: string | null;
  allergies: string[];
  createdAt: string;
};

function ageFromDob(dob: string | null) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return years;
}

export function PatientsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>(initial);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setRows(initial);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/patients?q=${encodeURIComponent(q)}&limit=50`,
        );
        const body = await res.json();
        if (body?.success) {
          setRows(
            (body.data as Row[]).map((p) => ({
              ...p,
              dob: p.dob,
              createdAt: p.createdAt,
            })),
          );
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [q, initial]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9 pr-9"
            placeholder="Search by name, phone, or MRN..."
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              New patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register a new patient</DialogTitle>
            </DialogHeader>
            <RegisterPatientForm
              onCreated={(p) => {
                setOpen(false);
                router.refresh();
                if (p.id) router.push(`/patients/${p.id}`);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No patients match &ldquo;{q}&rdquo;. Try a different search or
          register a new patient.
        </div>
      ) : (
        <motion.ul
          initial="initial"
          animate="animate"
          variants={{
            animate: { transition: { staggerChildren: 0.03 } },
          }}
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {rows.map((p) => {
            const age = ageFromDob(p.dob);
            return (
              <motion.li
                key={p.id}
                variants={{
                  initial: { opacity: 0, y: 6 },
                  animate: { opacity: 1, y: 0 },
                }}
              >
                <Link
                  href={`/patients/${p.id}`}
                  className="group block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium">
                        {p.name}
                        {p.allergies.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-destructive/10 text-[10px] text-destructive"
                          >
                            allergy
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {p.mrn} · {p.phone}
                      </div>
                    </div>
                    {p.bloodGroup && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {p.bloodGroup}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "Other"}</span>
                    {age !== null && <span>· {age} yrs</span>}
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}
