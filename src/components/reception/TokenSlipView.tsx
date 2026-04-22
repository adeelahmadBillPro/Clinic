"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

type Props = {
  clinic: { name: string; phone: string | null; address: string | null };
  token: {
    id: string;
    displayToken: string;
    tokenNumber: number;
    chiefComplaint: string | null;
    status: string;
    issuedAt: string;
  };
  patient: { name: string; mrn: string; phone: string } | null;
  doctor: {
    name: string;
    specialization: string;
    roomNumber: string | null;
    consultationFee: number;
  } | null;
  aheadCount: number;
};

export function TokenSlipView(props: Props) {
  const params = useSearchParams();
  const autoPrint = params.get("print") === "1";

  useEffect(() => {
    if (autoPrint) {
      const id = setTimeout(() => window.print(), 500);
      return () => clearTimeout(id);
    }
  }, [autoPrint]);

  function print() {
    window.print();
  }

  const d = new Date(props.token.issuedAt);
  const eta = props.aheadCount * 10; // rough 10 min per patient

  return (
    <div className="mx-auto max-w-lg">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href="/reception"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to OPD
        </Link>
        <div className="flex gap-2">
          <a
            href="/display"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium hover:bg-accent"
          >
            <Monitor className="h-3.5 w-3.5" />
            Open display
          </a>
          <Button onClick={print} size="sm">
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print slip
          </Button>
        </div>
      </div>

      {/* Slip — 80mm receipt width on print */}
      <div className="token-slip mx-auto w-full rounded-xl border-2 border-primary/20 bg-white p-6 text-black shadow-sm print:border-0 print:shadow-none">
        {/* Clinic header */}
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-800">
            {props.clinic.name}
          </div>
          {props.clinic.phone && (
            <div className="text-[10px] text-gray-600">
              Tel: {props.clinic.phone}
            </div>
          )}
          {props.clinic.address && (
            <div className="text-[10px] text-gray-600">
              {props.clinic.address}
            </div>
          )}
        </div>

        <div className="my-4 border-t-2 border-dashed border-gray-300" />

        {/* Token number — big */}
        <div className="text-center">
          <div className="text-[10px] font-medium uppercase tracking-widest text-gray-500">
            Your token
          </div>
          <div className="mt-1 font-mono text-6xl font-bold leading-none tracking-tight text-emerald-700">
            {props.token.displayToken}
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {d.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            · {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>

        <div className="my-4 border-t-2 border-dashed border-gray-300" />

        {/* Patient */}
        {props.patient && (
          <div className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Patient</span>
              <span className="font-semibold">{props.patient.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">MRN</span>
              <span className="font-mono text-xs">{props.patient.mrn}</span>
            </div>
          </div>
        )}

        {props.doctor && (
          <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Doctor</span>
              <span className="font-semibold">Dr. {props.doctor.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Specialty</span>
              <span>{props.doctor.specialization}</span>
            </div>
            {props.doctor.roomNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">Room</span>
                <span className="font-mono font-semibold">
                  {props.doctor.roomNumber}
                </span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t pt-1">
              <span className="text-gray-600">Fee</span>
              <span className="font-semibold">
                ₨ {Math.round(props.doctor.consultationFee).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {props.token.chiefComplaint && (
          <div className="mt-3 text-xs">
            <span className="text-gray-600">Complaint: </span>
            <span>{props.token.chiefComplaint}</span>
          </div>
        )}

        <div className="my-4 border-t-2 border-dashed border-gray-300" />

        {/* Position */}
        <div className="rounded-md bg-amber-50 p-3 text-center text-xs">
          {props.token.status === "WAITING" && props.aheadCount > 0 ? (
            <>
              <div className="font-semibold text-amber-800">
                {props.aheadCount}{" "}
                {props.aheadCount === 1 ? "patient" : "patients"} ahead of you
              </div>
              <div className="mt-0.5 text-amber-700">
                Estimated wait ~ {eta} min
              </div>
            </>
          ) : props.token.status === "WAITING" ? (
            <div className="font-semibold text-emerald-700">
              You&rsquo;re next! Please wait to be called.
            </div>
          ) : (
            <div className="font-semibold">Status: {props.token.status}</div>
          )}
        </div>

        <div className="mt-4 text-center text-[10px] text-gray-500">
          Please keep this slip. Watch the display screen for your turn.
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          .token-slip,
          .token-slip * {
            visibility: visible;
          }
          .token-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 80mm;
            border: 0 !important;
            padding: 4mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
