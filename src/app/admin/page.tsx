import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Building2, Users, Inbox, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const now = new Date();

  const [
    totalClinics,
    activeClinics,
    trialingClinics,
    pendingRequests,
    subscriptions,
    recentClinics,
    totalUsers,
  ] = await Promise.all([
    prisma.clinic.count(),
    prisma.clinic.count({ where: { isActive: true } }),
    prisma.clinic.count({
      where: { isActive: true, trialEndsAt: { gt: now } },
    }),
    prisma.upgradeRequest.count({ where: { status: "PENDING" } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { planId: true },
    }),
    prisma.clinic.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        isActive: true,
        trialEndsAt: true,
      },
    }),
    prisma.user.count({
      where: { role: { not: "SUPER_ADMIN" }, isActive: true },
    }),
  ]);

  // Compute MRR by joining active subscriptions to their plan monthlyPrice
  const plans = await prisma.plan.findMany({
    select: { id: true, monthlyPrice: true, name: true },
  });
  const planMap = new Map(plans.map((p) => [p.id, p]));
  let mrr = 0;
  const planDistribution = new Map<string, number>();
  for (const s of subscriptions) {
    const p = planMap.get(s.planId);
    if (p) {
      mrr += Number(p.monthlyPrice);
      planDistribution.set(p.name, (planDistribution.get(p.name) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Platform overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything running across all your clinics, at a glance.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total clinics" value={totalClinics} icon={<Building2 />} />
        <Kpi
          label="Active"
          value={activeClinics}
          icon={<TrendingUp />}
          tone="success"
        />
        <Kpi
          label="On trial"
          value={trialingClinics}
          icon={<Sparkles />}
          tone="info"
        />
        <Kpi
          label="Pending upgrades"
          value={pendingRequests}
          icon={<Inbox />}
          tone={pendingRequests > 0 ? "warning" : "default"}
          href="/admin/upgrades"
        />
        <Kpi
          label="MRR (₨)"
          value={`₨ ${Math.round(mrr).toLocaleString()}`}
          icon={<TrendingUp />}
        />
        <Kpi
          label="Staff users"
          value={totalUsers}
          icon={<Users />}
        />
        <Kpi
          label="Suspended"
          value={totalClinics - activeClinics}
          icon={<AlertTriangle />}
          tone={totalClinics - activeClinics > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Latest signups</h2>
            <Link
              href="/admin/clinics"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentClinics.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No clinics yet.
              </div>
            )}
            {recentClinics.map((c) => {
              const isTrial = c.trialEndsAt && c.trialEndsAt > now;
              return (
                <Link
                  key={c.id}
                  href={`/admin/clinics`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition hover:bg-accent/40"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Signed up{" "}
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px]">
                    {!c.isActive ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                        Suspended
                      </span>
                    ) : isTrial ? (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700">
                        Trial
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700">
                        Active
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">Plan distribution</h2>
          {planDistribution.size === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No active paid subscriptions yet.
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from(planDistribution.entries()).map(([name, count]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {count} {count === 1 ? "clinic" : "clinics"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone = "default",
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "info" | "warning" | "danger";
  href?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-accent text-accent-foreground",
    success: "bg-emerald-500/15 text-emerald-700",
    info: "bg-sky-500/15 text-sky-700",
    warning: "bg-amber-500/15 text-amber-700",
    danger: "bg-destructive/15 text-destructive",
  };
  const body = (
    <div className="card-surface flex items-center gap-3 p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:scale-[1.01]">
      {body}
    </Link>
  ) : (
    body
  );
}
