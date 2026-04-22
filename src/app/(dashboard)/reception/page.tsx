import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { ReceptionScreen } from "@/components/reception/ReceptionScreen";
import { MyDayCard } from "@/components/shared/MyDayCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "OPD — ClinicOS" };

export default async function ReceptionPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const t = db(session.user.clinicId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { slug: true },
  });

  const doctors = await t.doctor.findMany();
  const users = await prisma.user.findMany({
    where: { id: { in: doctors.map((d) => d.userId) }, isActive: true },
    select: { id: true, name: true },
  });

  const queueCounts = await Promise.all(
    doctors.map(async (d) => ({
      id: d.id,
      waiting: await t.token.count({
        where: {
          doctorId: d.id,
          status: "WAITING",
          issuedAt: { gte: today },
        },
      }),
    })),
  );
  const waitById = new Map(queueCounts.map((q) => [q.id, q.waiting]));

  const initialDoctors = doctors
    .map((d) => {
      const user = users.find((u) => u.id === d.userId);
      if (!user) return null;
      return {
        id: d.id,
        name: user.name,
        specialization: d.specialization,
        qualification: d.qualification,
        roomNumber: d.roomNumber,
        consultationFee: Number(d.consultationFee),
        status: d.status,
        isAvailable: d.isAvailable,
        waitingCount: waitById.get(d.id) ?? 0,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    specialization: string;
    qualification: string;
    roomNumber: string | null;
    consultationFee: number;
    status: string;
    isAvailable: boolean;
    waitingCount: number;
  }>;

  return (
    <div className="space-y-5">
      <MyDayCard />
      <ReceptionScreen
        initialDoctors={initialDoctors}
        clinicSlug={clinic?.slug ?? null}
      />
    </div>
  );
}
