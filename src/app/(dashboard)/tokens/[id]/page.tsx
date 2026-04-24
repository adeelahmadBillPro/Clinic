import { notFound } from "next/navigation";
import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { TokenSlipView } from "@/components/reception/TokenSlipView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Token slip — ClinicOS" };

export default async function TokenSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"],
    "/tokens/[id]",
  );

  const t = db(session.user.clinicId);
  const token = await t.token.findUnique({ where: { id } });
  if (!token) notFound();

  const [patient, doctor, clinic, aheadCount] = await Promise.all([
    t.patient.findUnique({ where: { id: token.patientId } }),
    t.doctor.findUnique({ where: { id: token.doctorId } }),
    prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true, phone: true, address: true },
    }),
    t.token.count({
      where: {
        doctorId: token.doctorId,
        status: "WAITING",
        tokenNumber: { lt: token.tokenNumber },
        issuedAt: { gte: startOfDay(token.issuedAt) },
      },
    }),
  ]);

  const doctorUser = doctor
    ? await prisma.user.findUnique({
        where: { id: doctor.userId },
        select: { name: true },
      })
    : null;

  return (
    <TokenSlipView
      clinic={{
        name: clinic?.name ?? "Clinic",
        phone: clinic?.phone ?? null,
        address: clinic?.address ?? null,
      }}
      token={{
        id: token.id,
        displayToken: token.displayToken,
        tokenNumber: token.tokenNumber,
        chiefComplaint: token.chiefComplaint,
        status: token.status,
        issuedAt: token.issuedAt.toISOString(),
      }}
      patient={
        patient
          ? {
              name: patient.name,
              mrn: patient.mrn,
              phone: patient.phone,
            }
          : null
      }
      doctor={
        doctor
          ? {
              name: doctorUser?.name ?? "Doctor",
              specialization: doctor.specialization,
              roomNumber: doctor.roomNumber,
              consultationFee: Number(doctor.consultationFee),
            }
          : null
      }
      aheadCount={aheadCount}
    />
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
