"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { motion } from "framer-motion";
import { Icon } from "./Icon";
import { bottomBarForRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = bottomBarForRole(role);
  const count = Math.min(items.length, 4);

  if (items.length === 0) return null;

  return (
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
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {items.slice(0, count).map((item) => {
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
      </ul>
    </nav>
  );
}
