import Link from "next/link";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Users,
  Receipt,
  Pill,
  ArrowRight,
  Clock,
  Activity,
} from "lucide-react";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function TodayPanel({ clinicId }: { clinicId: string }) {
  const t = db(clinicId);

  const [appts, latestPatients, pendingBills, pendingRx] = await Promise.all([
    t.appointment.findMany({
      where: {
        appointmentDate: { gte: startOfToday(), lte: endOfToday() },
        status: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
      },
      orderBy: { timeSlot: "asc" },
      take: 6,
    }),
    t.patient.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, mrn: true, createdAt: true },
    }),
    t.bill.count({ where: { status: { in: ["PENDING", "PARTIAL"] } } }),
    t.pharmacyOrder.count({ where: { status: "PENDING" } }),
  ]);

  const doctorIds = Array.from(new Set(appts.map((a) => a.doctorId)));
  const doctors = await t.doctor.findMany({
    where: { id: { in: doctorIds } },
  });
  const userIds = doctors.map((d) => d.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const doctorNameById = new Map(
    doctors.map((d) => [
      d.id,
      users.find((u) => u.id === d.userId)?.name ?? "Doctor",
    ]),
  );

  const STATUS_TONE: Record<string, string> = {
    SCHEDULED: "bg-amber-500/10 text-amber-700",
    CONFIRMED: "bg-sky-500/10 text-sky-700",
    CHECKED_IN: "bg-emerald-500/10 text-emerald-700",
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      {/* Today's schedule */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Today&rsquo;s schedule
            </CardTitle>
            <Link
              href="/appointments"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {appts.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No appointments scheduled today.
              <div className="mt-2">
                <Link
                  href="/appointments"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Book an appointment
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {appts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5"
                >
                  <span className="flex h-9 w-14 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono text-xs font-bold">
                      {a.timeSlot}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {a.patientName}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {doctorNameById.get(a.doctorId) ?? "Doctor"}
                      {a.bookedVia === "ONLINE" && " · online booking"}
                    </div>
                  </div>
                  <Badge
                    className={cn("text-[10px]", STATUS_TONE[a.status])}
                    variant="secondary"
                  >
                    {a.status.replace("_", " ").toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick links stack */}
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {[
              {
                href: "/reception",
                label: "Issue a token",
                icon: Users,
                note: "Walk-in check-in",
              },
              {
                href: "/billing/new",
                label: "Create a bill",
                icon: Receipt,
                note: "Manual billing",
              },
              {
                href: "/pharmacy",
                label: "Dispense prescriptions",
                icon: Pill,
                note: `${pendingRx} pending`,
              },
              {
                href: "/billing",
                label: "Collect payments",
                icon: Receipt,
                note: `${pendingBills} unpaid`,
              },
            ].map((q, i) => {
              const Icon = q.icon;
              return (
                <Link
                  key={i}
                  href={q.href}
                  className="group flex items-center gap-3 rounded-lg border bg-background px-3 py-2 transition hover:-translate-y-[1px] hover:border-primary/40 hover:bg-accent hover:shadow-sm"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{q.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {q.note}
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Newest patients
              </CardTitle>
              <Link
                href="/patients"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {latestPatients.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No patients yet.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {latestPatients.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/patients/${p.id}`}
                      className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm transition hover:bg-accent"
                    >
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {p.mrn}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
