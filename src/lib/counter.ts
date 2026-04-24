import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Atomic per-(clinic, kind, year) sequence. Replaces the prior pattern of
 * reading the latest row with findFirst + desc + parsing the digits and
 * adding 1, which races under concurrent requests and can hand out the
 * same number to two transactions.
 *
 * Usage:
 *   const n = await nextSequence(clinicId, "BILL");
 *   const billNumber = `BL-${new Date().getFullYear()}-${pad(n, 4)}`;
 *
 * Pass a `tx` when calling inside an existing transaction so the counter
 * increment participates in the same commit.
 */
export async function nextSequence(
  clinicId: string,
  kind: string,
  tx?: Prisma.TransactionClient,
  year: number = new Date().getFullYear(),
): Promise<number> {
  const client = tx ?? prisma;
  // Upsert then increment: Postgres executes the INSERT ... ON CONFLICT
  // DO UPDATE atomically, so even under race we return a unique value.
  const row = await client.counter.upsert({
    where: { clinicId_kind_year: { clinicId, kind, year } },
    create: { clinicId, kind, year, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  });
  return row.value;
}

export function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}
