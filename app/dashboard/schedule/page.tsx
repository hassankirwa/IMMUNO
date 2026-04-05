"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ImmunizationSchedulePanel } from "@/components/immunization-schedule-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Syringe,
  Bell,
  Settings2,
  ListTodo,
  CalendarDays,
  Loader2,
  Trash2,
  Save,
  Pencil,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSession } from "@/components/app-session-provider";
import {
  ApiError,
  fetchAllImmunisationRecords,
  fetchAllScheduledReminders,
  getHealthcareFacilities,
  getReminderSettings,
  getReminderTemplates,
  updateReminderSettings,
  createReminderTemplate,
  updateReminderTemplate,
  deleteReminderTemplate,
} from "@/lib/api";
import type {
  ImmunisationRecordRow,
  ScheduledReminderRow,
  ReminderMessageTemplateRow,
  ReminderSettingRow,
} from "@/lib/types";

const UPCOMING_PAGE_SIZE = 15;
const REMINDERS_PAGE_SIZE = 20;

type ScheduleMainTab = "schedule" | "activity" | "eir" | "setup";

const statusColors = {
  completed: "bg-success/10 text-success border-success/20",
  scheduled: "bg-primary/10 text-primary border-primary/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-warning/10 text-warning-foreground border-warning/20",
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ordinal(n: number): string {
  if (n <= 0) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0];
  return `${n}${suffix}`;
}

