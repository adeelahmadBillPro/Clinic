"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { navForRole, type ModuleFlag } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function Sidebar({
  role,
  clinicName,
  userSlot,
  enabledModules,
}: {
  role: Role;
  clinicName?: string;
  userSlot?: ReactNode;
  enabledModules?: Partial<Record<ModuleFlag, boolean>>;
}) {
  const pathname = usePathname();
  const groups = navForRole(role, enabledModules);

  return (
    <aside
      data-sidebar="main"
      className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh lg:max-h-dvh"
    >
      <div className="flex h-16 items-center border-b px-5">
        <Link href="/dashboard" aria-label="ClinicOS">
          <Logo />
        </Link>
      </div>

      {clinicName && (
        <div className="border-b px-5 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Clinic
          </div>
          <div className="mt-0.5 truncate text-sm font-medium">
            {clinicName}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4 min-h-0">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 rounded-md bg-sidebar-accent"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 34,
                          }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2.5">
                        <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {userSlot}
    </aside>
  );
}
