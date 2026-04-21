"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const LS_KEY = "clinicos-sidebar-collapsed";

function applyState(collapsed: boolean) {
  const root = document.documentElement;
  root.classList.toggle("sidebar-collapsed", collapsed);
}

export function SidebarCollapseToggle() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY) === "1";
    setCollapsed(stored);
    applyState(stored);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(LS_KEY, next ? "1" : "0");
    applyState(next);
  }

  if (!mounted) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
      title={collapsed ? "Show sidebar" : "Hide sidebar"}
      onClick={toggle}
      className="hidden lg:inline-flex"
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </Button>
  );
}
