import type { Role } from "@prisma/client";

export const ALL_ROLES: Role[] = [
  "OWNER",
  "ADMIN",
  "DOCTOR",
  "RECEPTIONIST",
  "NURSE",
  "PHARMACIST",
  "LAB_TECH",
];

export const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

export function isAdmin(role?: Role | null): boolean {
  return !!role && (role === "OWNER" || role === "ADMIN");
}

export function canAny(role: Role | null | undefined, allowed: Role[]): boolean {
  return !!role && allowed.includes(role);
}

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: Role[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
        roles: ["OWNER", "ADMIN"],
      },
      {
        label: "Reception",
        href: "/reception",
        icon: "CircleUserRound",
        roles: ["OWNER", "ADMIN", "RECEPTIONIST"],
      },
      {
        label: "My Queue",
        href: "/doctor",
        icon: "Stethoscope",
        roles: ["OWNER", "ADMIN", "DOCTOR"],
      },
      {
        label: "Pharmacy",
        href: "/pharmacy",
        icon: "Pill",
        roles: ["OWNER", "ADMIN", "PHARMACIST"],
      },
      {
        label: "Lab",
        href: "/lab",
        icon: "FlaskConical",
        roles: ["OWNER", "ADMIN", "LAB_TECH", "DOCTOR"],
      },
      {
        label: "IPD",
        href: "/ipd",
        icon: "BedDouble",
        roles: ["OWNER", "ADMIN", "NURSE", "DOCTOR"],
      },
    ],
  },
  {
    label: "Records",
    items: [
      {
        label: "Patients",
        href: "/patients",
        icon: "Users",
        roles: ["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"],
      },
      {
        label: "Appointments",
        href: "/appointments",
        icon: "CalendarDays",
        roles: ["OWNER", "ADMIN", "RECEPTIONIST", "DOCTOR"],
      },
      {
        label: "Billing",
        href: "/billing",
        icon: "Receipt",
        roles: ["OWNER", "ADMIN", "RECEPTIONIST", "PHARMACIST"],
      },
    ],
  },
  {
    label: "Back office",
    items: [
      {
        label: "Inventory",
        href: "/inventory",
        icon: "Package",
        roles: ["OWNER", "ADMIN", "PHARMACIST"],
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: "LineChart",
        roles: ["OWNER", "ADMIN"],
      },
      {
        label: "Staff",
        href: "/staff",
        icon: "UserCog",
        roles: ["OWNER", "ADMIN"],
      },
      {
        label: "Settings",
        href: "/settings",
        icon: "Settings",
        roles: ["OWNER", "ADMIN"],
      },
      {
        label: "Subscription",
        href: "/subscription",
        icon: "Sparkles",
        roles: ["OWNER"],
      },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((i) => i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
}

export function bottomBarForRole(role: Role): NavItem[] {
  // First 4 most useful items per role for mobile
  const perRole: Record<Role, string[]> = {
    OWNER: ["/dashboard", "/reception", "/patients", "/billing"],
    ADMIN: ["/dashboard", "/reception", "/patients", "/billing"],
    DOCTOR: ["/doctor", "/patients", "/appointments", "/lab"],
    RECEPTIONIST: ["/reception", "/appointments", "/patients", "/billing"],
    NURSE: ["/ipd", "/patients", "/appointments", "/lab"],
    PHARMACIST: ["/pharmacy", "/inventory", "/billing", "/patients"],
    LAB_TECH: ["/lab", "/patients", "/appointments", "/billing"],
  };
  const wanted = perRole[role];
  const all = NAV.flatMap((g) => g.items);
  return wanted
    .map((href) => all.find((i) => i.href === href))
    .filter((i): i is NavItem => !!i);
}
