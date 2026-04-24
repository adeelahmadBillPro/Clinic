import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { IpdOverview } from "@/components/ipd/IpdOverview";

export const dynamic = "force-dynamic";
export const metadata = { title: "IPD — ClinicOS" };

export default async function IpdPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "NURSE", "DOCTOR"],
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">IPD</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bed grid, admissions, and discharge — consolidated billing on the way
          out.
        </p>
      </div>
      <IpdOverview beds={initialBeds} />
    </div>
  );
}
