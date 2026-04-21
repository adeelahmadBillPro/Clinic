"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { navForRole } from "@/lib/permissions";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export function MobileSidebar({
  role,
  clinicName,
}: {
  role: Role;
  clinicName?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groups = navForRole(role);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo />
          {clinicName && (
            <div className="mt-2 text-xs text-muted-foreground">
              {clinicName}
            </div>
          )}
        </SheetHeader>
        <nav className="px-3 py-4">
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
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        <Icon name={item.icon} className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
