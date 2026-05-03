"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Building2,
  Inbox,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export function AdminMobileMenu({
  email,
  pendingCount,
  signOut,
}: {
  email: string;
  pendingCount: number;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links: NavLink[] = [
    {
      href: "/admin",
      label: "Overview",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      href: "/admin/clinics",
      label: "Clinics",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      href: "/admin/upgrades",
      label: "Upgrade requests",
      icon: <Inbox className="h-4 w-4" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex h-full w-72 flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 border-b px-5 py-4 text-left">
          <SheetTitle className="sr-only">Super Admin navigation</SheetTitle>
          <Logo />
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="h-3 w-3" />
            </div>
            <span className="text-xs font-medium">Super Admin</span>
          </div>
        </SheetHeader>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {links.map((l) => {
              const active =
                pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {l.icon}
                    <span className="flex-1">{l.label}</span>
                    {l.badge !== undefined && (
                      <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                        {l.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t p-3">
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </form>
          <div className="mt-2 px-2 text-[11px] text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{email}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
