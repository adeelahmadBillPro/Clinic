import { prisma } from "@/lib/prisma";

export type PlanFeatures = {
  pharmacy: boolean;
  inventory: boolean;
  ipd: boolean;
  lab: boolean;
  whatsapp: boolean;
  analytics: "basic" | "standard" | "full";
  branches: number;
  auditDays: number;
};

export type PlanInfo = {
  name: string;
  features: PlanFeatures;
  maxDoctors: number;
  maxPatients: number;
  monthlyPrice: number;
};

export type ClinicAccess = {
  clinicId: string;
  planName: string;
  planFeatures: PlanFeatures;
  maxDoctors: number;
  maxPatients: number;
  onTrial: boolean;
  trialEndsAt: Date | null;
  subscriptionStatus: string | null;
};

export async function getClinicAccess(
  clinicId: string,
): Promise<ClinicAccess | null> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
  });
  if (!clinic) return null;
  const plan = await prisma.plan.findUnique({ where: { id: clinic.planId } });
  const subscription = await prisma.subscription.findUnique({
    where: { clinicId },
  });

  const onTrial =
    !!clinic.trialEndsAt && clinic.trialEndsAt.getTime() > Date.now();

  return {
    clinicId,
    planName: plan?.name ?? "BASIC",
    planFeatures: (plan?.features as PlanFeatures | undefined) ?? {
      pharmacy: false,
      inventory: false,
      ipd: false,
      lab: false,
      whatsapp: false,
      analytics: "basic",
      branches: 1,
      auditDays: 0,
    },
    maxDoctors: plan?.maxDoctors ?? 1,
    maxPatients: plan?.maxPatients ?? 2000,
    onTrial,
    trialEndsAt: clinic.trialEndsAt,
    subscriptionStatus: subscription?.status ?? null,
  };
}

export function canAccess(access: ClinicAccess, feature: keyof PlanFeatures): boolean {
  // During trial, everything is unlocked (prompt behavior).
  if (access.onTrial) return true;
  const value = access.planFeatures[feature];
  if (typeof value === "boolean") return value;
  return !!value;
}

/**
 * True if the subscription is active OR the trial is still live.
 */
export function isEntitled(access: ClinicAccess): boolean {
  if (access.onTrial) return true;
  const ok =
    access.subscriptionStatus === "active" ||
    access.subscriptionStatus === "trialing";
  return ok;
}
