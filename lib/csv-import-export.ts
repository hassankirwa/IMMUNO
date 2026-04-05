/**
 * CSV helpers for patient and inventory bulk import/export (UTF-8).
 */
import type {
  CreateFacilityVaccineInventoryInput,
  CreatePatientInput,
  FacilityVaccineInventoryRow,
} from "@/lib/types";

const MINOR_THRESHOLD_YEARS = 18;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  row.push(cur);
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function stringifyCsv(headers: string[], dataRows: string[][]): string {
  const lines = [
    headers.map(escapeCell).join(","),
    ...dataRows.map((r) => r.map(escapeCell).join(",")),
  ];
  return lines.join("\r\n") + "\r\n";
}

export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

export function tableToObjects(
  rows: string[][]
): { headers: string[]; records: Record<string, string>[] } {
  if (rows.length === 0) {
    return { headers: [], records: [] };
  }
  const rawHeaders = rows[0]!.map((h) => normHeader(h));
  const records: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const line = rows[i]!;
    const obj: Record<string, string> = {};
    for (let j = 0; j < rawHeaders.length; j++) {
      const key = rawHeaders[j]!;
      obj[key] = line[j] != null ? String(line[j]).trim() : "";
    }
    records.push(obj);
  }
  return { headers: rawHeaders, records };
}

