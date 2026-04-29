import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { IpdOverview } from "@/components/ipd/IpdOverview";
import { MyDayCard } from "@/components/shared/MyDayCard";
import { RoleHeader } from "@/components/shared/RoleHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "IPD — ClinicOS" };

export default async function IpdPage() {
  // P3-44: role gate. Reception included so they can run admission
  // paperwork (bed assignment, intake notes) — common in real clinics.
  const session = await requireRole(
    ["OWNER", "ADMIN", "NURSE", "DOCTOR", "RECEPTIONIST"],
    "/ipd",
  );

  const t = db(session.user.clinicId);
  const beds = await t.bed.findMany({
    where: { isActive: true },
    orderBy: [{ wardName: "asc" }, { bedNumber: "asc" }],
  });

  const patientIds = beds
    .map((b) => b.currentPatientId)
    .filter((x): x is string => !!x);
  const patients = patientIds.length
    ? await t.patient.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, name: true, mrn: true },
      })
    : [];
  const byId = new Map(patients.map((p) => [p.id, p]));

  const initialBeds = beds.map((b) => ({
    id: b.id,
    bedNumber: b.bedNumber,
    wardName: b.wardName,
    bedType: b.bedType,
    dailyRate: Number(b.dailyRate),
    isOccupied: b.isOccupied,
    currentPatient: b.currentPatientId
      ? byId.get(b.currentPatientId) ?? null
      : null,
  }));

  return (
    <div className="space-y-5">
      <RoleHeader
        title="IPD"
        subtitle="Manage admissions, beds, nursing notes and discharges."
        userName={session.user.name ?? "there"}
        role={session.user.role}
      />
      <MyDayCard />
      <IpdOverview beds={initialBeds} canManageBeds={isAdmin(session.user.role)} />
    </div>
  );
}
