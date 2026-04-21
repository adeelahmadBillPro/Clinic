"use client";

import { useEffect, useState } from "react";
import {
  BookmarkPlus,
  Bookmark,
  Trash2,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import type { MedicineItem } from "@/lib/validations/consultation";
import { cn } from "@/lib/utils";

type RxTemplate = {
  id: string;
  name: string;
  items: MedicineItem[];
  createdAt: string;
};

const LS_KEY_PREFIX = "clinicos-rx-templates-";

function loadTemplates(userId: string): RxTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveTemplates(userId: string, templates: RxTemplate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY_PREFIX + userId, JSON.stringify(templates));
}

export function RxTemplatesMenu({
  userId,
  currentItems,
  onApply,
}: {
  userId: string;
  currentItems: MedicineItem[];
  onApply: (items: MedicineItem[]) => void;
}) {
  const [templates, setTemplates] = useState<RxTemplate[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTemplates(loadTemplates(userId));
    setMounted(true);
  }, [userId]);

  function save() {
    const name = templateName.trim();
    if (!name) {
      toast.error("Give the template a name");
      return;
    }
    if (currentItems.length === 0) {
      toast.error("Add at least one medicine first");
      return;
    }
    if (templates.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A template with this name already exists");
      return;
    }
    setSaving(true);
    try {
      const next: RxTemplate[] = [
        ...templates,
        {
          id: `tpl_${Date.now().toString(36)}`,
          name,
          items: currentItems,
          createdAt: new Date().toISOString(),
        },
      ];
      saveTemplates(userId, next);
      setTemplates(next);
      setSaveOpen(false);
      setTemplateName("");
      toast.success(`Template "${name}" saved`);
    } finally {
      setSaving(false);
    }
  }

  function apply(tpl: RxTemplate) {
    onApply(tpl.items);
    toast.success(`Applied "${tpl.name}" — ${tpl.items.length} medicines`);
  }

  function remove(id: string) {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const ok = confirm(`Delete template "${tpl.name}"?`);
    if (!ok) return;
    const next = templates.filter((t) => t.id !== id);
    saveTemplates(userId, next);
    setTemplates(next);
    toast.success("Template deleted");
  }

  if (!mounted) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Saved templates dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:-translate-y-[1px] hover:border-foreground/15 hover:bg-muted hover:shadow-sm",
          )}
        >
          <Bookmark className="h-3 w-3" />
          My templates
          {templates.length > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[9px] font-semibold text-primary">
              {templates.length}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-80 overflow-hidden p-0"
        >
          <div className="border-b px-3.5 py-2.5">
            <div className="text-sm font-semibold">Saved templates</div>
            <div className="text-[10px] text-muted-foreground">
              Click to append. Right-click to delete.
            </div>
          </div>
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 p-6 text-center">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                No templates yet.
              </div>
              <div className="text-[11px] text-muted-foreground">
                Write a prescription then click &ldquo;Save as template&rdquo;.
              </div>
            </div>
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto">
              {templates.map((t) => (
                <li key={t.id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => apply(t)}
                    className="flex-1 px-3.5 py-2.5 text-left hover:bg-accent"
                  >
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                      {t.items.map((m) => m.name).join(" · ")}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {t.items.length}{" "}
                      {t.items.length === 1 ? "medicine" : "medicines"} · saved{" "}
                      {new Date(t.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    aria-label={`Delete ${t.name}`}
                    className="mr-2 rounded p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save current Rx as template */}
      <Dialog
        open={saveOpen}
        onOpenChange={(v) => {
          setSaveOpen(v);
          if (!v) setTemplateName("");
        }}
      >
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => {
            if (currentItems.length === 0) {
              toast.error("Add at least one medicine first");
              return;
            }
            setSaveOpen(true);
          }}
        >
          <BookmarkPlus className="mr-1 h-3 w-3" />
          Save as template
        </Button>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4 text-primary" />
              Save prescription template
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Template name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="e.g. Acid reflux · Standard URI · Diabetes Rx A"
                className="mt-1"
                autoFocus
                maxLength={60}
              />
              <div className="mt-1 text-[10px] text-muted-foreground">
                Tip: include the condition or patient context so you find it
                fast later.
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Will save
              </div>
              <ul className="mt-1.5 space-y-0.5 text-xs">
                {currentItems.map((m, i) => (
                  <li key={i} className="truncate">
                    • {m.name}
                    {m.frequency && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {m.frequency}
                      </span>
                    )}
                    {m.duration && (
                      <span className="text-muted-foreground">
                        {" "}
                        × {m.duration}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={save} disabled={saving || !templateName.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <BookmarkPlus className="mr-1.5 h-3.5 w-3.5" />
                  Save template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