function ageInFullYears(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(`${dob}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let y = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) y -= 1;
  return y;
}

function isMinorDob(dob: string): boolean {
  const a = ageInFullYears(dob);
  return a !== null && a < MINOR_THRESHOLD_YEARS;
}

function cell(r: Record<string, string>, ...aliases: string[]): string {
  for (const a of aliases) {
    const v = r[normHeader(a)];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

export const PATIENT_IMPORT_HEADERS = [
  "patient_name",
  "first_name",
  "last_name",
  "sex",
  "date_of_birth",
  "mobile",
  "email",
  "address",
  "guardian_id",
  "guardian_name",
  "guardian_phone",
  "guardian_email",
  "guardian_address",
] as const;

export function patientTemplateCsv(includeExampleRow: boolean): string {
  const headers = [...PATIENT_IMPORT_HEADERS];
  if (!includeExampleRow) {
    return stringifyCsv(headers, []);
  }
  const example = [
    "Jane Example Doe",
    "Jane",
    "Example Doe",
    "Female",
    "2020-05-15",
    "",
    "",
    "123 Main St",
    "",
    "Parent Name",
    "+1234567890",
    "parent@email.com",
    "",
  ];
  return stringifyCsv(headers, [example]);
}

export type PatientCsvRowResult =
  | { ok: true; rowIndex: number; payload: CreatePatientInput }
  | { ok: false; rowIndex: number; error: string };

export function patientRowsToImportPayloads(
  records: Record<string, string>[],
  facilityId: number | null
): PatientCsvRowResult[] {
  const out: PatientCsvRowResult[] = [];
  let rowIndex = 2;
  for (const r of records) {
    const patientName = cell(r, "patient_name", "name", "full_name");
    const firstName = cell(r, "first_name");
    const lastName = cell(r, "last_name");
    const sex = cell(r, "sex", "gender");
    const dateOfBirth = cell(r, "date_of_birth", "dob", "birth_date");
    const mobile = cell(r, "mobile", "phone", "cell") || null;
    const email = cell(r, "email") || null;
    const address = cell(r, "address") || null;

    let pn = patientName;
    let fn = firstName;
    let ln = lastName || undefined;
    if (!pn) {
      if (fn) {
        pn = ln ? `${fn} ${ln}` : fn;
      }
    }
    if (!pn) {
      out.push({ ok: false, rowIndex, error: "Missing patient_name (or first_name)." });
      rowIndex++;
      continue;
    }
    if (!fn) {
      const parts = pn.split(/\s+/).filter(Boolean);
      fn = parts[0] || pn;
      ln = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
    }

    const guardianIdRaw = cell(r, "guardian_id");
    const gName = cell(r, "guardian_name");
    const gPhone = cell(r, "guardian_phone");
    const gEmail = cell(r, "guardian_email");
    const gAddr = cell(r, "guardian_address");

    const payload: CreatePatientInput = {
      patient_name: pn,
      first_name: fn,
      last_name: ln,
      sex: sex || null,
      date_of_birth: dateOfBirth || null,
      mobile,
      email,
      address,
      facility_id: facilityId,
    };

    if (guardianIdRaw) {
      payload.guardian_id = guardianIdRaw;
    }

    if (dateOfBirth && isMinorDob(dateOfBirth)) {
      if (!payload.guardian_id && gName) {
        if (!gPhone && !gEmail) {
          out.push({
            ok: false,
            rowIndex,
            error:
              "Minors need guardian_phone or guardian_email when using guardian_name.",
          });
          rowIndex++;
          continue;
        }
        payload.guardian = {
          name: gName,
          phone: gPhone || null,
          email: gEmail || null,
          address: gAddr || null,
        };
      } else if (!payload.guardian_id && !gName) {
        out.push({
          ok: false,
          rowIndex,
          error: "Minors need guardian_id or guardian_name (+ phone/email).",
        });
        rowIndex++;
        continue;
      }
    } else if (gName && (gPhone || gEmail)) {
      payload.guardian = {
        name: gName,
        phone: gPhone || null,
        email: gEmail || null,
        address: gAddr || null,
      };
    }

    if (!dateOfBirth) {
      out.push({ ok: false, rowIndex, error: "date_of_birth is required." });
      rowIndex++;
      continue;
    }
    if (!sex) {
      out.push({ ok: false, rowIndex, error: "sex is required." });
      rowIndex++;
      continue;
    }

    out.push({ ok: true, rowIndex, payload });
    rowIndex++;
  }
  return out;
}

export function exportPatientsCsv(rows: {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  guardianId?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianAddress?: string;
}[]): string {
  const headers = [
    "id",
    "patient_name",
    "first_name",
    "last_name",
    "sex",
    "date_of_birth",
    "mobile",
    "email",
    "address",
    "guardian_id",
    "guardian_name",
    "guardian_phone",
    "guardian_email",
    "guardian_address",
  ];
  const parts = (full: string) => {
    const t = full.trim();
    const p = t.split(/\s+/).filter(Boolean);
    return {
      first: p[0] || "",
      last: p.length > 1 ? p.slice(1).join(" ") : "",
    };
  };
  const data = rows.map((u) => {
    const { first, last } = parts(u.name);
    return [
      u.id,
      u.name,
      first,
      last,
      u.gender,
      u.dateOfBirth,
      u.phone,
      u.email,
      u.address,
      u.guardianId ?? "",
      u.guardianName ?? "",
      u.guardianPhone ?? "",
      u.guardianEmail ?? "",
      u.guardianAddress ?? "",
    ];
  });
  return stringifyCsv(headers, data);
}

export const INVENTORY_IMPORT_HEADERS = [
  "facility_id",
  "vaccine_id",
  "quantity_on_hand",
  "batch_number",
  "expiry_date",
  "reorder_threshold",
] as const;

export function inventoryTemplateCsv(
  includeExampleRow: boolean,
  defaultFacilityId?: number | null
): string {
  const headers = [...INVENTORY_IMPORT_HEADERS];
  if (!includeExampleRow) {
    return stringifyCsv(headers, []);
  }
  const fid =
    defaultFacilityId != null && Number.isFinite(defaultFacilityId)
      ? String(defaultFacilityId)
      : "";
  const example = [fid, "1", "50", "LOT-001", "2026-12-31", "10"];
  return stringifyCsv(headers, [example]);
}

export type InventoryCsvRowResult =
  | { ok: true; rowIndex: number; payload: CreateFacilityVaccineInventoryInput }
  | { ok: false; rowIndex: number; error: string };

export function inventoryRowsToImportPayloads(
  records: Record<string, string>[],
  options: {
    defaultFacilityId: number | null;
    isAdmin: boolean;
  }
): InventoryCsvRowResult[] {
  const out: InventoryCsvRowResult[] = [];
  let rowIndex = 2;
  for (const r of records) {
    const facRaw = cell(r, "facility_id");
    const vacRaw = cell(r, "vaccine_id");
    const qtyRaw = cell(r, "quantity_on_hand", "qty", "quantity");
    const batch = cell(r, "batch_number", "lot", "batch") || null;
    const expiry = cell(r, "expiry_date", "expiry") || null;
    const reorderRaw = cell(r, "reorder_threshold", "reorder");

    const vaccineId = Number.parseInt(vacRaw, 10);
    if (!Number.isFinite(vaccineId)) {
      out.push({ ok: false, rowIndex, error: "vaccine_id must be a number." });
      rowIndex++;
      continue;
    }

    let facilityId: number | null | undefined;
    if (options.isAdmin) {
      const f = facRaw.trim() !== "" ? Number.parseInt(facRaw, 10) : NaN;
      if (!Number.isFinite(f)) {
        out.push({
          ok: false,
          rowIndex,
          error: "facility_id is required for admin imports.",
        });
        rowIndex++;
        continue;
      }
      facilityId = f;
    } else {
      if (facRaw.trim() !== "") {
        const f = Number.parseInt(facRaw, 10);
        if (Number.isFinite(f) && options.defaultFacilityId != null && f !== options.defaultFacilityId) {
          out.push({
            ok: false,
            rowIndex,
            error: `facility_id must be ${options.defaultFacilityId} or empty.`,
          });
          rowIndex++;
          continue;
        }
        facilityId = Number.isFinite(f) ? f : options.defaultFacilityId;
      } else {
        facilityId = options.defaultFacilityId;
      }
      if (facilityId == null || !Number.isFinite(facilityId)) {
        out.push({
          ok: false,
          rowIndex,
          error: "No facility on your account; cannot import.",
        });
        rowIndex++;
        continue;
      }
    }

    const qty = qtyRaw.trim() !== "" ? Number.parseInt(qtyRaw, 10) : 0;
    const reorder =
      reorderRaw.trim() !== "" ? Number.parseInt(reorderRaw, 10) : null;

    out.push({
      ok: true,
      rowIndex,
      payload: {
        facility_id: facilityId,
        vaccine_id: vaccineId,
        quantity_on_hand: Number.isFinite(qty) ? qty : 0,
        batch_number: batch,
        expiry_date: expiry,
        reorder_threshold:
          reorder !== null && Number.isFinite(reorder) ? reorder : null,
      },
    });
    rowIndex++;
  }
  return out;
}

export function exportInventoryCsv(rows: FacilityVaccineInventoryRow[]): string {
  const headers = [
    "inventory_line_id",
    "facility_id",
    "facility_name",
    "vaccine_id",
    "vaccine_name",
    "quantity_on_hand",
    "batch_number",
    "expiry_date",
    "reorder_threshold",
  ];
  const data = rows.map((row) => [
    String(row.id),
    String(row.facility_id),
    row.facility?.name ?? "",
    String(row.vaccine_id),
    row.vaccine?.name ?? "",
    String(row.quantity_on_hand),
    row.batch_number ?? "",
    row.expiry_date ?? "",
    row.reorder_threshold != null ? String(row.reorder_threshold) : "",
  ]);
  return stringifyCsv(headers, data);
}