function reminderActivityLabel(row: ScheduledReminderRow): string {
  const ord = ordinal(row.sequence ?? 0);
  const st = row.status;
  if (st === "sent") return `${ord} reminder sent`;
  if (st === "superseded") return `${ord} reminder superseded`;
  if (st === "failed") return `${ord} reminder failed`;
  if (row.due_at && st === "pending") {
    const d = new Date(row.due_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return `${ord} reminder due today`;
    if (d.getTime() < today.getTime()) return `${ord} reminder overdue`;
    return `${ord} reminder scheduled`;
  }
  return st;
}

function patientLabelFromRecord(r: ImmunisationRecordRow): string {
  return (
    r.patient_display_name?.trim() ||
    (typeof r.patient === "string" && !/^\d+$/.test(r.patient) ? r.patient : `Patient #${r.patient}`)
  );
}

function patientLabelFromReminder(r: ScheduledReminderRow): string {
  const v = r.vaccinee;
  if (!v) return "—";
  const combined = [v.first_name, v.last_name].filter(Boolean).join(" ").trim();
  return combined || v.name || "—";
}

export default function SchedulePage() {
  const session = useAppSession();
  const isAdmin =
    !session.loading && session.roles.some((r) => r.toLowerCase() === "admin");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [mainTab, setMainTab] = useState<ScheduleMainTab>("schedule");
  const tabFromUrlApplied = useRef(false);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [records, setRecords] = useState<ImmunisationRecordRow[]>([]);
  const [reminders, setReminders] = useState<ScheduledReminderRow[]>([]);
  const [apiFacilities, setApiFacilities] = useState<
    { id: string; value: string; label: string }[]
  >([]);
  const [settings, setSettings] = useState<ReminderSettingRow | null>(null);
  const [templates, setTemplates] = useState<ReminderMessageTemplateRow[]>([]);
  const [offsetDraft, setOffsetDraft] = useState<string>("10,5,1");
  const [savingSettings, setSavingSettings] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", body_template: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [remindersPage, setRemindersPage] = useState(1);

  const setMainTabWithUrl = useCallback((next: ScheduleMainTab) => {
    setMainTab(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  }, []);

  const loadLaravel = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const facRows = await getHealthcareFacilities({ limit: 500 });
      const facList = facRows.map((f) => {
        const nameStr =
          f.facility_name || f.healthcare_facility_name || f.name || "";
        return {
          id: f.name,
          value: nameStr,
          label:
            f.healthcare_service_unit_name ||
            f.healthcare_facility_name ||
            f.facility_name ||
            f.name,
        };
      });
      setApiFacilities(facList);

      let facilityIdQuery: number | undefined;
      if (isAdmin && facilityFilter !== "all") {
        const n = Number(facList.find((x) => x.value === facilityFilter)?.id);
        if (Number.isFinite(n)) facilityIdQuery = n;
      }

      const [recRows, remRows] = await Promise.all([
        fetchAllImmunisationRecords({
          facility_id: facilityIdQuery,
        }),
        fetchAllScheduledReminders({
          facility_id: facilityIdQuery,
        }),
      ]);

      setRecords(recRows);
      setReminders(remRows);
      setUpcomingPage(1);
      setRemindersPage(1);

      if (isAdmin) {
        const [setRow, tmplRows] = await Promise.all([
          getReminderSettings().catch(() => null),
          getReminderTemplates({ limit: 50, offset: 0 }),
        ]);
        if (setRow) {
          setSettings(setRow);
          setOffsetDraft(setRow.offset_days.join(","));
        } else {
          setSettings(null);
        }
        setTemplates(tmplRows);
      } else {
        setSettings(null);
        setTemplates([]);
      }
    } catch (e) {
      const err = e as ApiError;
      setLoadError(err.message || "Failed to load schedule data");
      setRecords([]);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, facilityFilter]);

  useEffect(() => {
    loadLaravel();
  }, [loadLaravel]);

  useEffect(() => {
    if (!isAdmin && mainTab === "setup") {
      setMainTabWithUrl("schedule");
    }
  }, [isAdmin, mainTab, setMainTabWithUrl]);

  /** Deep link: /dashboard/schedule?tab=eir|activity|schedule|setup (once per mount, before paint) */
  useLayoutEffect(() => {
    if (session.loading || typeof window === "undefined" || tabFromUrlApplied.current) return;
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q === "eir" || q === "activity" || q === "schedule") {
      setMainTab(q);
    } else if (q === "setup" && isAdmin) {
      setMainTab("setup");
    }
    tabFromUrlApplied.current = true;
  }, [session.loading, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    const fid = session.bootstrap?.user?.facility_id;
    if (fid == null || apiFacilities.length === 0) return;
    const match = apiFacilities.find((f) => f.id === String(fid));
    if (match) {
      setFacilityFilter((prev) => (prev === "all" ? match.value : prev));
    }
  }, [isAdmin, session.bootstrap?.user?.facility_id, apiFacilities]);

  const facilityOptions = apiFacilities;

  const filteredRecords = useMemo(() => {
    if (facilityFilter === "all") return records;
    return records.filter((r) => r.healthcare_facility === facilityFilter);
  }, [records, facilityFilter]);

  const filteredReminders = useMemo(() => {
    if (facilityFilter === "all") return reminders;
    const fid = Number(
      apiFacilities.find((f) => f.value === facilityFilter)?.id ?? NaN
    );
    if (!Number.isFinite(fid)) return reminders;
    return reminders.filter((r) => r.facility_id === fid);
  }, [reminders, facilityFilter, apiFacilities]);

  const upcomingFromApi = useMemo(() => {
    return filteredRecords
      .filter((r) => r.next_due_date && r.followup_scheduled === 1)
      .map((r) => {
        const nd = r.next_due_date!;
        const overdue = new Date(nd) < new Date(new Date().toISOString().slice(0, 10));
        return {
          key: `dose-${r.name}`,
          kind: "dose" as const,
          patientName: patientLabelFromRecord(r),
          vaccineName: r.vaccine_name,
          dose: r.dose_number,
          total: r.total_doses_required,
          date: nd,
          facility: r.healthcare_facility || "—",
          status: overdue ? ("overdue" as const) : ("scheduled" as const),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRecords]);

  const todayYmd = ymd(new Date());

  const todayScheduleCount = useMemo(() => {
    const doseToday = upcomingFromApi.filter((u) => u.date === todayYmd).length;
    const smsToday = filteredReminders.filter(
      (r) =>
        r.status === "pending" &&
        r.due_at &&
        ymd(new Date(r.due_at)) === todayYmd
    ).length;
    return doseToday + smsToday;
  }, [upcomingFromApi, filteredReminders, todayYmd]);

  const weekUpcomingCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inWeek = (d: string) => {
      const t = new Date(`${d}T00:00:00`).getTime();
      return t >= start.getTime() && t <= end.getTime();
    };
    return upcomingFromApi.filter((u) => inWeek(u.date)).length;
  }, [upcomingFromApi]);

  const overdueCount = useMemo(() => {
    return upcomingFromApi.filter((u) => u.status === "overdue").length;
  }, [upcomingFromApi]);

  const upcomingMaxPage = Math.max(
    1,
    Math.ceil(upcomingFromApi.length / UPCOMING_PAGE_SIZE)
  );
  const remindersMaxPage = Math.max(
    1,
    Math.ceil(filteredReminders.length / REMINDERS_PAGE_SIZE)
  );

  useEffect(() => {
    if (upcomingPage > upcomingMaxPage) setUpcomingPage(upcomingMaxPage);
  }, [upcomingPage, upcomingMaxPage]);

  useEffect(() => {
    if (remindersPage > remindersMaxPage) setRemindersPage(remindersMaxPage);
  }, [remindersPage, remindersMaxPage]);

  const paginatedUpcoming = useMemo(() => {
    const start = (upcomingPage - 1) * UPCOMING_PAGE_SIZE;
    return upcomingFromApi.slice(start, start + UPCOMING_PAGE_SIZE);
  }, [upcomingFromApi, upcomingPage]);

  const paginatedReminders = useMemo(() => {
    const start = (remindersPage - 1) * REMINDERS_PAGE_SIZE;
    return filteredReminders.slice(start, start + REMINDERS_PAGE_SIZE);
  }, [filteredReminders, remindersPage]);

  const getWeekDays = () => {
    const today = new Date();
    const days: Date[] = [];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = ymd(date);
    const doses = upcomingFromApi
      .filter((u) => u.date === dateStr)
      .map((u) => ({
        id: u.key,
        patientName: u.patientName,
        vaccineName: u.vaccineName,
        doseNumber: u.dose ?? 1,
        totalDosesRequired: u.total ?? 1,
        status: u.status,
        kind: "dose" as const,
      }));
    const sms = filteredReminders
      .filter(
        (r) =>
          r.status === "pending" &&
          r.due_at &&
          ymd(new Date(r.due_at)) === dateStr
      )
      .map((r) => ({
        id: `sms-${r.id}`,
        patientName: patientLabelFromReminder(r),
        vaccineName: r.vaccine?.name || "Vaccine",
        doseNumber: r.sequence ?? 0,
        totalDosesRequired: r.days_before_due ?? 0,
        status: "scheduled" as const,
        kind: "sms" as const,
        activity: reminderActivityLabel(r),
      }));
    return [...doses, ...sms];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const saveOffsets = async () => {
    const parts = offsetDraft
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
    if (parts.length === 0) return;
    setSavingSettings(true);
    try {
      const updated = await updateReminderSettings({ offset_days: parts });
      setSettings(updated);
      setOffsetDraft(updated.offset_days.join(","));
    } catch (e) {
      const err = e as ApiError;
      setLoadError(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.body_template.trim()) return;
    try {
      if (editingId != null) {
        const u = await updateReminderTemplate(editingId, {
          name: templateForm.name.trim(),
          body_template: templateForm.body_template,
        });
        setTemplates((prev) => prev.map((t) => (t.id === u.id ? u : t)));
      } else {
        const c = await createReminderTemplate({
          name: templateForm.name.trim(),
          body_template: templateForm.body_template,
        });
        setTemplates((prev) => [...prev, c]);
      }
      setTemplateForm({ name: "", body_template: "" });
      setEditingId(null);
    } catch (e) {
      const err = e as ApiError;
      setLoadError(err.message || "Failed to save template");
    }
  };

  const removeTemplate = async (id: number) => {
    try {
      await deleteReminderTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      const err = e as ApiError;
      setLoadError(err.message || "Failed to delete");
    }
  };

  if (session.loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading session…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Vaccination Schedule</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "All facilities: filter by site, view every provider’s schedule and SMS activity. Reminder setup is admin-only."
              : "Your facility and your administrations only (RBAC). SMS reminders tied to doses you recorded."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-start justify-end">
          {isAdmin ? (
            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="All facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
                {facilityOptions.map((f) => (
                  <SelectItem key={f.id} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground max-w-xl">
              <span className="font-medium text-foreground">{session.displayName}</span>
              {" · "}
              {session.bootstrap?.user?.facility &&
              typeof session.bootstrap.user.facility === "object" &&
              "name" in session.bootstrap.user.facility
                ? String(
                    (session.bootstrap.user.facility as { name?: string }).name ?? ""
                  ) || `Facility #${String(session.bootstrap?.user?.facility_id ?? "")}`
                : session.bootstrap?.user?.facility_id != null
                  ? `Facility #${session.bootstrap.user.facility_id}`
                  : "Your facility"}
              {" · "}
              Provider-scoped view
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => loadLaravel()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTabWithUrl(v as ScheduleMainTab)}
      >
        <TabsList
          className={cn(
            "grid w-full max-w-4xl",
            isAdmin ? "grid-cols-4" : "grid-cols-3"
          )}
        >
          <TabsTrigger value="schedule" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Reminder activity
          </TabsTrigger>
          <TabsTrigger value="eir" className="gap-2">
            <ListOrdered className="h-4 w-4" />
            Immunization schedule
          </TabsTrigger>
          {isAdmin ? (
            <TabsTrigger value="setup" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Reminder setup
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="schedule" className="space-y-6 mt-6">
          {loading && !records.length ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl p-3 bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today (doses + SMS)</p>
                    <p className="text-2xl font-bold">{todayScheduleCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl p-3 bg-accent/10">
                    <Syringe className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Upcoming doses (filtered)</p>
                    <p className="text-2xl font-bold">{upcomingFromApi.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl p-3 bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue doses</p>
                    <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/50 shadow-sm lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md" />
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">This week</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {weekUpcomingCount} items in next 7 days
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weekDays.map((day) => {
                    const appointments = getAppointmentsForDate(day);
                    const dayIsToday = isToday(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "p-4 rounded-lg border transition-colors",
                          dayIsToday ? "bg-primary/5 border-primary/20" : "bg-secondary/30 border-transparent"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={cn("font-medium", dayIsToday && "text-primary")}>{formatDate(day)}</span>
                          {appointments.length > 0 && (
                            <Badge variant="outline">
                              {appointments.length} item{appointments.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        {appointments.length > 0 ? (
                          <div className="space-y-2">
                            {appointments.map((apt: Record<string, unknown>) => (
                              <div
                                key={String(apt.id)}
                                className="flex items-center justify-between p-3 rounded-md bg-card border"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {String(apt.patientName)
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")
                                        .slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{String(apt.patientName)}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {apt.kind === "sms"
                                        ? `SMS · ${String(apt.activity ?? "reminder")}`
                                        : `${String(apt.vaccineName)} · dose ${String(apt.doseNumber)}/${String(apt.totalDosesRequired)}`}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline" className={statusColors[apt.status as keyof typeof statusColors]}>
                                  {String(apt.kind) === "sms" ? "SMS" : String(apt.status)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-3">Nothing on this day</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">All upcoming dose due dates</CardTitle>
              <CardDescription>
                From immunisation records with follow-up and a next due date.
                {upcomingFromApi.length > 0 ? (
                  <span className="block mt-1">
                    Showing{" "}
                    {(upcomingPage - 1) * UPCOMING_PAGE_SIZE + 1}–
                    {Math.min(upcomingPage * UPCOMING_PAGE_SIZE, upcomingFromApi.length)} of{" "}
                    {upcomingFromApi.length}.
                  </span>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingFromApi.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming doses match the current filter.</p>
                ) : (
                  paginatedUpcoming.map((u) => (
                    <div
                      key={u.key}
                      className={cn(
                        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border",
                        u.status === "overdue" ? "bg-destructive/5 border-destructive/20" : "bg-secondary/30 border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {u.patientName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.patientName}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {u.vaccineName} · next dose due
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-medium">{u.date}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.facility}</p>
                        </div>
                        <Badge variant="outline" className={statusColors[u.status]}>
                          {u.status === "overdue" && <AlertTriangle className="mr-1 h-3 w-3" />}
                          {u.status}
                        </Badge>
                        <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />
                      </div>
                    </div>
                  ))
                )}
              </div>
              {upcomingFromApi.length > UPCOMING_PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t mt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {upcomingPage} of {upcomingMaxPage}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={upcomingPage <= 1}
                      onClick={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={upcomingPage >= upcomingMaxPage}
                      onClick={() =>
                        setUpcomingPage((p) => Math.min(upcomingMaxPage, p + 1))
                      }
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reminder activity</CardTitle>
              <CardDescription>
                Each row is one scheduled SMS (10 / 5 / 1 days before the dose due date). Status updates when
                messages are sent from your SMS worker.
                {filteredReminders.length > 0 ? (
                  <span className="block mt-1">
                    Showing{" "}
                    {(remindersPage - 1) * REMINDERS_PAGE_SIZE + 1}–
                    {Math.min(remindersPage * REMINDERS_PAGE_SIZE, filteredReminders.length)} of{" "}
                    {filteredReminders.length}.
                  </span>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Dose due</TableHead>
                    <TableHead>Send on</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReminders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground text-sm">
                        No reminders yet. Record an administered dose with follow-up to generate the cascade.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedReminders.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium whitespace-nowrap">{reminderActivityLabel(r)}</TableCell>
                        <TableCell>{patientLabelFromReminder(r)}</TableCell>
                        <TableCell>{r.vaccine?.name ?? "—"}</TableCell>
                        <TableCell>{r.dose_due_on ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.due_at ? ymd(new Date(r.due_at)) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {filteredReminders.length > REMINDERS_PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-2 px-6 pb-6 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {remindersPage} of {remindersMaxPage}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={remindersPage <= 1}
                      onClick={() => setRemindersPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={remindersPage >= remindersMaxPage}
                      onClick={() =>
                        setRemindersPage((p) => Math.min(remindersMaxPage, p + 1))
                      }
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eir" className="space-y-4 mt-6">
          <ImmunizationSchedulePanel />
        </TabsContent>

        {isAdmin ? (
        <TabsContent value="setup" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reminder offsets (days before dose due)</CardTitle>
              <CardDescription>
                Comma-separated list, e.g. <code className="text-xs">10,5,1</code> for reminders 10, 5, and 1
                days before the calculated next dose date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>Offsets</Label>
                <Input value={offsetDraft} onChange={(e) => setOffsetDraft(e.target.value)} placeholder="10,5,1" />
              </div>
              <Button onClick={saveOffsets} disabled={savingSettings} className="gap-2">
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save offsets
              </Button>
              {settings && (
                <p className="text-xs text-muted-foreground">Saved: [{settings.offset_days.join(", ")}]</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message templates</CardTitle>
              <CardDescription>
                Placeholders: {" "}
                <code className="text-xs">{"{patient_name}"}</code>,{" "}
                <code className="text-xs">{"{vaccine_name}"}</code>,{" "}
                <code className="text-xs">{"{dose_due_date}"}</code>,{" "}
                <code className="text-xs">{"{facility_name}"}</code>,{" "}
                <code className="text-xs">{"{offset_days}"}</code>,{" "}
                <code className="text-xs">{"{reminder_ordinal}"}</code>,{" "}
                <code className="text-xs">{"{reminder_sequence}"}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 max-w-2xl">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Template name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea
                    rows={5}
                    value={templateForm.body_template}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, body_template: e.target.value }))}
                    placeholder="SMS body template…"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveTemplate} className="gap-2">
                    <Save className="h-4 w-4" />
                    {editingId != null ? "Update template" : "Add template"}
                  </Button>
                  {editingId != null && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setTemplateForm({ name: "", body_template: "" });
                      }}
                    >
                      Cancel edit
                    </Button>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-md truncate font-medium">{t.name}</TableCell>
                      <TableCell>{t.is_active ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingId(t.id);
                              setTemplateForm({ name: t.name, body_template: t.body_template });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeTemplate(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
