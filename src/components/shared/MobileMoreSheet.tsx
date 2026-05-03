"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { motion } from "framer-motion";
import { LogOut, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  navForRole,
  bottomBarForRole,
  type ModuleFlag,
} from "@/lib/permissions";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export function MobileMoreSheet({
  open,
  onOpenChange,
  role,
  clinicName,
  userEmail,
  userName,
  enabledModules,
  signOut,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  role: Role;
  clinicName?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  enabledModules?: Partial<Record<ModuleFlag, boolean>>;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const all = navForRole(role, enabledModules);
  const bottomHrefs = new Set(bottomBarForRole(role).map((i) => i.href));

  const groups = all
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !bottomHrefs.has(i.href)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[85vh] gap-0 overflow-y-auto rounded-t-3xl border-t bg-card p-0"
      >
        <SheetHeader className="sticky top-0 z-10 flex flex-row items-start justify-between gap-3 border-b bg-card/95 px-5 py-3.5 backdrop-blur-md">
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base font-semibold">
              {clinicName ?? "ClinicOS"}
            </SheetTitle>
            {userEmail && (
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {userName ? `${userName} · ` : ""}
                {userEmail}
              </div>
            )}
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="-mr-2 -mt-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        <nav className="px-3 pb-4 pt-3">
          {groups.map((group, gi) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.04, duration: 0.18 }}
              className="mb-4 last:mb-0"
            >
              <div className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium transition active:scale-[0.98]",
                          active
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border/60 bg-background hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            active
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon name={item.icon} className="h-4 w-4" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ))}
        </nav>

        <div className="sticky bottom-0 border-t bg-card/95 p-3 backdrop-blur-md">
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
