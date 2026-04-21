import { db } from "@/lib/tenant-db";

/**
 * Generates a per-clinic MRN like "MRN-2026-00042".
 * Rolls year prefix based on current date.
 */
export async function nextMrn(clinicId: string): Promise<string> {
  const t = db(clinicId);
  const year = new Date().getFullYear();
  const prefix = `MRN-${year}-`;

  const last = await t.patient.findFirst({
    where: { mrn: { startsWith: prefix } },
    orderBy: { mrn: "desc" },
    select: { mrn: true },
  });

  let next = 1;
  if (last?.mrn) {
    const match = last.mrn.match(/-(\d+)$/);
    if (match) next = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(next).padStart(5, "0")}`;
}
