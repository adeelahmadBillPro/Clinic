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

  // Today's status per patient — shows the latest token's status as a
  // chip on the patient card (Waiting / Called / In progress /
  // Completed). Cancelled / Expired are ignored — they didn't happen.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const patientIds = recent.map((r) => r.id);
  const todaysTokens =
    patientIds.length > 0
      ? await t.token.findMany({
          where: {
            patientId: { in: patientIds },
            issuedAt: { gte: todayStart },
            status: { notIn: ["CANCELLED", "EXPIRED"] },
          },
          orderBy: { issuedAt: "desc" },
          select: {
            patientId: true,
            status: true,
            displayToken: true,
          },
        })
      : [];
  const statusByPatient = new Map<
    string,
    { status: string; displayToken: string }
  >();
  for (const tok of todaysTokens) {
    if (!statusByPatient.has(tok.patientId)) {
      statusByPatient.set(tok.patientId, {
        status: tok.status,
        displayToken: tok.displayToken,
      });
    }
  }

  const initialRows = recent.map((r) => {
    const t = statusByPatient.get(r.id);
    return {
      ...r,
      dob: r.dob?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      todayStatus: t?.status ?? null,
      todayToken: t?.displayToken ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search or register patients. Use Enter to move between fields.{" "}
            <span className="text-foreground/70">
              {total.toLocaleString()} registered · {recent.length} shown.
            </span>
          </p>
        </div>
      </div>

      <PatientsClient initial={initialRows} />
    </div>
  );
}
