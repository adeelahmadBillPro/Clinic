import { db } from "@/lib/tenant-db";

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Per-doctor, per-day auto-incrementing token number.
 * Each doctor starts from 1 each day. Emergencies get priority in the queue
 * but still receive a sequential number.
 */
export async function nextTokenNumber(
  clinicId: string,
  doctorId: string,
): Promise<{ tokenNumber: number; displayToken: string }> {
  const t = db(clinicId);
  const today = startOfToday();

  const last = await t.token.findFirst({
    where: { doctorId, issuedAt: { gte: today } },
    orderBy: { tokenNumber: "desc" },
    select: { tokenNumber: true },
  });

  const tokenNumber = (last?.tokenNumber ?? 0) + 1;
  const displayToken = `T-${String(tokenNumber).padStart(3, "0")}`;
  return { tokenNumber, displayToken };
}

export function tokenExpiryFromNow(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}
