import type { Prisma } from "@prisma/client";
import { nextSequence, pad } from "@/lib/counter";

/**
 * Generates a per-clinic MRN like "MRN-2026-00042". Uses the shared
 * Counter table so concurrent registrations don't collide.
 */
export async function nextMrn(
  clinicId: string,
  tx?: Prisma.TransactionClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const n = await nextSequence(clinicId, "MRN", tx, year);
  return `MRN-${year}-${pad(n, 5)}`;
}
