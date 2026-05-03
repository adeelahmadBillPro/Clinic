"use client";

import { useState } from "react";
import {
  Copy,
  ExternalLink,
  Globe,
  Check,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
  clinicName: string;
  doctorsWithSchedule: number;
  doctorsTotal: number;
};

export function PublicBookingLinkCard({
  slug,
  clinicName,
  doctorsWithSchedule,
  doctorsTotal,
}: Props) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/book/${slug}`
      : `/book/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied — paste it anywhere to share");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Long-press the link to copy manually.");
    }
  }

  // wa.me link with the booking URL pre-filled — receptionist clicks,
  // picks the customer, and the link autopopulates the message body.
  const waText = encodeURIComponent(
    `Book your appointment at ${clinicName} online: ${url}`,
  );
  const waUrl = `https://wa.me/?text=${waText}`;

  const noSchedules = doctorsWithSchedule === 0;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              Public booking page
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Share this link so patients can book themselves. Works on any
            phone — no app needed.
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
            <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
              aria-label="Copy link"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              Share on WhatsApp
            </Button>
          </a>
          <a href={`/book/${slug}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open booking page
            </Button>
          </a>
        </div>
      </div>

      {noSchedules && doctorsTotal > 0 && (
        <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-[11px] text-amber-800">
          <span className="font-semibold">Heads-up:</span> none of your{" "}
          {doctorsTotal} doctor{doctorsTotal === 1 ? "" : "s"} have set a
          weekly schedule yet, so the public page will look empty. Each
          doctor needs to open{" "}
          <a href="/profile" className="font-medium text-primary hover:underline">
            My profile
          </a>{" "}
          and set their hours.
        </div>
      )}

      {doctorsWithSchedule > 0 && (
        <div className="mt-3 text-[11px] text-muted-foreground">
          {doctorsWithSchedule} of {doctorsTotal} doctor
          {doctorsTotal === 1 ? "" : "s"} accepting online bookings.
        </div>
      )}
    </div>
  );
}
