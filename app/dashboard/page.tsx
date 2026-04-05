"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Syringe,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { AdministerVaccineDialog } from "@/components/administer-vaccine-dialog";
import { getPatients, getImmunisationRecords, ApiError } from "@/lib/api";
import { deriveImmunisationUiStatus } from "@/lib/immunisation-status";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

/** Theme chart tokens are full colors (oklch), not HSL components — use var() directly. */
const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/**
 * Solid hex colors for Recharts SVG (gradients/strokes). CSS variables with oklch()
 * often fail inside <linearGradient> stops, which made stacked areas invisible.
 */
const TREND_CHART_HEX = [
  "#3b82c6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#d946ef",
] as const;

const TREND_PRIMARY_HEX = "#3b82c6";

function colorForVaccineLabel(name: string): string {
  if (name === "Other") return "var(--chart-4)";
  if (name === "No data yet") return "var(--muted)";
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i);
  }
  return CHART_PALETTE[Math.abs(h) % CHART_PALETTE.length]!;
}

function hexColorForVaccineLabel(name: string): string {
  if (name === "Other") return TREND_CHART_HEX[3]!;
  if (name === "No data yet") return "#94a3b8";
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i);
  }
  return TREND_CHART_HEX[Math.abs(h) % TREND_CHART_HEX.length]!;
}

/** Calendar YYYY-MM-DD in local time — matches form/API date strings (not UTC like toISOString). */
function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayYmd(): string {
  return localYmd(new Date());
}

/** Local calendar YYYY-MM-DD — supports ISO datetimes (timezone-safe bucketing). */
function normalizeAdministeredYmd(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return localYmd(new Date(t));
}

