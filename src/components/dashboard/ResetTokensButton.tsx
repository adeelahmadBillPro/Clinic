"use client";

import { useState } from "react";
import { RefreshCcw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export function ResetTokensButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/tokens/reset", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed to reset tokens");
        return;
      }
      toast.success(
        `Reset complete — ${body.data?.expired ?? 0} tokens expired.`,
      );
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset tokens
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset all today&rsquo;s tokens?</DialogTitle>
          <DialogDescription>
            This expires every token still in{" "}
            <span className="font-medium text-foreground">WAITING</span>,{" "}
            <span className="font-medium text-foreground">CALLED</span>, or{" "}
            <span className="font-medium text-foreground">IN&nbsp;PROGRESS</span>{" "}
            state today. Completed tokens remain in history.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant="destructive"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                Yes, reset all
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
