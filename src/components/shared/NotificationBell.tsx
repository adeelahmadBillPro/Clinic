"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePolling } from "@/lib/hooks/usePolling";
import {
  Bell,
  UserPlus,
  Pill,
  FlaskConical,
  Inbox,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  message: string;
  status: string;
  patientId: string | null;
  createdAt: string;
};

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function iconFor(type: string) {
  if (type === "TOKEN_ASSIGNED" || type === "TOKEN_CALLED") return UserPlus;
  if (type === "PRESCRIPTION_READY") return Pill;
  if (type === "LAB_READY") return FlaskConical;
  return Bell;
}

function humanType(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [bounce, setBounce] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const prevUnread = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const body = await res.json();
      if (!body?.success) return;

      const incoming: Notification[] = body.data.notifications;

      if (initialized.current) {
        for (const n of incoming) {
          if (!seenIds.current.has(n.id) && n.status !== "READ") {
            toast(humanType(n.type), {
              description: n.message,
              duration: 6000,
            });
          }
        }
        if (body.data.unread > prevUnread.current) {
          setBounce(true);
          setTimeout(() => setBounce(false), 1000);
        }
      }

      seenIds.current = new Set(incoming.map((n) => n.id));
      setItems(incoming);
      setUnread(body.data.unread);
      prevUnread.current = body.data.unread;
      initialized.current = true;
    } catch {
      // ignore
    }
  }, []);

  usePolling(load, 15000);

  async function markAllRead() {
    const unreadIds = items
      .filter((n) => n.status !== "READ")
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems((prev) =>
      prev.map((n) =>
        unreadIds.includes(n.id) ? { ...n, status: "READ" } : n,
      ),
    );
    setUnread(0);
    prevUnread.current = 0;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    });
  }

  async function markOne(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n)),
    );
    setUnread((c) => {
      const next = Math.max(0, c - 1);
      prevUnread.current = next;
      return next;
    });
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          // 40x40 hit area on touch screens (closer to Apple HIG 44px)
          // collapses to 32x32 on desktop to match the rest of the toolbar.
          className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-8 sm:w-8"
        >
          <motion.span
            animate={
              bounce
                ? {
                    rotate: [0, -15, 15, -10, 10, -5, 5, 0],
                    transition: { duration: 0.6 },
                  }
                : {}
            }
            className="inline-flex"
          >
            <Bell className="h-4 w-4" />
          </motion.span>
          <AnimatePresence>
            {unread > 0 && (
              <>
                <motion.span
                  key="ping"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive/60"
                  aria-hidden
                />
                <motion.span
                  key="count"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 25,
                  }}
                  className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-background"
                >
                  {unread > 9 ? "9+" : unread}
                </motion.span>
              </>
            )}
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        // Mobile: nearly full viewport width with a small margin so it
        // doesn't kiss the edges. Desktop: fixed 320px popover.
        className="w-[calc(100vw-1rem)] max-w-sm p-0 sm:w-80"
      >
        <div className="flex items-center justify-between border-b px-3.5 py-3 sm:py-2.5">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-[10px] text-muted-foreground">
              {unread === 0 ? "All caught up." : `${unread} unread`}
            </div>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              // Bigger tap target on touch devices.
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-primary transition hover:bg-primary/5 sm:px-1 sm:py-0.5"
            >
              <CheckCheck className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              Mark all read
            </button>
          )}
        </div>
        {/* On mobile cap height by viewport (otherwise long lists hide
            the View queue footer). 60vh works across phone heights. */}
        <div className="max-h-[60vh] overflow-y-auto sm:max-h-[380px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
              <Inbox className="h-6 w-6" />
              <div className="text-xs">You&rsquo;re all caught up.</div>
            </div>
          ) : (
            <motion.ul
              className="divide-y"
              initial="initial"
              animate="animate"
              variants={{
                animate: { transition: { staggerChildren: 0.03 } },
              }}
            >
              {items.map((n) => {
                const Icon = iconFor(n.type);
                const isUnread = n.status !== "READ";
                return (
                  <motion.li
                    key={n.id}
                    variants={{
                      initial: { opacity: 0, y: 6 },
                      animate: { opacity: 1, y: 0 },
                    }}
                  >
                    <button
                      onClick={() => {
                        if (isUnread) markOne(n.id);
                      }}
                      className={cn(
                        // Slightly taller rows on touch screens so the
                        // tap target meets thumb-friendly size.
                        "group flex w-full items-start gap-3 px-3.5 py-3.5 text-left transition active:bg-muted/80 hover:bg-muted/60 sm:py-3",
                        isUnread && "bg-primary/[0.04]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                          isUnread
                            ? "bg-primary/15 text-primary group-hover:bg-primary/25"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-xs leading-snug",
                            isUnread
                              ? "font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {n.message}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {relative(n.createdAt)}
                        </div>
                      </div>
                      {isUnread && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </div>
        <div className="border-t px-3.5 py-2 text-center">
          <Link
            href="/doctor"
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            View queue →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
