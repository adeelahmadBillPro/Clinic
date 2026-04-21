import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";

export type AnalyticsRange = { from: Date; to: Date };

export function defaultRange(days = 30): AnalyticsRange {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export async function getRevenueBreakdown(
  clinicId: string,
  range: AnalyticsRange,
) {
  const t = db(clinicId);
  const bills = await t.bill.findMany({
    where: {
      createdAt: { gte: range.from, lte: range.to },
      status: { in: ["PAID", "PARTIAL"] },
    },
    select: { billType: true, paidAmount: true },
  });
  const byType: Record<string, number> = {
    OPD: 0,
    PHARMACY: 0,
    LAB: 0,
    IPD: 0,
  };
  for (const b of bills) {
    const key = b.billType as string;
    byType[key] = (byType[key] ?? 0) + Number(b.paidAmount);
  }
  return Object.entries(byType).map(([type, total]) => ({
    type,
    total,
  }));
}

export async function getDailyPatients(
  clinicId: string,
  range: AnalyticsRange,
) {
  const t = db(clinicId);
  const tokens = await t.token.findMany({
    where: { issuedAt: { gte: range.from, lte: range.to } },
    select: { issuedAt: true, patientId: true },
  });
  // Group by date (per day)
  const byDate = new Map<string, Set<string>>();
  for (const tk of tokens) {
    const d = new Date(tk.issuedAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, new Set());
    byDate.get(key)!.add(tk.patientId);
  }
  // Fill gaps with 0
  const out: Array<{ date: string; patients: number }> = [];
  const cursor = new Date(range.from);
  while (cursor <= range.to) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ date: key, patients: byDate.get(key)?.size ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export async function getDoctorLoad(clinicId: string, range: AnalyticsRange) {
  const t = db(clinicId);
  const consults = await t.consultation.groupBy({
    by: ["doctorId"],
    where: { createdAt: { gte: range.from, lte: range.to } },
    _count: true,
  });
  const doctorIds = consults.map((c) => c.doctorId);
  const doctors = await t.doctor.findMany({
    where: { id: { in: doctorIds } },
  });
  const userIds = doctors.map((d) => d.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const nameByDoctor = new Map(
    doctors.map((d) => [
      d.id,
      users.find((u) => u.id === d.userId)?.name ?? "Doctor",
    ]),
  );
  return consults
    .map((c) => ({
      doctorId: c.doctorId,
      name: nameByDoctor.get(c.doctorId) ?? "Doctor",
      patients: c._count,
    }))
    .sort((a, b) => b.patients - a.patients)
    .slice(0, 15);
}

export async function getPeakHours(clinicId: string, range: AnalyticsRange) {
  const t = db(clinicId);
  const tokens = await t.token.findMany({
    where: { issuedAt: { gte: range.from, lte: range.to } },
    select: { issuedAt: true },
  });
  // 7 × 24 grid (day of week × hour)
  const grid: Array<Array<number>> = Array.from({ length: 7 }, () =>
    Array(24).fill(0),
  );
  for (const tk of tokens) {
    const d = new Date(tk.issuedAt);
    grid[d.getDay()][d.getHours()]++;
  }
  return grid;
}

export async function getTopMedicines(clinicId: string, range: AnalyticsRange) {
  const t = db(clinicId);
  const orders = await t.pharmacyOrder.findMany({
    where: {
      createdAt: { gte: range.from, lte: range.to },
      status: { in: ["DISPENSED", "PARTIAL"] },
    },
    select: { items: true },
  });
  const byName = new Map<string, number>();
  for (const o of orders) {
    const items = (o.items as Array<{ name?: string; dispensedQty?: number; qty?: number }>) ?? [];
    for (const it of items) {
      const qty = Number(it.dispensedQty ?? it.qty ?? 0);
      if (!it.name || qty <= 0) continue;
      byName.set(it.name, (byName.get(it.name) ?? 0) + qty);
    }
  }
  return Array.from(byName.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);
}
