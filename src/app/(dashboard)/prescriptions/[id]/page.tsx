import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { PrescriptionPrintView } from "@/components/prescriptions/PrescriptionPrintView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prescription — ClinicOS" };

export default async function PrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // P3-44: role gate. Reception is included so they can reprint a
  // prescription when a patient comes back saying "slip kho gai" — the
  // print view itself is read-only.
  const session = await requireRole(
    ["OWNER", "ADMIN", "DOCTOR", "PHARMACIST", "RECEPTIONIST"],
    "/prescriptions/[id]",
  );

  const t = db(session.user.clinicId);
  const rx = await t.prescription.findUnique({ where: { id } });
  if (!rx) notFound();

  const [clinic, patient, doctor] = await Promise.all([
    prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: {
        name: true,
        address: true,
        phone: true,
        logoUrl: true,
      },
    }),
    t.patient.findUnique({ where: { id: rx.patientId } }),
    t.doctor.findUnique({ where: { id: rx.doctorId } }),
  ]);
  if (!patient || !doctor) notFound();

  const doctorUser = await prisma.user.findUnique({
    where: { id: doctor.userId },
    select: { name: true },
  });

  const age = patient.dob
    ? Math.floor(
        (Date.now() - new Date(patient.dob).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  const medicines = Array.isArray(rx.medicines)
    ? (rx.medicines as Array<{
        name: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        route?: string;
        instructions?: string;
      }>)
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href={`/patients/${patient.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to patient
        </Link>
      </div>

      <PrescriptionPrintView
        clinic={{
          name: clinic?.name ?? "Clinic",
          address: clinic?.address ?? "",
          phone: clinic?.phone ?? "",
          logoUrl: clinic?.logoUrl ?? null,
        }}
        patient={{
          name: patient.name,
          mrn: patient.mrn,
          phone: patient.phone,
          age,
          gender:
            patient.gender === "M"
              ? "Male"
              : patient.gender === "F"
                ? "Female"
                : "Other",
          allergies: patient.allergies,
        }}
        doctor={{
          name: doctorUser?.name ?? "Doctor",
          specialization: doctor.specialization,
          qualification: doctor.qualification,
          roomNumber: doctor.roomNumber,
        }}
        rx={{
          id: rx.id,
          medicines,
          notes: rx.notes,
          createdAt: rx.createdAt.toISOString(),
        }}
      />
    </div>
  );
}
