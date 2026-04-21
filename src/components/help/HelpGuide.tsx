"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Role } from "@prisma/client";
import {
  Sparkles,
  PlayCircle,
  Users,
  Stethoscope,
  CircleUserRound,
  Pill,
  FlaskConical,
  BedDouble,
  Receipt,
  UserCog,
  CalendarDays,
  Package,
  LineChart,
  Settings,
  ArrowRight,
  CheckCircle2,
  Zap,
  BookmarkPlus,
  UserPlus,
  BellRing,
  Printer,
  MessageCircle,
  HelpCircle,
  Keyboard,
  ChevronDown,
  Activity,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Step = {
  title: string;
  body: string;
  href?: string;
  action?: string;
  icon: typeof Users;
};

type Role_ = Role;

const ROLE_FLOWS: Record<
  Role_,
  { label: string; tagline: string; icon: typeof Users; steps: Step[] }
> = {
  OWNER: {
    label: "Owner / Admin",
    tagline: "Set up the clinic and watch everything live.",
    icon: Sparkles,
    steps: [
      {
        icon: UserCog,
        title: "Add your staff",
        body: "Create accounts for every doctor, receptionist, nurse, pharmacist, and lab tech. Doctors get rooms, consultation fees, and revenue share. Everyone else just needs a role.",
        href: "/staff?add=1",
        action: "Go to Staff",
      },
      {
        icon: Settings,
        title: "Configure clinic settings",
        body: "Timezone, language, token-reset time, currency, and your public booking slug. Share /book/your-slug with patients to let them book online.",
        href: "/settings",
        action: "Open Settings",
      },
      {
        icon: BedDouble,
        title: "Set up beds (IPD only)",
        body: "If you run an IPD ward, add beds with ward names and daily rates. Skip this if you only do OPD.",
        href: "/ipd",
        action: "Manage beds",
      },
      {
        icon: Package,
        title: "Seed your medicine inventory",
        body: "Add medicines with stock levels, purchase and sale prices, batch + expiry. Create suppliers, raise purchase orders, receive goods — stock updates automatically.",
        href: "/inventory",
        action: "Go to Inventory",
      },
      {
        icon: LineChart,
        title: "Watch analytics",
        body: "Every consultation, bill, and dispense builds into the analytics dashboard — revenue mix, doctor load, peak hours, top medicines.",
        href: "/analytics",
        action: "Open Analytics",
      },
    ],
  },
  ADMIN: {
    label: "Admin",
    tagline: "Same powers as the Owner — manage everything.",
    icon: Sparkles,
    steps: [
      {
        icon: UserCog,
        title: "Manage staff",
        body: "Add, edit, deactivate staff. Toggle on-duty status for doctors. Change their fees anytime.",
        href: "/staff",
        action: "Staff",
      },
      {
        icon: Package,
        title: "Keep inventory healthy",
        body: "Watch low-stock alerts, receive PO goods, track expiry. Low-stock KPI shakes when items need reordering.",
        href: "/inventory",
        action: "Inventory",
      },
      {
        icon: LineChart,
        title: "Monitor analytics + audit",
        body: "Revenue breakdown, doctor productivity, peak hours. The audit log tracks every staff action (tokens issued, bills paid, etc).",
        href: "/analytics",
        action: "Analytics",
      },
    ],
  },
  DOCTOR: {
    label: "Doctor",
    tagline: "See patients faster with digital vitals, SOAP, and instant prescriptions.",
    icon: Stethoscope,
    steps: [
      {
        icon: Activity,
        title: "Set your status",
        body: "Start of day: flip to Available. Going on a break? ON_BREAK. Done for the day? OFF_DUTY. Reception sees this instantly and won't assign you patients.",
        href: "/doctor",
        action: "Open queue",
      },
      {
        icon: BellRing,
        title: "Wait for the notification bell",
        body: "When reception issues a token to you, you get a bell notification + toast. Click the bell top-right to see the assignment.",
      },
      {
        icon: Users,
        title: "Call next patient",
        body: 'Click "Call next" to call the first waiting patient. An automated WhatsApp goes out to them. Their token turns blue (Called).',
      },
      {
        icon: Stethoscope,
        title: "Consult with the 4-tab panel",
        body: "Vitals (BMI auto-calcs), SOAP notes, Diagnosis (ICD-10 search), Prescription. The allergy banner shouts if the patient is allergic to something in your Rx.",
      },
      {
        icon: Pill,
        title: "Write the prescription",
        body: "Search inventory, pick templates (Flu, HTN, Diabetes, Antibiotics), or type manually. Set dose/frequency/duration/route with pill selectors. Save your common Rx as named templates for next time.",
      },
      {
        icon: BookmarkPlus,
        title: "Save your own Rx templates",
        body: 'After you build a prescription, click "Save as template" — name it and it appears under "My templates" for one-click re-use on similar patients.',
      },
      {
        icon: ArrowRight,
        title: "Refer to another doctor",
        body: 'Need a colleague\'s opinion? Click "Refer to doctor" — a new token is created in their queue with a "Referred from" tag, and they get notified.',
      },
      {
        icon: CheckCircle2,
        title: "Complete consultation",
        body: "Saves vitals + consultation + prescription + marks token Done. The prescription automatically lands at the pharmacy counter with the medicines and quantities.",
      },
    ],
  },
  RECEPTIONIST: {
    label: "Receptionist",
    tagline: "Handle the front-desk rush like a pro.",
    icon: CircleUserRound,
    steps: [
      {
        icon: UserPlus,
        title: "Register walk-in patients",
        body: "Name + phone + gender is the minimum. System auto-generates an MRN and checks for duplicates on phone. Age auto-calculates from DOB.",
        href: "/reception",
        action: "Open Reception",
      },
      {
        icon: Zap,
        title: "Issue a token",
        body: "Pick patient, pick doctor (greyed out if they're off duty), set visit type (OPD or Emergency for priority), add chief complaint, collect the fee. A printable slip + WhatsApp link appears.",
      },
      {
        icon: CalendarDays,
        title: "Handle appointments",
        body: "Book in /appointments. If someone booked online (/book/[slug]), you'll see them under today's schedule — click Check in, pick an existing patient record or register on the fly, and a token is created.",
        href: "/appointments",
        action: "View appointments",
      },
      {
        icon: Receipt,
        title: "Collect payments",
        body: "Every token auto-creates an OPD bill. Bills can be paid immediately or later (partial payment supported). Click any bill to print the receipt or WhatsApp it.",
        href: "/billing",
        action: "Billing",
      },
      {
        icon: CircleUserRound,
        title: "End-of-shift cash handover",
        body: "Submit declared cash at end of shift. System compares to what the database says you collected — any difference > ₨1 is flagged for owner review.",
        href: "/billing/shift",
        action: "Cash shift",
      },
    ],
  },
  PHARMACIST: {
    label: "Pharmacist",
    tagline: "Dispense faster with auto-checked stock.",
    icon: Pill,
    steps: [
      {
        icon: BellRing,
        title: "Watch the prescription queue",
        body: "The moment a doctor clicks Complete, their prescription lands here as a Pending order. Auto-refreshes every 10 seconds.",
        href: "/pharmacy",
        action: "Open Pharmacy",
      },
      {
        icon: Pill,
        title: "Dispense",
        body: "Click any order. System shows stock vs requested for every medicine — green if enough, amber if short, red if out. Partial dispense is supported.",
      },
      {
        icon: Receipt,
        title: "Collect payment + print receipt",
        body: "Set the payment method, enter amount received, hit Dispense & generate receipt. Stock decrements automatically + pharmacy bill is created.",
      },
      {
        icon: Package,
        title: "Inventory awareness",
        body: "Low-stock items show a red badge on the medicine list. Expiring-within-30-days items show a warning. Tell admin to raise a purchase order before you run out.",
        href: "/inventory",
        action: "Inventory",
      },
    ],
  },
  NURSE: {
    label: "Nurse",
    tagline: "Keep inpatients safe and records clean.",
    icon: BedDouble,
    steps: [
      {
        icon: BedDouble,
        title: "Bed grid is your home page",
        body: "See every ward at a glance — green = available, red = occupied. Click an occupied bed to see the patient and discharge when ready.",
        href: "/ipd",
        action: "Open IPD",
      },
      {
        icon: UserPlus,
        title: "Admit a patient",
        body: "Click any available bed → pick patient → attending doctor → admission diagnosis. Bed auto-marks occupied, admission number generated.",
      },
      {
        icon: CheckCircle2,
        title: "Discharge",
        body: "Click an occupied bed → Discharge. Add discharge diagnosis + notes. A consolidated bill is auto-generated from (days × bed rate) + linked pharmacy orders + lab orders. Bed auto-releases.",
      },
      {
        icon: Users,
        title: "Patient records",
        body: "Visit any patient's EMR to see their vitals, past consultations, active prescriptions, and open bills.",
        href: "/patients",
        action: "Patients",
      },
    ],
  },
  LAB_TECH: {
    label: "Lab Technician",
    tagline: "Process orders accurately, flag abnormals automatically.",
    icon: FlaskConical,
    steps: [
      {
        icon: FlaskConical,
        title: "See incoming lab orders",
        body: "Auto-refreshes every 12 seconds. Orders start as ORDERED, then you mark them SAMPLE_COLLECTED, then IN_PROGRESS, then COMPLETED.",
        href: "/lab",
        action: "Open Lab",
      },
      {
        icon: Activity,
        title: "Enter results",
        body: "For every test parameter, type the value. If it's outside the normal range (e.g. CBC Hb < 12), the field auto-flags red with an H/L marker.",
      },
      {
        icon: Printer,
        title: "Generate report",
        body: 'Click "Save & complete" → print the lab report (clinic header + parameters + results + normal range + flags). Share via WhatsApp directly to patient.',
      },
    ],
  },
};

const KEYBOARD_TIPS = [
  {
    key: "Enter",
    where: "Any single-line input (search, template name, etc)",
    does: "Submits the form / confirms the action",
  },
  {
    key: "Esc",
    where: "Any open dialog or dropdown",
    does: "Closes it",
  },
  {
    key: "Tab",
    where: "Forms",
    does: "Moves to next field — use it instead of clicking",
  },
];

const COMMON_ISSUES = [
  {
    q: "Patient says they're already registered but search is blank",
    a: "Try searching by phone number — MRN numbers can be hard to remember. Or check for typos in the name.",
  },
  {
    q: "Doctor is on duty but receptionist can't assign a token",
    a: "The doctor may have toggled to ON_BREAK or BUSY — ask them to go back to AVAILABLE in the Doctor view or via the sidebar status switcher.",
  },
  {
    q: "Dispense shows out of stock but we have the medicine",
    a: "Stock in the system is per-batch. Go to Inventory → click the medicine → Stock adjustment → enter the quantity + reason. This creates a StockMovement audit record.",
  },
  {
    q: "Bill is marked PENDING but patient already paid",
    a: "Open the bill → Record payment → enter the amount and method. The bill status updates to PAID or PARTIAL depending on the amount.",
  },
  {
    q: "Trial is ending — will I lose my data?",
    a: "Your data stays for 30 days after trial ends. Upgrade anytime and everything resumes. Before that, use Settings → Data export to download all your data as CSV.",
  },
];

export function HelpGuide({
  role,
  name,
}: {
  role: Role_;
  name: string;
}) {
  const [selectedRole, setSelectedRole] = useState<Role_>(role);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const flow = ROLE_FLOWS[selectedRole];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl auth-hero-bg p-8 text-white"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px]"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium ring-1 ring-inset ring-white/20">
            <Sparkles className="h-3 w-3" />
            Getting started
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome to ClinicOS{name ? `, ${name.split(" ").slice(-1)[0]}` : ""}
            .
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
            A short guided tour so you can start running your clinic with
            confidence. Pick your role below — every step is clickable.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants(),
                "bg-white text-primary hover:bg-white/90",
              )}
            >
              <ArrowRight className="mr-1.5 h-4 w-4" />
              Skip to dashboard
            </Link>
            <a
              href="#flows"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-white/30 bg-white/10 text-white hover:bg-white/20",
              )}
            >
              <PlayCircle className="mr-1.5 h-4 w-4" />
              Start the tour
            </a>
          </div>
        </div>
      </motion.div>

      {/* Role picker */}
      <section id="flows">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Pick your role</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each role has its own daily flow. Start with yours — you can browse
            others too.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(ROLE_FLOWS) as Role_[])
            .filter((r) => r !== "ADMIN") // merged with OWNER for clarity
            .map((r) => {
              const f = ROLE_FLOWS[r];
              const Icon = f.icon;
              const active = selectedRole === r;
              return (
                <motion.button
                  key={r}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedRole(r)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition",
                    active
                      ? "border-primary/50 bg-accent/60 shadow-sm"
                      : "bg-card hover:border-primary/30 hover:bg-accent/40",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{f.label}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {f.tagline}
                    </div>
                  </div>
                  {active && (
                    <motion.div
                      layoutId="role-pick-indicator"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Your current view
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
        </div>
      </section>

      {/* Steps timeline */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <flow.icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{flow.label} flow</h2>
            <p className="text-sm text-muted-foreground">{flow.tagline}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.ol
            key={selectedRole}
            initial="hidden"
            animate="show"
            variants={{
              show: { transition: { staggerChildren: 0.06 } },
            }}
            className="relative space-y-3"
          >
            {/* vertical connector line */}
            <div
              aria-hidden
              className="absolute left-[19px] top-5 bottom-5 w-px bg-border"
            />

            {flow.steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.li
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                  className="relative flex gap-4"
                >
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 rounded-xl border bg-card p-4 transition hover:border-primary/30 hover:shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold">{s.title}</h3>
                          {s.href && (
                            <Link
                              href={s.href}
                              className={cn(
                                buttonVariants({
                                  size: "xs",
                                  variant: "outline",
                                }),
                              )}
                            >
                              {s.action ?? "Open"}
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {s.body}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        </AnimatePresence>
      </section>

      {/* Common flows — cross-role */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Common end-to-end flows</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                Walk-in patient, paid consultation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ol className="list-inside list-decimal space-y-1.5">
                <li>
                  <span className="font-medium text-foreground">
                    Reception
                  </span>{" "}
                  registers the patient (MRN auto-generated)
                </li>
                <li>
                  Picks doctor, enters complaint, collects fee →{" "}
                  <span className="font-mono text-xs">T-00X</span> token
                  printed + WhatsApp sent
                </li>
                <li>
                  <span className="font-medium text-foreground">Doctor</span>{" "}
                  calls next → consultation with vitals/SOAP/diagnosis/Rx →
                  Complete
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Pharmacy
                  </span>{" "}
                  sees Rx instantly → dispenses → receipt printed
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-primary" />
                Online booking → arrival
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ol className="list-inside list-decimal space-y-1.5">
                <li>
                  Patient books at{" "}
                  <span className="font-mono text-xs">/book/your-slug</span>
                </li>
                <li>
                  Reception sees them under today&rsquo;s appointments
                </li>
                <li>
                  Patient arrives → reception clicks{" "}
                  <span className="font-medium text-foreground">
                    Check in
                  </span>{" "}
                  → dialog opens to search/register patient record
                </li>
                <li>
                  Token auto-created, appointment marked CHECKED_IN, flows
                  like a walk-in from here
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BedDouble className="h-4 w-4 text-primary" />
                IPD admission → discharge
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ol className="list-inside list-decimal space-y-1.5">
                <li>
                  Nurse admits patient on a bed → admission number assigned
                </li>
                <li>
                  Linked pharmacy orders + lab orders accumulate during stay
                </li>
                <li>
                  On discharge, one click generates a consolidated bill —
                  (days × bed rate) + pharmacy + lab + any procedures
                </li>
                <li>Bed auto-releases, patient EMR keeps full history</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="h-4 w-4 text-primary" />
                Lab order with abnormal flag
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ol className="list-inside list-decimal space-y-1.5">
                <li>
                  Doctor (or reception) orders tests from the catalog
                  (CBC/LFT/RFT/etc)
                </li>
                <li>Lab tech collects sample → marks SAMPLE_COLLECTED</li>
                <li>
                  Enters results → any value outside the normal range
                  auto-flags red (H/L)
                </li>
                <li>
                  Prints the report with clinic letterhead or shares via
                  WhatsApp
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick navigation */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Every screen at a glance</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/dashboard", label: "Dashboard", icon: Sparkles },
            { href: "/reception", label: "Reception", icon: CircleUserRound },
            { href: "/doctor", label: "Doctor queue", icon: Stethoscope },
            { href: "/pharmacy", label: "Pharmacy", icon: Pill },
            { href: "/lab", label: "Lab", icon: FlaskConical },
            { href: "/ipd", label: "IPD", icon: BedDouble },
            { href: "/patients", label: "Patients", icon: Users },
            { href: "/appointments", label: "Appointments", icon: CalendarDays },
            { href: "/billing", label: "Billing", icon: Receipt },
            { href: "/inventory", label: "Inventory", icon: Package },
            { href: "/analytics", label: "Analytics", icon: LineChart },
            { href: "/staff", label: "Staff", icon: UserCog },
            { href: "/settings", label: "Settings", icon: Settings },
          ].map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="group flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-sm transition hover:-translate-y-[1px] hover:border-primary/40 hover:bg-accent hover:shadow-sm"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="flex-1 font-medium">{l.label}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Printing & sharing */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Print & WhatsApp</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Printer className="h-4 w-4 text-primary" />
                Printing
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Every token slip, prescription, bill, and lab report has a{" "}
              <span className="font-medium text-foreground">Print</span>{" "}
              button that opens a clean printable page. Works with both A4
              laser printers and 80mm thermal receipt printers.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              The{" "}
              <span className="font-medium text-foreground">WhatsApp</span>{" "}
              button opens wa.me with the token/receipt message pre-filled —
              works from any staff phone. Automated notifications (token
              called, lab ready) require Twilio credentials in your{" "}
              <Link href="/settings" className="text-primary hover:underline">
                Settings
              </Link>
              .
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Keyboard tips */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Keyboard className="h-5 w-5 text-primary" />
          Keyboard shortcuts
        </h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          {KEYBOARD_TIPS.map((t, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-4 px-4 py-3",
                i < KEYBOARD_TIPS.length - 1 && "border-b",
              )}
            >
              <kbd className="rounded-md border bg-muted px-2 py-0.5 text-[11px] font-mono font-semibold">
                {t.key}
              </kbd>
              <div className="flex-1 text-sm">
                <div className="text-muted-foreground">{t.where}</div>
                <div className="mt-0.5 font-medium">{t.does}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <HelpCircle className="h-5 w-5 text-primary" />
          Quick answers
        </h2>
        <div className="divide-y rounded-xl border bg-card">
          {COMMON_ISSUES.map((f, i) => {
            const expanded = openFaq === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(expanded ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-accent/60"
                >
                  <span className="text-sm font-medium">{f.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                        {f.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center"
      >
        <h3 className="text-xl font-semibold tracking-tight">
          Ready to start?
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Jump to the dashboard — everything is wired up and you can start
          using it immediately.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className={cn(buttonVariants())}>
            <ArrowRight className="mr-1.5 h-4 w-4" />
            Go to dashboard
          </Link>
          <Link
            href="/staff?add=1"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add your first doctor
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
