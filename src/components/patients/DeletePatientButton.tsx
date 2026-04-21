"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeletePatientButton({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function del() {
    if (confirm.trim().toLowerCase() !== "delete") {
      toast.error('Type "delete" to confirm');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Delete failed");
        return;
      }
      if (body.data?.deactivated) {
        toast.success(`${patientName} deactivated (had paid bills)`);
      } else {
        toast.success(`${patientName} deleted`);
      }
      setOpen(false);
      router.replace("/patients");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete patient?
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <div className="font-medium">{patientName}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Removes all tokens, appointments, prescriptions, vitals, and lab orders
            for this patient. If they have paid bills, the record will be
            deactivated instead (bills are kept for audit).
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">
            Type <span className="font-mono font-semibold">delete</span> to
            confirm
          </label>
          <Input
            autoFocus
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1"
          />
        </div>
        <DialogFooter className="sm:justify-stretch">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={del}
            disabled={busy || confirm.trim().toLowerCase() !== "delete"}
            className="flex-1"
          >
            {busy ? (
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
      </DialogContent>
    </Dialog>
  );
}
