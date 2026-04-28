import { NextResponse } from "next/server";
import { db } from "@/lib/tenant-db";
import { requireApiRole } from "@/lib/api-guards";

/**
 * GET /api/staff/next-room → suggest the next free `R-NNN` room for a
 * new doctor. Looks at existing doctors in the clinic, finds the highest
 * `R-NNN` integer, returns +1. Falls back to R-101 if nothing matches.
 *
 * Admin-only — same gate as the staff add form.
 */
export async function GET() {
  const gate = await requireApiRole(["OWNER", "ADMIN"]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const t = db(session.user.clinicId);
  const doctors = await t.doctor.findMany({
    select: { roomNumber: true },
  });

  // Parse anything matching `R-<number>` (case-insensitive); ignore custom
  // formats like "OPD-3" or "ICU-A". Worst case: clinic uses non-R-NNN
  // rooms and we suggest R-101 — admin can just type their own.
  let max = 100; // start at 100 so the first suggestion is R-101
  for (const d of doctors) {
    if (!d.roomNumber) continue;
    const m = d.roomNumber.match(/^R-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }

  const suggestion = `R-${max + 1}`;
  return NextResponse.json({
    success: true,
    data: { suggestion },
  });
}
