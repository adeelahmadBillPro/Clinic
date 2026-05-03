"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { Icon } from "./Icon";
import { MobileMoreSheet } from "./MobileMoreSheet";
import {
  bottomBarForRole,
  navForRole,
  type ModuleFlag,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function MobileBottomNav({
  role,
  clinicName,
  userEmail,
  userName,
  enabledModules,
  signOut,
}: {
  role: Role;
  clinicName?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  enabledModules?: Partial<Record<ModuleFlag, boolean>>;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const items = bottomBarForRole(role).slice(0, 4);
  const [moreOpen, setMoreOpen] = useState(false);

  // Compute whether there are any overflow items at all — if the role has
  // ≤4 nav items total, the "More" tab is wasted space, so hide it.
  const all = navForRole(role, enabledModules);
  const totalCount = all.reduce((s, g) => s + g.items.length, 0);
  const hasOverflow = totalCount > items.length;

  if (items.length === 0 && !hasOverflow) return null;

  // Active when the More sheet is open OR we're on a page that's only
  // reachable through More (so the icon doesn't look "dead" on those pages).
  const bottomHrefs = new Set(items.map((i) => i.href));
  const onOverflowPage =
    !bottomHrefs.has(pathname) &&
    !items.some((i) => pathname.startsWith(i.href + "/"));

  const cols = hasOverflow ? items.length + 1 : items.length;

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/92 backdrop-blur-xl",
          "pb-[max(env(safe-area-inset-bottom),6px)]",
          "lg:hidden",
        )}
        aria-label="Primary navigation"
        style={{ boxShadow: "0 -1px 12px oklch(0 0 0 / 0.04)" }}
      >
        <ul
          className="mx-auto grid max-w-md px-2 pt-1.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <motion.span
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    className="relative flex h-10 w-16 items-center justify-center"
                  >
                    {active && (
                      <motion.span
                        layoutId="bottomnav-pill"
                        className="absolute inset-0 rounded-2xl bg-primary/12"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <Icon
                      name={item.icon}
                      className={cn(
                        "relative h-5 w-5 transition",
                        active && "scale-110",
                      )}
                    />
                  </motion.span>
                  <span
                    className={cn(
                      "relative leading-none tracking-tight transition",
                      active && "font-semibold",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}

          {hasOverflow && (
            <li className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-label="More menu"
                aria-expanded={moreOpen}
                className={cn(
                  "group relative flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition",
                  moreOpen || onOverflowPage
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                <motion.span
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className="relative flex h-10 w-16 items-center justify-center"
                >
                  {(moreOpen || onOverflowPage) && (
                    <motion.span
                      layoutId="bottomnav-pill"
                      className="absolute inset-0 rounded-2xl bg-primary/12"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <MoreHorizontal
                    className={cn(
                      "relative h-5 w-5 transition",
                      (moreOpen || onOverflowPage) && "scale-110",
                    )}
                  />
                </motion.span>
                <span
                  className={cn(
                    "relative leading-none tracking-tight transition",
                    (moreOpen || onOverflowPage) && "font-semibold",
                  )}
                >
                  More
                </span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {hasOverflow && (
        <MobileMoreSheet
          open={moreOpen}
          onOpenChange={setMoreOpen}
          role={role}
          clinicName={clinicName}
          userEmail={userEmail}
          userName={userName}
          enabledModules={enabledModules}
          signOut={signOut}
        />
      )}
    </>
  );
}
