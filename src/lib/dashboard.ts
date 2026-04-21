import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";

export type DashboardMetrics = {
  patientsToday: number;
  revenueToday: number;
  activeTokens: number;
  doctorsOnDuty: number;
  pendingPharmacyOrders: number;
  lowStockCount: number;
  bedsOccupied: number;
  bedsTotal: number;
};

function startOfDay(d = new Date()) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export async function getDashboardMetrics(
  clinicId: string,
): Promise<DashboardMetrics> {
  const t = db(clinicId);
  const today = startOfDay();

  const [
    patientsToday,
    billsToday,
    activeTokens,
    doctorsOnDuty,
    pendingPharmacyOrders,
    allMeds,
    bedsOccupied,
    bedsTotal,
  ] = await Promise.all([
    t.token.groupBy({
      by: ["patientId"],
      where: { issuedAt: { gte: today } },
    }),
    t.bill.aggregate({
      where: {
        createdAt: { gte: today },
        status: { in: ["PAID", "PARTIAL"] },
      },
      _sum: { paidAmount: true },
    }),
    t.token.count({
      where: {
        status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
        issuedAt: { gte: today },
      },
    }),
    t.doctor.count({ where: { isAvailable: true } }),
    t.pharmacyOrder.count({ where: { status: "PENDING" } }),
    t.medicine.findMany({
      where: { isActive: true },
      select: { stockQty: true, minStockLevel: true },
    }),
    t.bed.count({ where: { isOccupied: true, isActive: true } }),
    t.bed.count({ where: { isActive: true } }),
  ]);

  const lowStockCount = allMeds.filter(
    (m) => Number(m.stockQty) <= Number(m.minStockLevel),
  ).length;

  return {
    patientsToday: patientsToday.length,
    revenueToday: Number(billsToday._sum.paidAmount ?? 0),
    activeTokens,
    doctorsOnDuty,
    pendingPharmacyOrders,
    lowStockCount,
    bedsOccupied,
    bedsTotal,
  };
}

export type ClinicMapDoctor = {
  id: string;
  name: string;
  specialization: string;
  roomNumber: string | null;
  status: string;
  currentToken: string | null;
  currentPatientName: string | null;
  waitingCount: number;
};

export type ClinicMap = {
  doctors: ClinicMapDoctor[];
  receptionCash: number;
  pharmacyPending: number;
  bedsOccupied: number;
  bedsAvailable: number;
};

export async function getClinicMap(clinicId: string): Promise<ClinicMap> {
  const t = db(clinicId);
  const today = startOfDay();

  const doctors = await t.doctor.findMany();

  const doctorDetails = await Promise.all(
    doctors.map(async (doc) => {
      const [user, activeToken, waitingCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: doc.userId },
          select: { name: true },
        }),
        t.token.findFirst({
          where: {
            doctorId: doc.id,
            status: { in: ["CALLED", "IN_PROGRESS"] },
            issuedAt: { gte: today },
          },
          orderBy: { issuedAt: "desc" },
        }),
        t.token.count({
          where: {
            doctorId: doc.id,
            status: "WAITING",
            issuedAt: { gte: today },
          },
        }),
      ]);

      let currentPatientName: string | null = null;
      if (activeToken) {
        const patient = await t.patient.findUnique({
          where: { id: activeToken.patientId },
          select: { name: true },
        });
        currentPatientName = patient?.name ?? null;
      }

      return {
        id: doc.id,
        name: user?.name ?? "Doctor",
        specialization: doc.specialization,
        roomNumber: doc.roomNumber,
        status: doc.status,
        currentToken: activeToken?.displayToken ?? null,
        currentPatientName,
        waitingCount,
      };
    }),
  );

  const [cashRes, pharmacyPending, bedsOccupied, bedsAvailable] =
    await Promise.all([
      t.bill.aggregate({
        where: {
          createdAt: { gte: today },
          status: { in: ["PAID", "PARTIAL"] },
          paymentMethod: "CASH",
        },
        _sum: { paidAmount: true },
      }),
      t.pharmacyOrder.count({ where: { status: "PENDING" } }),
      t.bed.count({ where: { isOccupied: true, isActive: true } }),
      t.bed.count({ where: { isOccupied: false, isActive: true } }),
    ]);

  return {
    doctors: doctorDetails,
    receptionCash: Number(cashRes._sum.paidAmount ?? 0),
    pharmacyPending,
    bedsOccupied,
    bedsAvailable,
  };
}
