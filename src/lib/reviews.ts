import { prisma } from "./prisma";

export type DoctorRating = { avg: number; count: number };

/**
 * Batch-fetch rating summary for many doctors in one query.
 * Returns a Map keyed by doctorId. Doctors with no reviews are absent.
 */
export async function getDoctorRatings(
  clinicId: string,
  doctorIds: string[],
): Promise<Map<string, DoctorRating>> {
  if (doctorIds.length === 0) return new Map();

  const rows = await prisma.review.groupBy({
    by: ["doctorId"],
    where: {
      clinicId,
      doctorId: { in: doctorIds },
      isPublished: true,
    },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const out = new Map<string, DoctorRating>();
  for (const r of rows) {
    out.set(r.doctorId, {
      avg: r._avg.rating ?? 0,
      count: r._count._all,
    });
  }
  return out;
}

export async function getDoctorReviews(
  clinicId: string,
  doctorId: string,
  limit = 20,
) {
  return prisma.review.findMany({
    where: { clinicId, doctorId, isPublished: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      reviewerName: true,
      rating: true,
      comment: true,
      createdAt: true,
    },
  });
}
