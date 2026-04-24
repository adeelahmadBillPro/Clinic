import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { PatientsClient } from "@/components/patients/PatientsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Patients — ClinicOS" };

export default async function PatientsPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"],
    "/patients",
  );

  const t = db(session.user.clinicId);

  const [recent, total] = await Promise.all([
    t.patient.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        mrn: true,
        name: true,
        phone: true,
        gender: true,
        dob: true,
        bloodGroup: true,
        allergies: true,
        createdAt: true,
      },
    }),
    t.patient.count({ where: { isActive: true } }),
  ]);

  const initialRows = recent.map((r) => ({
    ...r,
    dob: r.dob?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString()} registered ·{" "}
            <span className="text-foreground">{recent.length}</span> shown.
            Search by name, phone, or MRN.
          </p>
        </div>
      </div>

      <PatientsClient initial={initialRows} />
    </div>
  );
}
