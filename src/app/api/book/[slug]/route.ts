import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { z } from "zod";

const schema = z.object({
  patientName: z.string().trim().min(2).max(150),
  patientPhone: z.string().trim().min(7).max(20),
  doctorId: z.string().min(1),
  appointmentDate: z.string().min(1),
  timeSlot: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      isActive: true,
    },
  });
  if (!clinic || !clinic.isActive) {
    return NextResponse.json(
      { success: false, error: "Clinic not found" },
      { status: 404 },
    );
  }

  const t = db(clinic.id);
  const doctors = await t.doctor.findMany({
    where: { isAvailable: true },
  });
  const users = await prisma.user.findMany({
    where: {
      id: { in: doctors.map((d) => d.userId) },
      isActive: true,
    },
    select: { id: true, name: true },
  });

  const data = {
    clinic: {
      name: clinic.name,
      phone: clinic.phone,
      address: clinic.address,
    },
    doctors: doctors
      .map((d) => {
        const u = users.find((x) => x.id === d.userId);
        return u
          ? {
              id: d.id,
              name: u.name,
              specialization: d.specialization,
              qualification: d.qualification,
              consultationFee: Number(d.consultationFee),
            }
          : null;
      })
      .filter(Boolean),
  };

  return NextResponse.json({ success: true, data });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: { id: true, name: true, isActive: true },
  });
  if (!clinic || !clinic.isActive) {
    return NextResponse.json(
      { success: false, error: "Clinic not found" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const t = db(clinic.id);
  const doctor = await t.doctor.findUnique({
    where: { id: parsed.data.doctorId },
  });
  if (!doctor) {
    return NextResponse.json(
      { success: false, error: "Doctor not found" },
      { status: 404 },
    );
  }

  // Slot sanity + race-free booking
  const apptDay = new Date(parsed.data.appointmentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 14);
  if (apptDay < today) {
    return NextResponse.json(
      { success: false, error: "Cannot book in the past" },
      { status: 400 },
    );
  }
  if (apptDay > maxDate) {
    return NextResponse.json(
      {
        success: false,
        error: "Bookings are limited to 14 days in advance",
      },
      { status: 400 },
    );
  }

  const dayStart = new Date(apptDay);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(apptDay);
  dayEnd.setHours(23, 59, 59, 999);
  const clash = await t.appointment.findFirst({
    where: {
      doctorId: parsed.data.doctorId,
      appointmentDate: { gte: dayStart, lte: dayEnd },
      timeSlot: parsed.data.timeSlot,
      status: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
    },
  });
  if (clash) {
    return NextResponse.json(
      {
        success: false,
        error: "This time slot was just booked by someone else. Please pick another.",
      },
      { status: 409 },
    );
  }

  const appt = await t.appointment.create({
    data: {
      clinicId: clinic.id,
      patientName: parsed.data.patientName,
      patientPhone: parsed.data.patientPhone,
      doctorId: parsed.data.doctorId,
      appointmentDate: new Date(parsed.data.appointmentDate),
      timeSlot: parsed.data.timeSlot,
      type: "FIRST_VISIT",
      status: "SCHEDULED",
      notes: parsed.data.notes ?? null,
      bookedVia: "ONLINE",
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: appt.id,
      confirmation: `APT-${appt.id.slice(-6).toUpperCase()}`,
    },
  });
}
