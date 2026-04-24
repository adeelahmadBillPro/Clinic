import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { DoctorDesk } from "@/components/doctor/DoctorDesk";
import { MyDayCard } from "@/components/shared/MyDayCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "My queue — ClinicOS" };

export default async function DoctorPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "DOCTOR"],
    "/doctor",
  );

  const t = db(session.user.clinicId);

  // If the logged-in user is a doctor, we auto-select their profile.
  // If admin, they can pick.
  const doctors = await t.doctor.findMany();
  let myDoctorId: string | null = null;
  if (session.user.role === "DOCTOR") {
    const mine = doctors.find((d) => d.userId === session.user.id);
    myDoctorId = mine?.id ?? null;
  }

  return (
    <div className="space-y-5">
      <MyDayCard />
      <DoctorDesk
        isAdmin={isAdmin(session.user.role)}
        currentDoctorId={myDoctorId}
        userId={session.user.id}
      />
    </div>
  );
}
