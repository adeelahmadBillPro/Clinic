"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { cn } from "@/lib/utils";

export function ReviewForm({
  confirmation,
  appointmentDate,
  defaultName,
  defaultPhone,
  existing,
}: {
  confirmation: string;
  appointmentDate: string;
  defaultName: string;
  defaultPhone: string;
  existing: { id: string; rating: number; comment: string | null } | null;
}) {
  const [rating, setRating] = useState<number>(existing?.rating ?? 0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState<string>(existing?.comment ?? "");
  const [reviewerName, setReviewerName] = useState<string>(defaultName);
  const [phone, setPhone] = useState<string>(defaultPhone);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<boolean>(!!existing);

  const tooEarly =
    new Date(appointmentDate).setHours(0, 0, 0, 0) >
    new Date().setHours(0, 0, 0, 0);

  if (done || existing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-surface flex flex-col items-center gap-3 p-10 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold">Thanks for your feedback!</h2>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-5 w-5",
                i < (existing?.rating ?? rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30",
              )}
            />
          ))}
        </div>
        {(existing?.comment ?? comment) && (
          <p className="max-w-md text-sm text-muted-foreground">
            &ldquo;{existing?.comment ?? comment}&rdquo;
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Your review helps other patients find the right doctor.
        </p>
      </motion.div>
    );
  }

  async function submit() {
    if (rating < 1) {
      toast.error("Pick a star rating");
      return;
    }
    if (!reviewerName.trim()) {
      toast.error("Enter your name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation,
          rating,
          comment,
          reviewerName,
          reviewerPhone: phone,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not submit");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card-surface space-y-4 p-6">
      {tooEarly && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800">
          Your appointment is scheduled for{" "}
          {new Date(appointmentDate).toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          . You can come back and review after your visit.
        </div>
      )}

      <div>
        <Label>Your rating</Label>
        <div
          className="mt-2 flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const val = i + 1;
            const active = (hover || rating) >= val;
            return (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHover(val)}
                onClick={() => setRating(val)}
                className="rounded p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Rate ${val} star${val > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition",
                    active
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40",
                  )}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="ml-2 text-sm font-medium">
              {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Your name</Label>
          <Input
            className="mt-1"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
          />
        </div>
        <div>
          <Label>Phone (optional)</Label>
          <div className="mt-1">
            <PhoneInput
              value={phone}
              onChange={(v) => setPhone(v)}
              placeholder="300 1234567"
            />
          </div>
        </div>
      </div>

      <div>
        <Label>Your experience (optional)</Label>
        <Textarea
          className="mt-1 min-h-[96px]"
          maxLength={600}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What went well? Anything that could be better?"
        />
        <div className="mt-1 flex justify-end text-[11px] text-muted-foreground">
          {comment.length}/600
        </div>
      </div>

      <Button
        size="lg"
        className="w-full h-11"
        onClick={submit}
        disabled={submitting || tooEarly}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit review"
        )}
      </Button>
    </div>
  );
}
