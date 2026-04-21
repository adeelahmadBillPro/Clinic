"use client";

import { LogOut, User, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function roleLabel(role: Role) {
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function UserMenu({
  name,
  email,
  role,
  signOut,
}: {
  name: string;
  email: string;
  role: Role;
  signOut: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-10 w-10 items-center justify-center rounded-full outline-none transition hover:ring-2 hover:ring-primary/20 focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95"
        aria-label="Account menu"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1">
        <DropdownMenuLabel className="space-y-1 p-2">
          <div className="text-sm font-semibold leading-none">{name}</div>
          <div className="text-xs font-normal text-muted-foreground leading-tight">
            {email}
          </div>
          <Badge variant="secondary" className="mt-1">
            {roleLabel(role)}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href="/settings/profile"
              className="flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm transition hover:bg-accent hover:text-accent-foreground"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/settings"
              className="flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm transition hover:bg-accent hover:text-accent-foreground"
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-sm font-medium text-destructive transition hover:bg-destructive/10 focus:bg-destructive/10 outline-none"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
