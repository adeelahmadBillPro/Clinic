import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { createPatientSchema } from "@/lib/validations/patient";
import { nextMrn } from "@/lib/mrn";
import { nextTokenNumber, tokenExpiryFromNow } from "@/lib/token";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));

  const t = db(session.user.clinicId);

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { mrn: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const patients = await t.patient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
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
  });

  return NextResponse.json({ success: true, data: patients });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: first?.message ?? "Invalid input",
        field: first?.path.join("."),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const t = db(session.user.clinicId);

  // Duplicate-phone protection — only when a phone is provided + not forced
  if (!data.forceCreate && data.phone) {
    const existing = await t.patient.findFirst({
      where: { phone: data.phone, isActive: true },
      select: {
        id: true,
        mrn: true,
        name: true,
        phone: true,
        gender: true,
      },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          code: "DUPLICATE_PHONE",
          error: `A patient with this phone already exists: ${existing.name} (${existing.mrn}).`,
          match: existing,
        },
        { status: 409 },
      );
    }
  }

  const mrn = await nextMrn(session.user.clinicId);

  const patient = await t.patient.create({
    data: {
      clinicId: session.user.clinicId,
      mrn,
      name: data.name,
      phone: data.phone || "",
      gender: data.gender,
      dob: data.dob ? new Date(data.dob) : null,
      address: data.address || null,
      bloodGroup: data.bloodGroup ? data.bloodGroup : null,
      allergies: data.allergies ?? [],
      chronicConditions: data.chronicConditions ?? [],
      emergencyContact: data.emergencyContact || null,
      emergencyPhone: data.emergencyPhone || null,
    },
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      action: "PATIENT_REGISTERED",
      entityType: "Patient",
      entityId: patient.id,
      details: { mrn: patient.mrn, name: patient.name },
    },
  });

  let token: { id: string; displayToken: string; doctorId: string } | null =
    null;
  let bill: {
    id: string;
    billNumber: string;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    status: string;
  } | null = null;

  if (data.autoIssueToken && data.autoIssueDoctorId) {
    const doctor = await t.doctor.findFirst({
      where: { id: data.autoIssueDoctorId },
    });
    if (doctor) {
      const { tokenNumber, displayToken } = await nextTokenNumber(
        session.user.clinicId,
        doctor.id,
      );
      const created = await t.token.create({
        data: {
          clinicId: session.user.clinicId,
          tokenNumber,
          displayToken,
          patientId: patient.id,
          doctorId: doctor.id,
          type: "OPD",
          chiefComplaint: data.autoIssueChiefComplaint || null,
          status: "WAITING",
          issuedBy: session.user.id,
          expiresAt: tokenExpiryFromNow(),
        },
      });
      token = {
        id: created.id,
        displayToken: created.displayToken,
        doctorId: doctor.id,
      };

      // Create the consultation bill — always tracked, regardless of whether
      // the patient later buys medicines at the clinic pharmacy.
      const fee = Number(doctor.consultationFee);
      if (fee > 0) {
        const year = new Date().getFullYear();
        const last = await t.bill.findFirst({
          where: { billNumber: { startsWith: `BL-${year}-` } },
          orderBy: { billNumber: "desc" },
          select: { billNumber: true },
        });
        let nextNum = 1;
        if (last?.billNumber) {
          const match = last.billNumber.match(/-(\d+)$/);
          if (match) nextNum = parseInt(match[1], 10) + 1;
        }
        const billNumber = `BL-${year}-${String(nextNum).padStart(4, "0")}`;

        const paid = data.feePaidNow ? fee : 0;
        const billRow = await t.bill.create({
          data: {
            clinicId: session.user.clinicId,
            billNumber,
            patientId: patient.id,
            billType: "OPD" as const,
            items: [
              {
                description: `Consultation — Dr. ${doctor.specialization}`,
                qty: 1,
                unitPrice: fee,
                amount: fee,
              },
            ],
            subtotal: fee,
            discount: 0,
            totalAmount: fee,
            paidAmount: paid,
            balance: fee - paid,
            paymentMethod: data.paymentMethod ?? "CASH",
            status:
              paid >= fee ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING",
            collectedBy: session.user.id,
          },
        });
        bill = {
          id: billRow.id,
          billNumber: billRow.billNumber,
          totalAmount: Number(billRow.totalAmount),
          paidAmount: Number(billRow.paidAmount),
          balance: Number(billRow.balance),
          status: billRow.status,
        };
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      id: patient.id,
      mrn: patient.mrn,
      name: patient.name,
      phone: patient.phone,
      token,
      bill,
    },
  });
}
