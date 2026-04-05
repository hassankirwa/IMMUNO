"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, ListOrdered } from "lucide-react";
import {
  getVaccines,
  getVaccineDoseIntervals,
  putVaccineDoseIntervals,
  ApiError,
} from "@/lib/api";
import type { VaccineDoseIntervalRow, VaccineRow } from "@/lib/types";
import { useAppSession } from "@/components/app-session-provider";

function buildIntervalDrafts(
  total: number,
  previous: { after_dose: number; interval_days: number }[]
): { after_dose: number; interval_days: number }[] {
  const need = Math.max(0, total - 1);
  const byAfter = new Map(previous.map((r) => [r.after_dose, r.interval_days]));
  const out: { after_dose: number; interval_days: number }[] = [];
  for (let d = 1; d <= need; d++) {
    out.push({
      after_dose: d,
      interval_days: byAfter.get(d) ?? 28,
    });
  }
  return out;
}

/** EIR master schedule editor (used on Schedule page tab). */
export function ImmunizationSchedulePanel() {
  const session = useAppSession();
  const canEditSchedule =
    session.roles.includes("admin") || session.roles.includes("health_officer");

  const [vaccines, setVaccines] = useState<VaccineRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [totalDoses, setTotalDoses] = useState(1);
  const [intervalDrafts, setIntervalDrafts] = useState<
    { after_dose: number; interval_days: number }[]
  >([]);
  const [loadedRows, setLoadedRows] = useState<VaccineDoseIntervalRow[] | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      setError(null);
      try {
        const rows = await getVaccines({ limit: 300, offset: 0 });
        if (!cancelled) setVaccines(rows);
      } catch (e) {
        if (!cancelled) {
          setError((e as ApiError).message || "Failed to load vaccines");
          setVaccines([]);
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSchedule = useCallback(async (vaccineId: string) => {
    if (!vaccineId) {
      setTotalDoses(1);
      setIntervalDrafts([]);
      setLoadedRows(null);
      return;
    }
    setLoadingDetail(true);
    setError(null);
    try {
      const { rows, totalDoses: td } = await getVaccineDoseIntervals(vaccineId);
      setLoadedRows(rows);
      const t = Math.max(1, td);
      setTotalDoses(t);
      setIntervalDrafts(
        rows.length
          ? rows.map((r) => ({
              after_dose: r.after_dose,
              interval_days: r.interval_days,
            }))
          : buildIntervalDrafts(t, [])
      );
    } catch (e) {
      setError((e as ApiError).message || "Failed to load dose schedule");
      setLoadedRows(null);
      setTotalDoses(1);
      setIntervalDrafts([]);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setTotalDoses(1);
      setIntervalDrafts([]);
      setLoadedRows(null);
      return;
    }
    loadSchedule(selectedId);
  }, [selectedId, loadSchedule]);

  const onTotalDosesChange = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1 || n > 20) return;
    setTotalDoses(n);
    setIntervalDrafts((prev) => buildIntervalDrafts(n, prev));
  };

  const updateIntervalDays = (afterDose: number, days: number) => {
    setIntervalDrafts((prev) =>
      prev.map((row) =>
        row.after_dose === afterDose ? { ...row, interval_days: days } : row
      )
    );
  };

  const handleSave = async () => {
    if (!selectedId || !canEditSchedule) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const intervals =
        totalDoses <= 1
          ? []
          : intervalDrafts
              .filter((r) => r.after_dose < totalDoses)
              .map((r) => ({
                after_dose: r.after_dose,
                interval_days: Math.max(1, Math.min(3650, Math.round(r.interval_days))),
              }));
      await putVaccineDoseIntervals(selectedId, {
        total_doses: totalDoses,
        intervals,
      });
      setSuccess("Dose schedule saved. It applies to all facilities using this vaccine.");
      await loadSchedule(selectedId);
    } catch (e) {
      setError((e as ApiError).message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-3xl">
        Define how many doses are in each vaccine series and the minimum days between doses.
        This is clinical program configuration—not facility stock.{" "}
        <Link
          href="/dashboard/inventory"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          Inventory
        </Link>{" "}
        tracks lots and quantities per site.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5" />
            Vaccine dose schedules
          </CardTitle>
          <CardDescription>
            Changes apply system-wide for the selected vaccine. Health officers and admins can
            edit; other roles should use this tab as reference only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading vaccines…
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:max-w-md">
                <div className="space-y-2">
                  <Label>Vaccine</Label>
                  <Select
                    value={selectedId || "__none__"}
                    onValueChange={(v) => {
                      setSuccess(null);
                      setSelectedId(v === "__none__" ? "" : v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vaccine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Select —</SelectItem>
                      {vaccines.map((v) => (
                        <SelectItem key={v.name} value={v.name}>
                          {v.vaccine_name || v.item_name || v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedId ? (
                  loadingDetail ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading schedule…
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Total doses in series</Label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={totalDoses}
                          onChange={(e) => onTotalDosesChange(e.target.value)}
                          disabled={!canEditSchedule}
                        />
                        <p className="text-xs text-muted-foreground">
                          For {totalDoses} dose(s), you must set {Math.max(0, totalDoses - 1)}{" "}
                          spacing rule(s) between consecutive doses.
                        </p>
                      </div>

                      {totalDoses > 1 && (
                        <div className="space-y-3">
                          <Label>Minimum days until next dose (after completing dose N)</Label>
                          <div className="space-y-3 rounded-lg border p-3">
                            {intervalDrafts.map((row) => (
                              <div
                                key={row.after_dose}
                                className="flex flex-wrap items-center gap-3 sm:gap-4"
                              >
                                <span className="text-sm text-muted-foreground w-40 shrink-0">
                                  After dose {row.after_dose} → dose {row.after_dose + 1}
                                </span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={3650}
                                  className="w-28"
                                  value={row.interval_days}
                                  onChange={(e) =>
                                    updateIntervalDays(
                                      row.after_dose,
                                      Number(e.target.value) || 1
                                    )
                                  }
                                  disabled={!canEditSchedule}
                                />
                                <span className="text-xs text-muted-foreground">days</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {loadedRows && loadedRows.length === 0 && totalDoses > 1 && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          No intervals were stored yet; defaults are shown—adjust and save.
                        </p>
                      )}

                      {canEditSchedule ? (
                        <Button
                          type="button"
                          onClick={() => void handleSave()}
                          disabled={saving || !selectedId}
                          className="gap-2"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save schedule
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          You do not have permission to edit vaccine schedules.
                        </p>
                      )}
                    </>
                  )
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
