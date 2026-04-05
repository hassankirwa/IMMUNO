"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Phone,
  MessageSquare,
  Syringe,
  Users,
  CalendarCheck,
  AlertTriangle,
  Package,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  getSessionPlanning,
  upsertSessionVisit,
  getHealthcareFacilities,
  ApiError,
} from "@/lib/api";
import type { SessionPlanningResponse, SessionPlanningRow } from "@/lib/types";
import { useAppSession } from "@/components/app-session-provider";
import { cn } from "@/lib/utils";

const COMP_A_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--destructive))",
  "hsl(var(--chart-2))",
];

const CHART_B_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length < 6) return phone;
  const start = d.slice(0, 4);
  const end = d.slice(-2);
  return `${start} ••• ••• ${end}`;
}

function stockBadgeClass(level: string): string {
  if (level === "critical") return "bg-destructive/15 text-destructive border-destructive/30";
  if (level === "low") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25";
}

export default function SessionPlanningPage() {
  const router = useRouter();
  const session = useAppSession();
  const [date, setDate] = useState(todayYmd);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [resolvingFacility, setResolvingFacility] = useState(true);
  const [data, setData] = useState<SessionPlanningResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "defaulters" | "appointments">("all");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      setResolvingFacility(true);
      const fid = session.bootstrap?.user?.facility_id;
      if (fid != null && fid !== undefined && Number.isFinite(Number(fid))) {
        if (!cancelled) {
          setFacilityId(Number(fid));
          setResolvingFacility(false);
        }
        return;
      }
      if (session.loading) return;
      if (!session.showAdminNav) {
        if (!cancelled) {
          setFacilityId(null);
          setResolvingFacility(false);
        }
        return;
      }
      try {
        const rows = await getHealthcareFacilities({ limit: 50, offset: 0 });
        if (cancelled) return;
        if (rows.length) {
          const id = Number.parseInt(String(rows[0].name), 10);
          if (Number.isFinite(id)) setFacilityId(id);
        }
      } catch {
        if (!cancelled) setFacilityId(null);
      } finally {
        if (!cancelled) setResolvingFacility(false);
      }
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [session.bootstrap, session.loading, session.showAdminNav]);

  const load = useCallback(async () => {
    if (facilityId == null) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await getSessionPlanning({
        date,
        facility_id: session.showAdminNav ? facilityId : undefined,
      });
      setData(payload);
    } catch (err) {
      const fe = err as ApiError;
      if (fe.status === 401 || fe.status === 403) {
        router.push("/login");
        return;
      }
      setError(fe.message || "Failed to load session planning");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, facilityId, router, session.showAdminNav]);

  useEffect(() => {
    if (facilityId == null || resolvingFacility) return;
    void load();
  }, [facilityId, resolvingFacility, load]);

  useEffect(() => {
    if (facilityId == null || resolvingFacility) return;
    const t = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(t);
  }, [facilityId, resolvingFacility, load]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    let out: SessionPlanningRow[] = rows;
    if (filter === "defaulters") {
      out = rows.filter((r) => r.row_kind === "defaulter");
    } else if (filter === "appointments") {
      out = rows.filter((r) => r.row_kind === "scheduled");
    }
    const q = search.trim().toLowerCase();
    if (!q) return out;
    return out.filter((r) => {
      const blob = [
        r.child_name,
        r.guardian_name ?? "",
        r.contact_phone ?? "",
        ...(r.due_vaccines ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [data?.rows, filter, search]);

  const compositionData = useMemo(() => {
    if (!data) return [];
    const c = data.composition;
    return [
      { name: "Scheduled", value: c.scheduledAppointments, key: "s" },
      { name: "Defaulter recovery", value: c.defaulterRecovery, key: "d" },
      { name: "Walk-ins (avg.)", value: c.walkInsHistorical, key: "w" },
    ];
  }, [data]);

  const demandData = useMemo(() => {
    if (!data?.vaccineDemand?.length) return [];
    return data.vaccineDemand.map((v, i) => ({
      name: v.name,
      value: v.percent,
      key: `v${v.vaccine_id}`,
      color: CHART_B_COLORS[i % CHART_B_COLORS.length],
    }));
  }, [data]);

  const compositionEmpty =
    data &&
    compositionData.every((x) => (x.value ?? 0) <= 0) &&
    (data.summary.totalExpected ?? 0) === 0;

  async function onCheckIn(row: SessionPlanningRow) {
    setActionId(row.vaccinee_id);
    try {
      await upsertSessionVisit({
        vaccinee_id: row.vaccinee_id,
        session_date: date,
        status: "checked_in",
      });
      await load();
    } catch (err) {
      const fe = err as ApiError;
      setError(fe.message || "Check-in failed");
    } finally {
      setActionId(null);
    }
  }

  if (session.loading || resolvingFacility) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (facilityId == null) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-7 w-7" />
          Session planning
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>No facility</CardTitle>
            <CardDescription>
              Your account has no facility assigned. Admins must have at least one facility in the
              system, or assign a facility to your user.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7" />
            Session planning
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Expected workload, demand split, and today&apos;s queue for your facility.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[160px] bg-background"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total expected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {loading ? "—" : data?.summary.totalExpected ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Appointments + defaulters + walk-in estimate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Confirmed appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {loading ? "—" : data?.summary.confirmedAppointments ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Booked for this date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              High-risk defaulters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {loading ? "—" : data?.summary.highRiskDefaulters ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Due 7–30 days ago (not already booked today)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Stock status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-3xl font-semibold">—</div>
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  "text-base font-semibold px-3 py-1 capitalize",
                  data && stockBadgeClass(data.stockSummary.level)
                )}
              >
                {data?.stockSummary.level ?? "—"}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              From facility inventory vs reorder thresholds
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="text-base">Session composition</CardTitle>
            <CardDescription>Scheduled vs defaulter vs walk-in (historical average)</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {compositionEmpty ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                No session data for this date.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={compositionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {compositionData.map((_, i) => (
                      <Cell key={compositionData[i].key} fill={COMP_A_COLORS[i % COMP_A_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="text-base">Vaccine demand</CardTitle>
            <CardDescription>By expected doses today (planning, not stock on hand)</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {!demandData.length ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                No demand breakdown (no scheduled or defaulter doses for this date).
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demandData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={1}
                  >
                    {demandData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Working list</CardTitle>
            <CardDescription>Call, SMS, check-in, or open administer for this child</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Filter name, phone, vaccines…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[220px] max-w-full bg-background"
            />
            <div className="flex rounded-lg border p-0.5 bg-muted/40">
              {(
                [
                  ["all", "All"],
                  ["defaulters", "Defaulters"],
                  ["appointments", "Appointments"],
                ] as const
              ).map(([k, label]) => (
                <Button
                  key={k}
                  type="button"
                  variant={filter === k ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8"
                  onClick={() => setFilter(k)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Child</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due vaccines</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                    Loading queue…
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    No rows match this filter.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filteredRows.map((row) => {
                  const phone = row.contact_phone?.replace(/\D/g, "") ?? "";
                  const tel = phone ? `tel:${phone}` : undefined;
                  const sms = phone ? `sms:${phone}` : undefined;
                  return (
                    <TableRow key={`${row.vaccinee_id}-${row.row_kind}`}>
                      <TableCell className="font-medium">{row.child_name}</TableCell>
                      <TableCell>{row.guardian_name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {maskPhone(row.contact_phone)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {row.display_status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {(row.due_vaccines ?? []).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {tel && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={tel} aria-label="Call">
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {sms && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={sms} aria-label="SMS">
                                <MessageSquare className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionId === row.vaccinee_id}
                            onClick={() => void onCheckIn(row)}
                          >
                            {actionId === row.vaccinee_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Check in"
                            )}
                          </Button>
                          <Button variant="default" size="sm" asChild>
                            <Link href="/dashboard/administer">
                              <Syringe className="h-3.5 w-3.5 mr-1" />
                              Administer
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
