import type { Prisma } from "@prisma/client";
import { nextSequence, pad } from "@/lib/counter";

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Per-doctor, per-day auto-incrementing token number. Encodes
 * `kind = "TOKEN:<doctorId>"` and `year = YYYYMMDD` so that the shared
 * Counter table can serve a per-doctor-per-day sequence atomically.
 *
 * The earlier implementation did `findFirst desc + 1` which raced under
 * concurrent check-ins and could emit the same displayToken twice.
 */
export async function nextTokenNumber(
  clinicId: string,
  doctorId: string,
  tx?: Prisma.TransactionClient,
): Promise<{ tokenNumber: number; displayToken: string }> {
  const d = new Date();
  const dayKey =
    d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const tokenNumber = await nextSequence(
    clinicId,
    `TOKEN:${doctorId}`,
    tx,
    dayKey,
  );
  const displayToken = `T-${pad(tokenNumber, 3)}`;
  return { tokenNumber, displayToken };
}

export function tokenExpiryFromNow(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}
