import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { AppointmentsBoard } from "@/components/appointments/AppointmentsBoard";
import { PublicBookingLinkCard } from "@/components/appointments/PublicBookingLinkCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Appointments — ClinicOS" };

export default async function AppointmentsPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "RECEPTIONIST", "DOCTOR"],
    "/appointments",
  );

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { slug: true },
  });

  const t = db(session.user.clinicId);
  const doctors = await t.doctor.findMany();
  const users = await prisma.user.findMany({
    where: { id: { in: doctors.map((d) => d.userId) } },
    select: { id: true, name: true },
  });
  const doctorList = doctors.map((d) => ({
    id: d.id,
    name: users.find((u) => u.id === d.userId)?.name ?? "Doctor",
    specialization: d.specialization,
  }));

  // When a doctor opens this page directly, default the filter + new
  // appointment dropdown to their own profile. Otherwise it shows "All
  // doctors" and the doctor has to manually filter every time.
  const myDoctor = doctors.find((d) => d.userId === session.user.id);
  const currentDoctorId = myDoctor?.id ?? null;

  // For the public booking link card — count how many doctors have a
  // weekly schedule set. Online booking (/book/[slug]) only shows
  // doctors with a schedule, so this is the "real" online-bookable
  // count we surface to staff.
  const doctorsWithSchedule = doctors.filter((d) => {
    const s = (d.schedule ?? {}) as Record<string, unknown>;
    return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].some((k) => {
      const v = s[k];
      return v && typeof v === "object" && v !== null && "start" in v;
    });
  }).length;
  const clinicName =
    (await prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true },
    }))?.name ?? "ClinicOS";

  // Server-render the default view (today → +14d) so the page paints
  // instantly. The client component owns search/filter and refetches via
  // /api/appointments when the user changes anything.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 14);

  const appts = await t.appointment.findMany({
    where: {
      appointmentDate: { gte: today, lte: weekFromNow },
    },
    orderBy: [{ appointmentDate: "asc" }, { timeSlot: "asc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming appointments —{" "}
          <span className="text-foreground/70">
            {appts.length} in the next 2 weeks.
          </span>
        </p>
      </div>

      {clinic?.slug && (
        <PublicBookingLinkCard
          slug={clinic.slug}
          clinicName={clinicName}
          doctorsWithSchedule={doctorsWithSchedule}
          doctorsTotal={doctors.length}
        />
      )}

      <AppointmentsBoard
        initial={appts.map((a) => ({
          ...a,
          appointmentDate: a.appointmentDate.toISOString(),
          createdAt: a.createdAt.toISOString(),
        }))}
        doctors={doctorList}
        currentDoctorId={currentDoctorId}
      />
    </div>
  );
}
