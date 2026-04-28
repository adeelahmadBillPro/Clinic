import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { DoctorDesk } from "@/components/doctor/DoctorDesk";
import { MyDayCard } from "@/components/shared/MyDayCard";
import { RoleHeader } from "@/components/shared/RoleHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "My queue — ClinicOS" };

export default async function DoctorPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "DOCTOR"],
    "/doctor",
  );

  const t = db(session.user.clinicId);

  // Auto-select the doctor profile that belongs to the logged-in user
  // when one exists. This covers two cases:
  //   - role === DOCTOR: always linked to a Doctor profile
  //   - role === OWNER / ADMIN who also practices: they have their own
  //     Doctor profile and expect to land on their own queue (not the
  //     first doctor in the list). They can still switch via the
  //     dropdown.
  const doctors = await t.doctor.findMany();
  const mine = doctors.find((d) => d.userId === session.user.id);
  const myDoctorId: string | null = mine?.id ?? null;

  return (
    <div className="space-y-5">
      <RoleHeader
        title="My desk"
        subtitle="Your patient queue, consultations and prescriptions."
        userName={session.user.name ?? "there"}
        role={session.user.role}
      />
      <MyDayCard />
      <DoctorDesk
        isAdmin={isAdmin(session.user.role)}
        currentDoctorId={myDoctorId}
        userId={session.user.id}
      />
    </div>
  );
}
