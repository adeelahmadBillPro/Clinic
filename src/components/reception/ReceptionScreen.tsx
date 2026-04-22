"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, CirclePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PatientSearch, type PatientHit } from "@/components/patients/PatientSearch";
import { RegisterPatientForm } from "@/components/patients/RegisterPatientForm";
import { IssueTokenCard } from "./IssueTokenCard";
import { TokenBoard } from "./TokenBoard";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  roomNumber: string | null;
  consultationFee: number;
  status: string;
  isAvailable: boolean;
  waitingCount: number;
};

type SelectedPatient = {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  gender?: string;
  allergies?: string[];
};

export function ReceptionScreen({
  initialDoctors,
  clinicSlug,
}: {
  initialDoctors: Doctor[];
  clinicSlug: string | null;
}) {
  const [selected, setSelected] = useState<SelectedPatient | null>(null);
  const [doctors, setDoctors] = useState(initialDoctors);
  const [registerOpen, setRegisterOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const refreshDoctors = useCallback(async () => {
    const res = await fetch("/api/doctors");
    const body = await res.json();
    if (body?.success) setDoctors(body.data);
  }, []);

  // Poll every 15s for doctor queue counts until we wire Socket.io
  useEffect(() => {
    const i = setInterval(refreshDoctors, 15000);
    return () => clearInterval(i);
  }, [refreshDoctors]);

  // Auto-select patient when linked via ?patient=<id>
  useEffect(() => {
    const patientId = searchParams.get("patient");
    if (!patientId) return;
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}`);
        const body = await res.json();
        if (!aborted && body?.success) {
          setSelected({
            id: body.data.id,
            mrn: body.data.mrn,
            name: body.data.name,
            phone: body.data.phone,
            gender: body.data.gender,
            allergies: body.data.allergies ?? [],
          });
          // Strip query param from the URL so refresh doesn't repeat the load
          router.replace("/reception");
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      aborted = true;
    };
  }, [searchParams, router]);

  function onPickExisting(h: PatientHit) {
    setSelected({
      id: h.id,
      mrn: h.mrn,
      name: h.name,
      phone: h.phone,
      gender: h.gender,
      allergies: h.allergies,
    });
  }

  async function handleRegistered(p: {
    id: string;
    mrn: string;
    name: string;
    phone: string;
  }) {
    setRegisterOpen(false);
    if (!p.id) return;
    try {
      const res = await fetch(`/api/patients/${p.id}`);
      const body = await res.json();
      if (body?.success) {
        setSelected({
          id: body.data.id,
          mrn: body.data.mrn,
          name: body.data.name,
          phone: body.data.phone,
          gender: body.data.gender,
          allergies: body.data.allergies ?? [],
        });
        toast.success(`${p.name} registered · ${p.mrn}`);
      }
    } catch {
      toast.success(`${p.name} registered · ${p.mrn}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">OPD</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reception &middot; Register and check in walk-in patients, issue
            tokens, and track the live queue board.
          </p>
        </div>
        {clinicSlug && (
          <a
            href={`/display/${clinicSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium transition hover:bg-accent/60"
          >
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Open display screen
          </a>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
        {/* Left: search / issue */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 text-sm font-semibold">
              1. Find or register patient
            </div>
            <PatientSearch onSelect={onPickExisting} />
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Search by name, phone, or MRN
              </span>
              <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="shrink-0">
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    New patient
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Register new patient</DialogTitle>
                  </DialogHeader>
                  <RegisterPatientForm onCreated={handleRegistered} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <IssueTokenCard
                  patient={selected}
                  doctors={doctors}
                  onClear={() => setSelected(null)}
                  onIssued={() => {
                    setSelected(null);
                    refreshDoctors();
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-dashed bg-card/60 p-6 text-center text-sm text-muted-foreground"
              >
                <CirclePlus className="mx-auto mb-2 h-6 w-6" />
                Pick a patient above (or register a new one) to issue a token.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: token board */}
        <TokenBoard />
      </div>
    </div>
  );
}
