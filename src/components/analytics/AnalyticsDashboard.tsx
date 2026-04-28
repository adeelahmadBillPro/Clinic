"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { BarChart as BarChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";

const COLORS = [
  "oklch(0.46 0.09 168)",
  "oklch(0.60 0.13 210)",
  "oklch(0.70 0.14 60)",
  "oklch(0.62 0.17 15)",
];

function money(n: number) {
  return `₨ ${Math.round(n).toLocaleString()}`;
}

export function AnalyticsDashboard({
  revenue,
  daily,
  doctors,
  heatmap,
  topMeds,
}: {
  revenue: Array<{ type: string; total: number }>;
  daily: Array<{ date: string; patients: number }>;
  doctors: Array<{ doctorId: string; name: string; patients: number }>;
  heatmap: number[][];
  topMeds: Array<{ name: string; qty: number }>;
}) {
  const totalRevenue = revenue.reduce((s, r) => s + r.total, 0);
  const totalPatients = daily.reduce((s, d) => s + d.patients, 0);
  const max = Math.max(1, ...heatmap.flat());
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // No activity at all in the last 30 days — show a friendly empty state
  // before the (otherwise blank) charts.
  if (totalRevenue === 0 && totalPatients === 0 && doctors.length === 0) {
    return (
      <EmptyState
        icon={BarChartIcon}
        title="Not enough data yet"
        description="You need at least a few visits, prescriptions, or bills before charts will populate. Charts cover the last 30 days."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-5"
        >
          <div className="text-sm font-semibold">Revenue breakdown</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {money(totalRevenue)} collected · last 30 days
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenue.filter((r) => r.total > 0)}
                  dataKey="total"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={84}
                  paddingAngle={2}
                >
                  {revenue.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => money(Number(v))}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border bg-card p-5"
        >
          <div className="text-sm font-semibold">Daily patients</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Unique patients per day
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  stroke="currentColor"
                  opacity={0.6}
                  fontSize={11}
                />
                <YAxis
                  stroke="currentColor"
                  opacity={0.6}
                  fontSize={11}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="patients"
                  stroke={COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-5"
        >
          <div className="text-sm font-semibold">Doctor load</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Consultations per doctor · last 30 days
          </div>
          <div className="mt-4 h-72">
            {doctors.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={doctors}
                  layout="vertical"
                  margin={{ left: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" stroke="currentColor" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    stroke="currentColor"
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="patients"
                    fill={COLORS[0]}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-5"
        >
          <div className="text-sm font-semibold">Peak hours</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Tokens issued · day-of-week × hour
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  <th className="p-1 text-left text-muted-foreground" />
                  {HOURS.map((h) => (
                    <th
                      key={h}
                      className="p-0.5 text-center text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.map((row, dayIdx) => (
                  <tr key={dayIdx}>
                    <td className="pr-1.5 text-muted-foreground">
                      {DAYS[dayIdx]}
                    </td>
                    {row.map((v, hourIdx) => {
                      const intensity = v / max;
                      return (
                        <td
                          key={hourIdx}
                          className={cn(
                            "h-5 w-5 rounded-sm text-center font-medium",
                            intensity === 0 && "bg-muted",
                          )}
                          style={{
                            backgroundColor:
                              intensity > 0
                                ? `oklch(0.46 0.09 168 / ${0.15 + intensity * 0.85})`
                                : undefined,
                            color:
                              intensity > 0.5 ? "white" : undefined,
                          }}
                          title={`${DAYS[dayIdx]} ${hourIdx}:00 — ${v} tokens`}
                        >
                          {v > 0 ? v : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card p-5"
      >
        <div className="text-sm font-semibold">Top medicines dispensed</div>
        <div className="mt-1 text-xs text-muted-foreground">
          By quantity · last 30 days
        </div>
        <div className="mt-4 h-64">
          {topMeds.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMeds} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" stroke="currentColor" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  stroke="currentColor"
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="qty"
                  fill={COLORS[1]}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>
    </div>
  );
}
