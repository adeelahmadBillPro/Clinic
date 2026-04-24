"use client";

import { Printer, Share2, Copy, CheckCircle2, Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Medicine = {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  instructions?: string;
};

type Props = {
  clinic: {
    name: string;
    address: string;
    phone: string;
    logoUrl: string | null;
  };
  patient: {
    name: string;
    mrn: string;
    phone: string;
    age: number | null;
    gender: string;
    allergies: string[];
  };
  doctor: {
    name: string;
    specialization: string;
    qualification: string;
    roomNumber: string | null;
  };
  rx: {
    id: string;
    medicines: Medicine[];
    notes: string | null;
    createdAt: string;
  };
};

function rxTextSummary(p: Props): string {
  const d = new Date(p.rx.createdAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const lines: string[] = [];
  lines.push(`*${p.clinic.name}* — Prescription`);
  lines.push(`Patient: ${p.patient.name} (${p.patient.mrn})`);
  lines.push(`Doctor: Dr. ${p.doctor.name} · ${p.doctor.specialization}`);
  lines.push(`Date: ${d}`);
  lines.push("");
  p.rx.medicines.forEach((m, i) => {
    const bits = [m.dosage, m.frequency, m.duration, m.route]
      .filter(Boolean)
      .join(" · ");
    lines.push(`${i + 1}. ${m.name}${bits ? " — " + bits : ""}`);
    if (m.instructions) lines.push(`   (${m.instructions})`);
  });
  if (p.rx.notes) {
    lines.push("");
    lines.push(`Notes: ${p.rx.notes}`);
  }
  return lines.join("\n");
}

export function PrescriptionPrintView(props: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  async function download() {
    // Server-side render via /api/prescriptions/[id]/pdf — see BillDetail
    // for the rationale on moving off client-side html2pdf.
    setDownloading(true);
    try {
      const res = await fetch(`/api/prescriptions/${props.rx.id}/pdf`);
      if (!res.ok) throw new Error("bad status");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = `Rx-${props.patient.mrn}-${new Date(
        props.rx.createdAt,
      )
        .toISOString()
        .slice(0, 10)}.pdf`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Prescription PDF downloaded");
    } catch {
      toast.error("Could not generate PDF");
    } finally {
      setDownloading(false);
    }
  }

  function print() {
    window.print();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(rxTextSummary(props));
      setCopied(true);
      toast.success("Prescription copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  function whatsapp() {
    const phone = props.patient.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(rxTextSummary(props));
    const url = phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const d = new Date(props.rx.createdAt);

  return (
    <div>
      {/* Action bar — hidden on print */}
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <Button onClick={print}>
          <Printer className="mr-1.5 h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" onClick={download} disabled={downloading}>
          {downloading ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Preparing PDF...
            </>
          ) : (
            <>
              <Download className="mr-1.5 h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
        <Button variant="outline" onClick={copy}>
          {copied ? (
            <>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-4 w-4" />
              Copy text
            </>
          )}
        </Button>
        <Button variant="outline" onClick={whatsapp}>
          <Share2 className="mr-1.5 h-4 w-4" />
          Share on WhatsApp
        </Button>
      </div>

      {/* Printable sheet */}
      <div
        ref={sheetRef}
        className="rx-sheet rounded-xl border bg-white p-8 text-black shadow-sm print:border-0 print:p-0 print:shadow-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-4">
          <div>
            <div className="text-2xl font-bold tracking-tight text-emerald-800">
              {props.clinic.name}
            </div>
            {props.clinic.address && (
              <div className="mt-0.5 text-xs text-gray-600">
                {props.clinic.address}
              </div>
            )}
            {props.clinic.phone && (
              <div className="text-xs text-gray-600">
                Tel: {props.clinic.phone}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">Dr. {props.doctor.name}</div>
            <div className="text-xs text-gray-600">
              {props.doctor.specialization}
            </div>
            <div className="text-[11px] text-gray-600">
              {props.doctor.qualification}
            </div>
            {props.doctor.roomNumber && (
              <div className="text-[11px] text-gray-600">
                Room {props.doctor.roomNumber}
              </div>
            )}
          </div>
        </div>

        {/* Patient info */}
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-md bg-emerald-50 p-3 text-xs">
          <div>
            <span className="text-gray-600">Patient</span>
            <div className="font-semibold text-sm text-black">
              {props.patient.name}
            </div>
          </div>
          <div>
            <span className="text-gray-600">MRN</span>
            <div className="font-mono font-semibold text-black">
              {props.patient.mrn}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Age / Sex</span>
            <div className="font-semibold text-black">
              {props.patient.age !== null ? `${props.patient.age} yrs` : "—"}
              {" · "}
              {props.patient.gender}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Date</span>
            <div className="font-semibold text-black">
              {d.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {props.patient.allergies.length > 0 && (
          <div className="mt-3 rounded-md border-l-4 border-red-500 bg-red-50 p-2 text-xs">
            <span className="font-semibold text-red-700">Allergies: </span>
            <span className="text-red-700">
              {props.patient.allergies.join(", ")}
            </span>
          </div>
        )}

        {/* Rx symbol + medicines */}
        <div className="mt-6 flex gap-6">
          <div className="font-serif text-6xl leading-none text-emerald-800">
            ℞
          </div>
          <div className="flex-1">
            <ol className="space-y-3">
              {props.rx.medicines.map((m, i) => {
                const schedule = [
                  m.dosage,
                  m.frequency,
                  m.duration,
                  m.route,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li
                    key={i}
                    className="border-b border-gray-200 pb-2 last:border-0"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-emerald-800">
                        {i + 1}.
                      </span>
                      <span className="text-base font-semibold">
                        {m.name}
                      </span>
                    </div>
                    {schedule && (
                      <div className="mt-0.5 text-sm text-gray-700">
                        {schedule}
                      </div>
                    )}
                    {m.instructions && (
                      <div className="mt-0.5 text-xs italic text-gray-600">
                        {m.instructions}
                      </div>
                    )}
                  </li>
                );
              })}
              {props.rx.medicines.length === 0 && (
                <li className="text-sm italic text-gray-500">
                  No medicines on this prescription.
                </li>
              )}
            </ol>

            {props.rx.notes && (
              <div className="mt-4 border-t pt-3 text-sm">
                <div className="mb-1 text-xs font-semibold text-gray-600">
                  Notes / Advice
                </div>
                <div className="whitespace-pre-wrap text-gray-800">
                  {props.rx.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Signature block */}
        <div className="mt-10 flex items-end justify-between border-t pt-4 text-xs">
          <div className="text-gray-500">
            Prescription ID: <span className="font-mono">{props.rx.id}</span>
          </div>
          <div className="text-right">
            <div className="mb-0.5 h-8 w-40 border-b-2 border-gray-300" />
            <div className="font-semibold">Dr. {props.doctor.name}</div>
            <div className="text-[10px] text-gray-600">
              {props.doctor.qualification}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .rx-sheet {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
