"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Inbox,
  MoreHorizontal,
  LogOut,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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

export function AdminMobileBottomNav({
  email,
  pendingCount,
  signOut,
}: {
  email: string;
  pendingCount: number;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const items: NavLink[] = [
    {
      href: "/admin",
      label: "Overview",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: "/admin/clinics",
      label: "Clinics",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      href: "/admin/upgrades",
      label: "Upgrades",
      icon: <Inbox className="h-5 w-5" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
  ];

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/admin" && pathname.startsWith(href + "/")) ||
    // /admin is special — only mark active when it's exactly the overview
    (href === "/admin" && pathname === "/admin");

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/92 pb-[max(env(safe-area-inset-bottom),6px)] backdrop-blur-xl lg:hidden"
        aria-label="Platform navigation"
        style={{ boxShadow: "0 -1px 12px oklch(0 0 0 / 0.04)" }}
      >
        <ul className="mx-auto grid max-w-md grid-cols-4 px-2 pt-1.5">
          {items.map((item) => {
            const active = isActive(item.href);
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
                        layoutId="adminbottomnav-pill"
                        className="absolute inset-0 rounded-2xl bg-primary/12"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <span
                      className={cn(
                        "relative transition",
                        active && "scale-110",
                      )}
                    >
                      {item.icon}
                    </span>
                    {item.badge !== undefined && (
                      <span className="absolute right-2 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-background">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
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
          <li className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More menu"
              aria-expanded={moreOpen}
              className={cn(
                "group relative flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition",
                moreOpen ? "text-primary" : "text-muted-foreground",
              )}
            >
              <motion.span
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="relative flex h-10 w-16 items-center justify-center"
              >
                {moreOpen && (
                  <motion.span
                    layoutId="adminbottomnav-pill"
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
                    moreOpen && "scale-110",
                  )}
                />
              </motion.span>
              <span
                className={cn(
                  "relative leading-none tracking-tight transition",
                  moreOpen && "font-semibold",
                )}
              >
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[70vh] gap-0 overflow-y-auto rounded-t-3xl border-t bg-card p-0"
        >
          <SheetHeader className="sticky top-0 z-10 flex flex-row items-start justify-between gap-3 border-b bg-card/95 px-5 py-3.5 backdrop-blur-md">
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-2 text-base font-semibold">
                <Logo />
              </SheetTitle>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <ShieldCheck className="h-2.5 w-2.5" />
                </div>
                <span className="text-[11px] font-medium">Super Admin</span>
              </div>
              <div className="mt-1 truncate text-[11px] text-muted-foreground">
                {email}
              </div>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setMoreOpen(false)}
              aria-label="Close"
              className="-mr-2 -mt-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="px-3 pb-4 pt-3">
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
    </>
  );
}
