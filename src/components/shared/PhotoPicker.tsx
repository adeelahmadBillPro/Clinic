"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PhotoPicker({
  value,
  onChange,
  size = 112,
  shape = "circle",
  label = "Profile photo",
  hint = "PNG, JPG or WEBP · up to 4MB",
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  size?: number;
  shape?: "circle" | "square";
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Upload failed");
        return;
      }
      onChange(body.data.url);
      toast.success("Photo uploaded");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "relative overflow-hidden border bg-muted ring-2 ring-background shadow-sm",
          shape === "circle" ? "rounded-full" : "rounded-xl",
        )}
        style={{ width: size, height: size }}
      >
        {value ? (
          // Plain img — next/image optimizer returns 400 for local uploads
          // in some setups, and avatars don't need on-the-fly optimization.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Profile"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <User className="h-10 w-10" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            {value ? "Change photo" : "Upload photo"}
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={uploading}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
