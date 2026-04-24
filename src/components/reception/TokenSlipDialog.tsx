"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Printer, MessageCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/Logo";
import { whatsappLinkForPhone, buildTokenSlipText } from "@/lib/whatsapp";
import { toast } from "sonner";

type Slip = {
  displayToken: string;
  clinicName?: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  issuedAt: string;
  expiresAt: string;
};

export function TokenSlipDialog({
  slip,
  onClose,
}: {
  slip: Slip;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${slip.displayToken}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
            .slip { border: 1px dashed #888; padding: 20px; border-radius: 12px; }
            .brand { display:flex; align-items:center; gap:8px; font-weight:700; color:#0F6E56; }
            .token { font-size: 48px; font-weight: 800; letter-spacing: 1px; text-align:center; margin: 16px 0; color:#0F6E56; }
            .row { display:flex; justify-content:space-between; margin: 6px 0; font-size:13px; }
            .label { color:#6b7280; }
            hr { border: 0; border-top: 1px dashed #ccc; margin: 12px 0; }
            .center { text-align:center; font-size:12px; color:#6b7280; }
            @media print { body { padding: 0 } }
          </style>
        </head>
        <body onload="window.print(); setTimeout(()=>window.close(), 300)">
          ${node.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
  }

  // PHI in wa.me `?text=` leaks through browser history and wa.me's
  // redirector. Keep the message on the clipboard and open a link with
  // the phone number only — the user pastes on the WhatsApp side.
  const waUrl = whatsappLinkForPhone(slip.patientPhone);
  async function handleWhatsApp(e: React.MouseEvent<HTMLAnchorElement>) {
    try {
      await navigator.clipboard.writeText(buildTokenSlipText(slip));
      toast.success("Slip copied. Paste it into WhatsApp.");
    } catch {
      // Clipboard can fail in non-secure contexts; let the link still open.
      e.preventDefault();
      toast.error("Couldn't copy — copy the printed slip manually.");
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" /> Token issued
            </span>
          </DialogTitle>
        </DialogHeader>

        <motion.div
          ref={printRef}
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="slip mx-auto w-full max-w-[320px] rounded-xl border-2 border-dashed p-5"
        >
          <div className="brand flex items-center gap-2">
            <LogoMark className="h-5 w-5" />
            <span className="font-bold text-primary">
              {slip.clinicName ?? "ClinicOS"}
            </span>
          </div>
          <div className="token my-3 text-center font-mono text-5xl font-extrabold tracking-tight text-primary">
            {slip.displayToken}
          </div>
          <div className="space-y-1 text-sm">
            <div className="row flex justify-between">
              <span className="label text-muted-foreground">Patient</span>
              <span className="font-medium">{slip.patientName}</span>
            </div>
            <div className="row flex justify-between">
              <span className="label text-muted-foreground">Doctor</span>
              <span className="font-medium">{slip.doctorName}</span>
            </div>
            <div className="row flex justify-between">
              <span className="label text-muted-foreground">Issued</span>
              <span>{new Date(slip.issuedAt).toLocaleString()}</span>
            </div>
            <div className="row flex justify-between">
              <span className="label text-muted-foreground">Valid until</span>
              <span>{new Date(slip.expiresAt).toLocaleString()}</span>
            </div>
          </div>
          <hr />
          <p className="center text-center text-xs text-muted-foreground">
            Please wait for your number to be called.
          </p>
        </motion.div>

        <DialogFooter className="sm:justify-stretch">
          <Button variant="outline" onClick={handlePrint} className="flex-1">
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsApp}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Copy + WhatsApp
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
