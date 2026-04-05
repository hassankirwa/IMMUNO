import type { ImmunisationRecordRow } from "@/lib/types";

export type ImmunisationUiStatus = "completed" | "scheduled" | "overdue" | "pending";

/**
 * Compare next-due YYYY-MM-DD to local calendar today (not UTC midnight) so
 * overdue vs scheduled is stable across timezones.
 */
export function dueStatusFromYmd(nextDueYmd: string): "overdue" | "scheduled" {
  const raw = nextDueYmd.trim().slice(0, 10);
  const parts = raw.split("-");
  if (parts.length !== 3) return "scheduled";
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return "scheduled";
  }
  const due = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due < today ? "overdue" : "scheduled";
}

/**
 * Derives UI status for immunisation rows: multi-dose courses stay
 * scheduled/overdue until the series is finished (next dose vs today).
 */
export function deriveImmunisationUiStatus(
  row: ImmunisationRecordRow
): ImmunisationUiStatus {
  if (row.date_administered) {
    const dose = row.dose_number ?? 0;
    const total = row.total_doses_required ?? 0;
    const seriesIncomplete = total > 0 && dose < total;
    if (seriesIncomplete && row.next_due_date) {
      return dueStatusFromYmd(row.next_due_date);
    }
    return "completed";
  }
  if (row.next_due_date) {
    return dueStatusFromYmd(row.next_due_date);
  }
  return "pending";
}
