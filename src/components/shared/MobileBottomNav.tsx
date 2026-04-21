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

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/92 pb-[max(env(safe-area-inset-bottom),4px)] backdrop-blur-lg lg:hidden"
      aria-label="Primary navigation"
    >
      <ul className="grid grid-cols-4 px-1">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="bottomnav-active"
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 34,
                    }}
                  />
                )}
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    active && "bg-primary/10",
                  )}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                </motion.span>
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
