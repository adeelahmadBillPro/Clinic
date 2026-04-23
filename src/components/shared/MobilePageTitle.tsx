"use client";

import { usePathname } from "next/navigation";

const TITLES: Array<{ match: RegExp; title: string }> = [
  { match: /^\/dashboard$/, title: "Dashboard" },
  { match: /^\/reception$/, title: "OPD" },
  { match: /^\/doctor$/, title: "My Queue" },
  { match: /^\/pharmacy$/, title: "Pharmacy" },
  { match: /^\/lab$/, title: "Lab" },
  { match: /^\/ipd\/.+/, title: "Admission" },
  { match: /^\/ipd$/, title: "IPD" },
  { match: /^\/patients\/.+/, title: "Patient" },
  { match: /^\/patients$/, title: "Patients" },
  { match: /^\/appointments$/, title: "Appointments" },
  { match: /^\/billing\/shift$/, title: "Cash shift" },
  { match: /^\/billing\/new$/, title: "New bill" },
  { match: /^\/billing\/.+/, title: "Bill" },
  { match: /^\/billing$/, title: "Billing" },
  { match: /^\/prescriptions\/.+/, title: "Prescription" },
  { match: /^\/tokens\/.+/, title: "Token slip" },
  { match: /^\/inventory\/purchase-orders\/.+/, title: "Purchase order" },
  { match: /^\/inventory\/purchase-orders$/, title: "Purchase orders" },
  { match: /^\/inventory\/suppliers$/, title: "Suppliers" },
  { match: /^\/inventory$/, title: "Inventory" },
  { match: /^\/analytics$/, title: "Analytics" },
  { match: /^\/staff$/, title: "Staff" },
  { match: /^\/settings\/audit-log$/, title: "Audit log" },
  { match: /^\/settings$/, title: "Settings" },
  { match: /^\/subscription$/, title: "Subscription" },
  { match: /^\/profile$/, title: "My profile" },
  { match: /^\/help$/, title: "Help" },
  { match: /^\/admin\/clinics$/, title: "Clinics" },
  { match: /^\/admin\/upgrades$/, title: "Upgrade requests" },
  { match: /^\/admin$/, title: "Super admin" },
];

export function MobilePageTitle() {
  const pathname = usePathname();
  const hit = TITLES.find((t) => t.match.test(pathname));
  return (
    <div className="text-base font-semibold tracking-tight">
      {hit?.title ?? "ClinicOS"}
    </div>
  );
}