export default function DashboardPage() {
  const router = useRouter();
  const [patientCount, setPatientCount] = useState(0);
  const [records, setRecords] = useState<
    {
      id: string;
      patientName: string;
      vaccineName: string;
      doseNumber: number;
      totalDosesRequired: number;
      status: "completed" | "scheduled" | "overdue" | "pending";
      nextDueDate?: string;
      dateAdministered: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [patients, immunisationRecords] = await Promise.all([
          getPatients({ limit: 200, offset: 0 }),
          getImmunisationRecords({ limit: 200, offset: 0 }),
        ]);
        setPatientCount(patients.length);
        setRecords(
          immunisationRecords.map((row) => ({
            id: row.name,
            patientName: row.patient || row.name,
            vaccineName: row.vaccine_name || "-",
            doseNumber: row.dose_number || 0,
            totalDosesRequired: row.total_doses_required || 0,
            status: deriveImmunisationUiStatus(row),
            nextDueDate: row.next_due_date || undefined,
            dateAdministered: row.date_administered || null,
          }))
        );
      } catch (err) {
        const fe = err as ApiError;
        if (fe.status === 401 || fe.status === 403) {
          router.push("/login");
        }
        setError(fe.message || "Failed to load dashboard");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  const recentRecords = records.slice(0, 5);
  const upcomingAppointments = records
    .filter((r) => r.status === "scheduled")
    .slice(0, 4);

  const today = todayYmd();
  const completedToday = records.filter((r) => {
    const d = normalizeAdministeredYmd(r.dateAdministered);
    return d === today;
  }).length;

  const dashboardStats = {
    totalPatients: patientCount,
    vaccinationsToday: completedToday,
    upcomingReminders: records.filter((r) => r.status === "scheduled").length,
    overdueVaccinations: records.filter((r) => r.status === "overdue").length,
  };

  const pieData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) {
      const key = r.vaccineName || "Unknown";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const otherSum = sorted.slice(5).reduce((s, [, n]) => s + n, 0);
    const total = records.length || 1;
    const rows = top.map(([name, value]) => ({
      name,
      value,
      pct: Math.round((value / total) * 100),
      color: colorForVaccineLabel(name),
    }));
    if (otherSum > 0) {
      rows.push({
        name: "Other",
        value: otherSum,
        pct: Math.round((otherSum / total) * 100),
        color: colorForVaccineLabel("Other"),
      });
    }
    if (rows.length === 0) {
      return [
        { name: "No data yet", value: 1, pct: 100, color: colorForVaccineLabel("No data yet") },
      ];
    }
    return rows;
  }, [records]);

  const trendChart = useMemo(() => {
    const dayYmds: { ymd: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      dayYmds.push({
        ymd: localYmd(d),
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
      });
    }
    const ymdSet = new Set(dayYmds.map((x) => x.ymd));

    const byDayType = new Map<string, Map<string, number>>();
    for (const day of dayYmds) {
      byDayType.set(day.ymd, new Map());
    }

    const typeTotals = new Map<string, number>();
    for (const r of records) {
      const ad = normalizeAdministeredYmd(r.dateAdministered);
      if (!ad || !ymdSet.has(ad)) continue;
      const v = r.vaccineName || "Unknown";
      typeTotals.set(v, (typeTotals.get(v) || 0) + 1);
      const m = byDayType.get(ad)!;
      m.set(v, (m.get(v) || 0) + 1);
    }

    const sortedTypes = [...typeTotals.entries()].sort((a, b) => b[1] - a[1]);
    const topKeys = sortedTypes.slice(0, 5).map(([k]) => k);
    const topSet = new Set(topKeys);
    const hasOtherTypes = sortedTypes.length > 5;

    type SeriesMeta = { key: string; label: string; color: string };
    const series: SeriesMeta[] = topKeys.map((name, i) => ({
      key: `v${i}`,
      label: name,
      color: hexColorForVaccineLabel(name),
    }));
    if (hasOtherTypes) {
      series.push({
        key: "vOther",
        label: "Other",
        color: hexColorForVaccineLabel("Other"),
      });
    }

    const rows: Record<string, string | number>[] = dayYmds.map(({ ymd, label }) => {
      const dayMap = byDayType.get(ymd)!;
      const row: Record<string, string | number> = { name: label };
      let total = 0;
      for (let i = 0; i < topKeys.length; i++) {
        const k = topKeys[i]!;
        const c = dayMap.get(k) || 0;
        row[`v${i}`] = c;
        total += c;
      }
      if (hasOtherTypes) {
        let o = 0;
        for (const [vaccine, c] of dayMap) {
          if (!topSet.has(vaccine)) o += c;
        }
        row.vOther = o;
        total += o;
      }
      row.vaccinations = total;
      return row;
    });

    return { rows, series };
  }, [records]);

  const trendYMax = useMemo(() => {
    let m = 0;
    for (const row of trendChart.rows) {
      m = Math.max(m, Number(row.vaccinations));
    }
    return Math.max(1, m);
  }, [trendChart.rows]);

  const weekTrendPct = useMemo(() => {
    const first = trendChart.rows
      .slice(0, 3)
      .reduce((s, d) => s + Number(d.vaccinations), 0);
    const last = trendChart.rows
      .slice(4, 7)
      .reduce((s, d) => s + Number(d.vaccinations), 0);
    if (first === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 100);
  }, [trendChart.rows]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of vaccination activities and patient tracking (live data)
          </p>
        </div>
        <AdministerVaccineDialog onRecordSaved={() => loadDashboard(true)}>
          <Button className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Administer Vaccine
          </Button>
        </AdministerVaccineDialog>
      </div>

      {loading && (
        <div className="rounded-lg border border-border/60 bg-muted px-3 py-2 text-sm">
          Loading session information...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden border-border/40 bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                <p className="text-3xl font-bold tracking-tight text-card-foreground">
                  {dashboardStats.totalPatients}
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  From API (up to 200)
                </p>
              </div>
              <div className="rounded-xl p-3 bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/40 bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{"Today's Vaccinations"}</p>
                <p className="text-3xl font-bold tracking-tight text-card-foreground">
                  {dashboardStats.vaccinationsToday}
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  Completed doses dated today
                </p>
              </div>
              <div className="rounded-xl p-3 bg-accent/10">
                <Syringe className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/40 bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Upcoming Reminders</p>
                <p className="text-3xl font-bold tracking-tight text-card-foreground">
                  {dashboardStats.upcomingReminders}
                </p>
                <p className="text-sm font-medium text-muted-foreground">Next 7 days</p>
              </div>
              <div className="rounded-xl p-3 bg-chart-3/10">
                <Bell className="h-6 w-6 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/40 bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold tracking-tight text-card-foreground">
                  {dashboardStats.overdueVaccinations}
                </p>
                <p className="text-sm font-medium text-destructive">Needs attention</p>
              </div>
              <div className="rounded-xl p-3 bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Vaccination Trends Chart */}
        <Card className="lg:col-span-4 border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-card-foreground">
                Vaccination Trends
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Weekly activity — completed doses by vaccine type (last 7 days)
              </p>
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${
                weekTrendPct >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {weekTrendPct >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {weekTrendPct >= 0 ? "+" : ""}
                {weekTrendPct}%
              </span>
              <span className="text-muted-foreground font-normal">vs early week</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChart.rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TREND_PRIMARY_HEX} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={TREND_PRIMARY_HEX} stopOpacity={0} />
                    </linearGradient>
                    {trendChart.series.map((s, i) => (
                      <linearGradient key={s.key} id={`trendGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis
                    domain={[0, trendYMax]}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    className="text-xs fill-muted-foreground"
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const items =
                        trendChart.series.length > 0
                          ? payload.filter((p) => p.dataKey !== "vaccinations")
                          : payload;
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
                          <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>
                          <div className="space-y-1">
                            {items.map((p) => (
                              <div
                                key={String(p.dataKey)}
                                className="flex justify-between gap-6 tabular-nums"
                              >
                                <span style={{ color: p.color }}>{p.name}</span>
                                <span className="font-medium text-popover-foreground">
                                  {p.value as number}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {trendChart.series.length > 0 ? (
                    <>
                      {trendChart.series.map((s, i) => (
                        <Area
                          key={s.key}
                          type="monotone"
                          name={s.label}
                          dataKey={s.key}
                          stackId="trend"
                          stroke={s.color}
                          strokeWidth={2}
                          fill={`url(#trendGrad-${i})`}
                          isAnimationActive={false}
                        />
                      ))}
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-muted-foreground">{value}</span>
                        )}
                      />
                    </>
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="vaccinations"
                      name="Completed doses"
                      stroke={TREND_PRIMARY_HEX}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#trendGradTotal)"
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vaccine Distribution */}
        <Card className="lg:col-span-3 border-border/40 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-card-foreground">
              Vaccine Distribution
            </CardTitle>
            <p className="text-sm text-muted-foreground">By vaccine type</p>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        fillOpacity={entry.name === "Other" ? 0.55 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                  <span className="ml-auto text-sm font-medium text-card-foreground">
                    {item.value} ({item.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Upcoming */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Vaccinations */}
        <Card className="border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-semibold text-card-foreground">
                Recent Vaccinations
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest administered vaccines
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/vaccinations" className="gap-1 text-primary">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {record.patientName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-card-foreground">
                      {record.patientName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {record.vaccineName} - Dose {record.doseNumber}/
                      {record.totalDosesRequired}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    record.status === "completed"
                      ? "border-success/30 bg-success/10 text-success"
                      : record.status === "scheduled"
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : record.status === "overdue"
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "border-warning/30 bg-warning/10 text-warning-foreground"
                  }
                >
                  {record.status === "completed" && (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  )}
                  {record.status === "scheduled" && (
                    <Clock className="mr-1 h-3 w-3" />
                  )}
                  {record.status === "overdue" && (
                    <AlertTriangle className="mr-1 h-3 w-3" />
                  )}
                  {record.status === "pending" && (
                    <Clock className="mr-1 h-3 w-3" />
                  )}
                  {record.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-semibold text-card-foreground">
                Upcoming Appointments
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Scheduled vaccinations
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/schedule" className="gap-1 text-primary">
                View schedule <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">
                      {appointment.patientName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.vaccineName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-card-foreground">
                      {appointment.nextDueDate || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dose {appointment.doseNumber}/{appointment.totalDosesRequired}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
