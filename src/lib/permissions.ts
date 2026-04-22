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

export type ModuleFlag =
  | "pharmacy"
  | "lab"
  | "ipd"
  | "inventory"
  | "analytics";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: Role[];
  /** Optional module flag — link hidden when clinic has disabled this module. */
  module?: ModuleFlag;
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
        label: "OPD",
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
        module: "pharmacy",
      },
      {
        label: "Lab",
        href: "/lab",
        icon: "FlaskConical",
        roles: ["OWNER", "ADMIN", "LAB_TECH", "DOCTOR"],
        module: "lab",
      },
      {
        label: "IPD",
        href: "/ipd",
        icon: "BedDouble",
        roles: ["OWNER", "ADMIN", "NURSE", "DOCTOR"],
        module: "ipd",
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
        module: "inventory",
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: "LineChart",
        roles: ["OWNER", "ADMIN"],
        module: "analytics",
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
      {
        label: "My profile",
        href: "/profile",
        icon: "UserCircle",
        roles: [
          "OWNER",
          "ADMIN",
          "DOCTOR",
          "RECEPTIONIST",
          "NURSE",
          "PHARMACIST",
          "LAB_TECH",
        ],
      },
      {
        label: "Getting started",
        href: "/help",
        icon: "HelpCircle",
        roles: [
          "OWNER",
          "ADMIN",
          "DOCTOR",
          "RECEPTIONIST",
          "NURSE",
          "PHARMACIST",
          "LAB_TECH",
        ],
      },
    ],
  },
];

export const DEFAULT_MODULES: Record<ModuleFlag, boolean> = {
  pharmacy: true,
  lab: true,
  ipd: true,
  inventory: true,
  analytics: true,
};

export function navForRole(
  role: Role,
  enabledModules: Partial<Record<ModuleFlag, boolean>> = DEFAULT_MODULES,
): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((i) => {
      if (!i.roles.includes(role)) return false;
      if (i.module) {
        const on = enabledModules[i.module];
        return on !== false; // default to true when undefined
      }
      return true;
    }),
  })).filter((g) => g.items.length > 0);
}

export function bottomBarForRole(role: Role): NavItem[] {
  // First 4 most useful items per role for mobile
  const perRole: Record<Role, string[]> = {
    SUPER_ADMIN: [],
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
