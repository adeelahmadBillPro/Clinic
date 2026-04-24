import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import {
  PrescriptionPdf,
  type PrescriptionPdfData,
  type PrescriptionMedicine,
} from "@/lib/pdf/PrescriptionPdf";

/**
 * GET /api/prescriptions/[id]/pdf → streams an A4 prescription PDF.
 * Gated to anyone in the clinic — a dispensing pharmacist reads it, a
 * doctor re-prints, an admin audits. Finer role checks happen at the
 * page level.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const t = db(session.user.clinicId);
  const rx = await t.prescription.findUnique({ where: { id } });
  if (!rx) {
    return NextResponse.json(
      { success: false, error: "Prescription not found" },
      { status: 404 },
    );
  }

  const [clinic, patient, doctor] = await Promise.all([
    prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true, address: true, phone: true },
    }),
    t.patient.findUnique({ where: { id: rx.patientId } }),
    t.doctor.findUnique({ where: { id: rx.doctorId } }),
  ]);
  if (!patient || !doctor) {
    return NextResponse.json(
      { success: false, error: "Linked records missing" },
      { status: 404 },
    );
  }

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

  const data: PrescriptionPdfData = {
    id: rx.id,
    createdAt: rx.createdAt.toISOString(),
    medicines: Array.isArray(rx.medicines)
      ? (rx.medicines as PrescriptionMedicine[])
      : [],
    notes: rx.notes,
    clinic: {
      name: clinic?.name ?? "Clinic",
      address: clinic?.address ?? null,
      phone: clinic?.phone ?? null,
    },
    patient: {
      name: patient.name,
      mrn: patient.mrn,
      age,
      gender:
        patient.gender === "M"
          ? "Male"
          : patient.gender === "F"
            ? "Female"
            : "Other",
      allergies: patient.allergies,
    },
    doctor: {
      name: doctorUser?.name ?? "Doctor",
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      roomNumber: doctor.roomNumber,
    },
  };

  const stream = await renderToStream(<PrescriptionPdf data={data} />);
  const webStream = nodeToWebStream(stream);

  const filename = `Rx-${patient.mrn}-${rx.createdAt.toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

type NodeReadable = {
  on(event: "data", cb: (chunk: Buffer) => void): unknown;
  on(event: "end", cb: () => void): unknown;
  on(event: "error", cb: (err: Error) => void): unknown;
};

function nodeToWebStream(node: NodeReadable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      node.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      node.on("end", () => controller.close());
      node.on("error", (err: Error) => controller.error(err));
    },
  });
}
