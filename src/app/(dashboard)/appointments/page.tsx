import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { AppointmentsBoard } from "@/components/appointments/AppointmentsBoard";

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 14);

  const appts = await t.appointment.findMany({
    where: {
      appointmentDate: { gte: today, lte: weekFromNow },
    },
    orderBy: [{ appointmentDate: "asc" }, { timeSlot: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {appts.length} upcoming in the next 2 weeks.
          </p>
        </div>
        {clinic?.slug && (
          <a
            href={`/book/${clinic.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            Public booking link →
          </a>
        )}
      </div>

      <AppointmentsBoard
        initial={appts.map((a) => ({
          ...a,
          appointmentDate: a.appointmentDate.toISOString(),
          createdAt: a.createdAt.toISOString(),
        }))}
        doctors={doctorList}
      />
    </div>
  );
}
