import type {
  BootstrapResponse,
  ChannelGatewaySettings,
  CreateFacilityVaccineInventoryInput,
  CreatePatientInput,
  GuardianRow,
  FacilityRow,
  FacilityVaccineInventoryRow,
  ImmunisationRecordRow,
  MeResponse,
  Notification,
  PatientLookupRow,
  PatientRow,
  Practitioner,
  PractitionerRow,
  ReminderMessageTemplateRow,
  ReminderSettingRow,
  ScheduledReminderRow,
  SessionPlanningResponse,
  SessionVisitRow,
  UpdateFacilityVaccineInventoryInput,
  VaccineDoseIntervalRow,
  VaccineRow,
  VacciBoxLogRow,
} from "./types";

const TOKEN_KEY = "immuno_laravel_token";

export class LaravelError extends Error {
  status: number;
  excType?: string;

  constructor(params: { status: number; excType?: string; message: string }) {
    super(params.message);
    this.name = "LaravelError";
    this.status = params.status;
    this.excType = params.excType;
  }
}

function getApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_LARAVEL_API_URL || "http://127.0.0.1:8000/api/v1";
  return raw.replace(/\/+$/, "");
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const p = payload as Record<string, unknown>;
  if (typeof p.message === "string") return p.message;
  if (p.errors && typeof p.errors === "object") {
    const errs = p.errors as Record<string, unknown>;
    const firstKey = Object.keys(errs)[0];
    const val = firstKey ? errs[firstKey] : undefined;
    if (Array.isArray(val) && val[0]) return String(val[0]);
  }
  if (typeof p.error === "string") return p.error;
  return fallback;
}

type LaravelListResponse<T> = {
  data: T[];
  meta?: { total: number; limit: number; offset: number };
};

function buildQs(
  params: Record<string, string | number | undefined | null>
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export async function laravelFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers || {});
  headers.set("Accept", "application/json");
  const hasBody = typeof init?.body !== "undefined";
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });
  const payload = await parseResponseBody(res);

  if (!res.ok) {
    throw new LaravelError({
      status: res.status,
      message: extractErrorMessage(payload, res.statusText || "Request failed"),
    });
  }

  return payload as T;
}

// ---------- Auth ----------

export async function login(email: string, password: string): Promise<void> {
  const base = getApiBase();
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await parseResponseBody(res);
  if (!res.ok) {
    throw new LaravelError({
      status: res.status,
      message: extractErrorMessage(payload, "Login failed"),
    });
  }
  const data = payload as { token?: string };
  if (!data.token) {
    throw new LaravelError({ status: 500, message: "No token in login response" });
  }
  setStoredToken(data.token);
}

export async function logout(): Promise<void> {
  try {
    await laravelFetch("/auth/logout", { method: "POST" });
  } finally {
    setStoredToken(null);
  }
}

export async function getMe(): Promise<MeResponse> {
  const u = await laravelFetch<{
    name?: string;
    email?: string;
    roles?: string[];
  }>("/auth/me");
  const email = u.email || "";
  const roles = Array.isArray(u.roles) ? u.roles : [];
  return {
    name: u.name || email,
    email,
    user: email,
    full_name: u.name || email,
    roles,
  };
}

export async function getBootstrap(): Promise<BootstrapResponse> {
  const data = await laravelFetch<{
    user: {
      id?: number;
      name?: string;
      email?: string;
      user?: string;
      full_name?: string;
      roles?: string[];
      facility_id?: number | null;
      facility?: { id?: number; name?: string } | null;
      avatar_url?: string | null;
    };
    practitioner?: unknown;
  }>("/bootstrap");
  const u = data.user || {};
  const email = u.email || u.user || "";
  const roles = Array.isArray(u.roles) ? u.roles : [];
  const fac = u.facility;
  const facilityNormalized =
    fac && typeof fac === "object"
      ? {
          id: fac.id != null ? Number(fac.id) : undefined,
          name: typeof fac.name === "string" ? fac.name : "",
        }
      : null;
  return {
    user: {
      id: u.id != null ? Number(u.id) : undefined,
      name: u.name || u.user || email,
      email,
      user: u.user || email,
      full_name: u.full_name || u.name || email,
      roles,
      facility_id:
        u.facility_id !== undefined && u.facility_id !== null
          ? Number(u.facility_id)
          : null,
      facility: facilityNormalized,
      avatar_url:
        typeof u.avatar_url === "string" && u.avatar_url.length > 0
          ? u.avatar_url
          : null,
    },
    practitioner:
      data.practitioner != null
        ? (data.practitioner as Practitioner)
        : undefined,
  };
}

export async function updateProfile(payload: {
  name: string;
  email?: string;
}): Promise<void> {
  await laravelFetch("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await laravelFetch("/auth/password", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadProfileAvatar(file: File): Promise<void> {
  const form = new FormData();
  form.append("avatar", file);
  await laravelFetch("/auth/avatar", {
    method: "POST",
    body: form,
  });
}

export async function deleteProfileAvatar(): Promise<void> {
  await laravelFetch("/auth/avatar", { method: "DELETE" });
}

export async function getChannelGatewaySettings(): Promise<ChannelGatewaySettings> {
  const raw = await laravelFetch<Record<string, unknown>>("/channel-gateway-settings");
  return mapChannelGatewaySettings(raw);
}

export async function updateChannelGatewaySettings(
  payload: Record<string, unknown>
): Promise<ChannelGatewaySettings> {
  const raw = await laravelFetch<Record<string, unknown>>("/channel-gateway-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return mapChannelGatewaySettings(raw);
}

function mapChannelGatewaySettings(raw: Record<string, unknown>): ChannelGatewaySettings {
  const sms = (raw.sms as Record<string, unknown>) || {};
  const whatsapp = (raw.whatsapp as Record<string, unknown>) || {};
  const email = (raw.email as Record<string, unknown>) || {};
  const prov = sms.provider;
  const env = sms.environment;
  return {
    sms: {
      provider:
        prov === "twilio" ? "twilio" : "africas_talking",
      environment:
        env === "sandbox" ? "sandbox" : "production",
      enabled: sms.enabled === true || sms.enabled === 1,
      username: sms.username != null ? String(sms.username) : null,
      api_key_configured:
        sms.api_key_configured === true || sms.api_key_configured === 1,
      sender_id: sms.sender_id != null ? String(sms.sender_id) : null,
    },
    whatsapp: {
      enabled: whatsapp.enabled === true || whatsapp.enabled === 1,
      phone_number_id:
        whatsapp.phone_number_id != null ? String(whatsapp.phone_number_id) : null,
      business_account_id:
        whatsapp.business_account_id != null
          ? String(whatsapp.business_account_id)
          : null,
      access_token_configured:
        whatsapp.access_token_configured === true ||
        whatsapp.access_token_configured === 1,
    },
    email: {
      use_custom_smtp: email.use_custom_smtp === true || email.use_custom_smtp === 1,
      smtp_host: email.smtp_host != null ? String(email.smtp_host) : null,
      smtp_port:
        email.smtp_port != null && email.smtp_port !== ""
          ? Number(email.smtp_port)
          : null,
      smtp_username:
        email.smtp_username != null ? String(email.smtp_username) : null,
      smtp_password_configured:
        email.smtp_password_configured === true ||
        email.smtp_password_configured === 1,
      smtp_encryption:
        email.smtp_encryption != null ? String(email.smtp_encryption) : null,
      from_address:
        email.from_address != null ? String(email.from_address) : null,
      from_name: email.from_name != null ? String(email.from_name) : null,
    },
  };
}

// ---------- Mappers ----------

function mapGuardianApiRow(g: Record<string, unknown>): GuardianRow {
  return {
    id: String(g.id ?? ""),
    name: String(g.name ?? ""),
    phone: g.phone != null ? String(g.phone) : null,
    email: g.email != null ? String(g.email) : null,
    address: g.address != null ? String(g.address) : null,
  };
}

function mapVaccineeToPatientRow(v: Record<string, unknown>): PatientRow {
  const id = v.id != null ? String(v.id) : "";
  const dobRaw = v.date_of_birth;
  const guardianRaw = v.guardian as Record<string, unknown> | undefined | null;
  let guardian: NonNullable<PatientRow["guardian"]> | undefined;
  if (guardianRaw && guardianRaw.id != null) {
    guardian = {
      id: String(guardianRaw.id),
      name: String(guardianRaw.name ?? ""),
      phone: guardianRaw.phone != null ? String(guardianRaw.phone) : null,
      email: guardianRaw.email != null ? String(guardianRaw.email) : null,
      address: guardianRaw.address != null ? String(guardianRaw.address) : null,
    };
  }
  return {
    name: id,
    patient_name: String(v.name ?? ""),
    sex: v.gender != null ? String(v.gender) : null,
    dob: dobRaw ? String(dobRaw).slice(0, 10) : null,
    mobile: v.phone != null ? String(v.phone) : null,
    email: v.email != null ? String(v.email) : null,
    address: v.address != null ? String(v.address) : null,
    guardian_id:
      v.guardian_id != null && String(v.guardian_id) !== ""
        ? String(v.guardian_id)
        : undefined,
    guardian,
    status: "Active",
  };
}

function mapFacilityToRow(f: Record<string, unknown>): FacilityRow {
  const id = f.id != null ? String(f.id) : "";
  const label = String(f.name ?? "");
  return {
    name: id,
    facility_name: label,
    healthcare_facility_name: label,
    healthcare_service_unit_name: label,
  };
}

function mapVaccineToRow(v: Record<string, unknown>): VaccineRow {
  const id = v.id != null ? String(v.id) : "";
  const label = String(v.name ?? "");
  const td = v.total_doses;
  return {
    name: id,
    vaccine_name: label,
    item_name: label,
    item_group: null,
    disabled: v.is_active === false ? 1 : 0,
    total_doses:
      td != null && Number.isFinite(Number(td)) ? Number(td) : null,
  };
}

function mapInventoryRow(row: Record<string, unknown>): FacilityVaccineInventoryRow {
  const facility = row.facility as Record<string, unknown> | undefined;
  const vaccine = row.vaccine as Record<string, unknown> | undefined;
  return {
    id: Number(row.id),
    facility_id: Number(row.facility_id),
    vaccine_id: Number(row.vaccine_id),
    quantity_on_hand: Number(row.quantity_on_hand ?? 0),
    batch_number: row.batch_number != null ? String(row.batch_number) : null,
    expiry_date:
      row.expiry_date != null ? String(row.expiry_date).slice(0, 10) : null,
    reorder_threshold:
      row.reorder_threshold != null ? Number(row.reorder_threshold) : null,
    facility: facility
      ? {
          id: Number(facility.id),
          name: String(facility.name ?? ""),
        }
      : null,
    vaccine: vaccine
      ? {
          id: Number(vaccine.id),
          name: String(vaccine.name ?? ""),
        }
      : null,
  };
}

function mapImmunizationToRow(row: Record<string, unknown>): ImmunisationRecordRow {
  const vaccinee = row.vaccinee as Record<string, unknown> | undefined;
  const vaccine = row.vaccine as Record<string, unknown> | undefined;
  const facility = row.facility as Record<string, unknown> | undefined;
  const admin = row.administrator as Record<string, unknown> | undefined;
  const administrationRoute = row.administration_route as
    | Record<string, unknown>
    | undefined;
  const follow = row.followup_scheduled;
  const id = row.id != null ? String(row.id) : "";
  const outcomeRaw = row.outcome;
  const outcome =
    outcomeRaw === "refused" || outcomeRaw === "administered"
      ? outcomeRaw
      : "administered";
  const invId = row.facility_vaccine_inventory_id;
  const patientDisplay =
    vaccinee != null
      ? String(
          [vaccinee.first_name, vaccinee.last_name].filter(Boolean).join(" ").trim() ||
            vaccinee.name ||
            ""
        ).trim() || null
      : null;
  return {
    name: id,
    patient: vaccinee?.name != null ? String(vaccinee.name) : String(row.vaccinee_id ?? ""),
    patient_display_name: patientDisplay,
    healthcare_facility: facility?.name != null ? String(facility.name) : null,
    healthcare_practitioner: admin?.name != null ? String(admin.name) : null,
    vaccine_name: vaccine?.name != null ? String(vaccine.name) : "",
    outcome,
    injection_site: row.injection_site != null ? String(row.injection_site) : null,
    facility_vaccine_inventory_id:
      invId != null && invId !== "" ? Number(invId) : null,
    batch_number: row.batch_number != null ? String(row.batch_number) : null,
    vial_barcode: row.vial_barcode != null ? String(row.vial_barcode) : null,
    expiry_date:
      row.expiry_date != null ? String(row.expiry_date).slice(0, 10) : null,
    vvm_confirmed: row.vvm_confirmed === true || row.vvm_confirmed === 1,
    date_administered: row.date_administered != null
      ? String(row.date_administered).slice(0, 10)
      : null,
    dose_number:
      row.dose_number != null ? Number(row.dose_number) : null,
    total_doses_required:
      row.total_doses_required != null ? Number(row.total_doses_required) : null,
    route:
      administrationRoute?.code != null
        ? String(administrationRoute.code)
        : row.route != null
          ? String(row.route)
          : null,
    next_due_date: row.next_due_date != null
      ? String(row.next_due_date).slice(0, 10)
      : null,
    followup_scheduled: follow === true || follow === 1 ? 1 : 0,
    optional_clinical_notes: row.notes != null ? String(row.notes) : null,
  };
}

// ---------- Guardians ----------

export async function getGuardians(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<GuardianRow[]> {
  const qs = buildQs({
    search: params.search?.trim() || undefined,
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
  });
  const res = await laravelFetch<LaravelListResponse<Record<string, unknown>>>(
    `/guardians${qs}`
  );
  return (res.data || []).map((row) => mapGuardianApiRow(row));
}

export async function createGuardian(payload: {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  facility_id?: number | null;
}): Promise<GuardianRow> {
  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    phone: payload.phone?.trim() || undefined,
    email: payload.email?.trim() || undefined,
    address: payload.address?.trim() || undefined,
  };
  if (payload.facility_id != null && Number.isFinite(Number(payload.facility_id))) {
    body.facility_id = Number(payload.facility_id);
  }
  const created = await laravelFetch<Record<string, unknown>>("/guardians", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapGuardianApiRow(created);
}

// ---------- Patients / vaccinees ----------

export async function getPatients(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PatientRow[]> {
  const qs = buildQs({
    search: params.search?.trim() || undefined,
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  });
  const res = await laravelFetch<LaravelListResponse<Record<string, unknown>>>(
    `/vaccinees${qs}`
  );
  return (res.data || []).map((row) => mapVaccineeToPatientRow(row));
}

export async function searchPatientsByName(
  fullName: string
): Promise<PatientLookupRow[]> {
  const term = fullName.trim();
  if (!term) return [];
  const rows = await getPatients({ search: term, limit: 20, offset: 0 });
  return rows.map((r) => ({
    name: r.name,
    patient_name: r.patient_name,
  }));
}

export async function createPatient(
  payload: CreatePatientInput
): Promise<PatientLookupRow> {
  const facilities = await laravelFetch<
    LaravelListResponse<Record<string, unknown>>
  >("/facilities?limit=1&offset=0");
  const firstFacilityId = facilities.data?.[0]?.id;
  const explicitFid = payload.facility_id;
  const facilityId =
    explicitFid != null && Number.isFinite(Number(explicitFid))
      ? Number(explicitFid)
      : firstFacilityId != null
        ? Number(firstFacilityId)
        : undefined;

  let guardianId: number | undefined;
  const rawGid = payload.guardian_id;
  if (rawGid != null && String(rawGid).trim() !== "") {
    const n = Number(rawGid);
    if (Number.isFinite(n)) guardianId = n;
  }

  if (payload.guardian && guardianId == null) {
    const g = await createGuardian({
      name: payload.guardian.name,
      phone: payload.guardian.phone,
      email: payload.guardian.email,
      address: payload.guardian.address,
      facility_id: facilityId ?? null,
    });
    guardianId = Number(g.id);
  }

  const body: Record<string, unknown> = {
    name: payload.patient_name,
    first_name: payload.first_name,
    last_name: payload.last_name || undefined,
    gender: payload.sex || undefined,
    date_of_birth: payload.date_of_birth || undefined,
    phone: payload.mobile || undefined,
    email: payload.email || undefined,
    address: payload.address || undefined,
  };
  if (guardianId != null) {
    body.guardian_id = guardianId;
  }
  if (explicitFid != null && Number.isFinite(Number(explicitFid))) {
    body.facility_id = Number(explicitFid);
  } else if (firstFacilityId != null) {
    body.facility_id = Number(firstFacilityId);
  }
  const created = await laravelFetch<Record<string, unknown>>("/vaccinees", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const mapped = mapVaccineeToPatientRow(created);
  return { name: mapped.name, patient_name: mapped.patient_name };
}

export async function getPatientsByFacility(params: {
  facilityName: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PatientRow[]> {
  const fid = params.facilityName.trim();
  if (!fid) return [];
  const qs = buildQs({
    facility_id: fid,
    search: params.search?.trim() || undefined,
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  });
  const res = await laravelFetch<LaravelListResponse<Record<string, unknown>>>(
    `/vaccinees${qs}`
  );
  return (res.data || []).map((row) => mapVaccineeToPatientRow(row));
}

// ---------- Facilities ----------

export async function createHealthcareFacility(payload: {
  facility_name: string;
}): Promise<FacilityRow> {
  const created = await laravelFetch<Record<string, unknown>>("/facilities", {
    method: "POST",
    body: JSON.stringify({
      name: payload.facility_name.trim(),
    }),
  });
  return mapFacilityToRow(created);
}

export async function getHealthcareFacilities(params?: {
  facilityName?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<FacilityRow[]> {
  const qs = buildQs({
    search: params?.search?.trim() || undefined,
    limit: params?.limit ?? 100,
    offset: params?.offset ?? 0,
  });
  const res = await laravelFetch<LaravelListResponse<Record<string, unknown>>>(
    `/facilities${qs}`
  );
  let rows = (res.data || []).map((r) => mapFacilityToRow(r));
  const nameFilter = params?.facilityName?.trim();
  if (nameFilter) {
    rows = rows.filter((r) => r.name === nameFilter);
  }
  return rows;
}

// ---------- Practitioners (not modeled in Laravel v1) ----------

export async function getHealthcarePractitioners(_params?: {
  facility?: string;
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PractitionerRow[]> {
  return [
    {
      name: "laravel:current-user",
      practitioner_name: "Current user",
      user_id: null,
      employee_name: "Current user",
      healthcare_facility: null,
    },
  ];
}

// ---------- Vaccines ----------

export async function getVaccines(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<VaccineRow[]> {
  const qs = buildQs({
    search: params?.search?.trim() || undefined,
    limit: params?.limit ?? 100,
    offset: params?.offset ?? 0,
  });
  const res = await laravelFetch<LaravelListResponse<Record<string, unknown>>>(
    `/vaccines${qs}`
  );
  return (res.data || []).map((row) => mapVaccineToRow(row));
}

export async function getVaccineDoseIntervals(vaccineId: string): Promise<{
  rows: VaccineDoseIntervalRow[];
  totalDoses: number;
}> {
  const res = await laravelFetch<{
    data: VaccineDoseIntervalRow[];
    meta?: { total_doses?: number };
  }>(`/vaccines/${encodeURIComponent(vaccineId)}/dose-intervals`);
  const total =
    res.meta?.total_doses != null && Number.isFinite(Number(res.meta.total_doses))
      ? Number(res.meta.total_doses)
      : 1;
  return { rows: res.data ?? [], totalDoses: total };
}

export async function putVaccineDoseIntervals(
  vaccineId: string,
  payload: {
    total_doses: number;
    intervals: { after_dose: number; interval_days: number }[];
  }
): Promise<{
  rows: VaccineDoseIntervalRow[];
  totalDoses: number;
}> {
  const res = await laravelFetch<{
    data: VaccineDoseIntervalRow[];
    meta?: { total_doses?: number };
  }>(`/vaccines/${encodeURIComponent(vaccineId)}/dose-intervals`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const total =
    res.meta?.total_doses != null && Number.isFinite(Number(res.meta.total_doses))
      ? Number(res.meta.total_doses)
      : payload.total_doses;
  return { rows: res.data ?? [], totalDoses: total };
}

export async function getImmunisationRouteOptions(): Promise<string[]> {
  const res = await laravelFetch<{ data: { code: string }[] }>(
    "/administration-routes"
  );
  const rows = res.data || [];
  return rows.map((r) => String(r.code));
}

// ---------- Immunizations ----------

const LIST_FETCH_PAGE_SIZE = 250;

export async function getImmunisationRecordsWithMeta(params?: {
  search?: string;
  limit?: number;
  offset?: number;
  /** Admin only: narrow list to one facility (must match RBAC). */
  facility_id?: number;
}): Promise<{
  rows: ImmunisationRecordRow[];
  total: number;
  limit: number;
  offset: number;
}> {
  const qs = buildQs({
    search: params?.search?.trim() || undefined,
    limit: params?.limit ?? 50,
    offset: params?.offset ?? 0,
    facility_id:
      params?.facility_id != null && Number.isFinite(params.facility_id)
        ? params.facility_id
        : undefined,
  });
  const res = await laravelFetch<LaravelListResponse<Record<string, unknown>>>(
    `/immunizations${qs}`
  );
  const rows = (res.data || []).map((row) => mapImmunizationToRow(row));
  const meta = res.meta;
  return {
    rows,
    total: meta?.total ?? rows.length,
    limit: meta?.limit ?? rows.length,
    offset: meta?.offset ?? 0,
  };
}

export async function getImmunisationRecords(params?: {
  search?: string;
  limit?: number;
  offset?: number;
  /** Admin only: narrow list to one facility (must match RBAC). */
  facility_id?: number;
}): Promise<ImmunisationRecordRow[]> {
  const { rows } = await getImmunisationRecordsWithMeta(params);
  return rows;
}

/** Loads every page from the API until all rows are retrieved (for dashboards that need full lists). */
export async function fetchAllImmunisationRecords(params?: {
  search?: string;
  /** Admin only: narrow list to one facility (must match RBAC). */
  facility_id?: number;
}): Promise<ImmunisationRecordRow[]> {
  const out: ImmunisationRecordRow[] = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const page = await getImmunisationRecordsWithMeta({
      ...params,
      limit: LIST_FETCH_PAGE_SIZE,
      offset,
    });
    out.push(...page.rows);
    total = page.total;
    offset += page.rows.length;
    if (page.rows.length === 0) break;
  }
  return out;
}

export async function createImmunisationRecord(
  payload: Omit<ImmunisationRecordRow, "name">
): Promise<ImmunisationRecordRow> {
  const vaccineeId = Number.parseInt(String(payload.patient), 10);
  const vaccineId = Number.parseInt(String(payload.vaccine_name), 10);
  if (!Number.isFinite(vaccineeId) || !Number.isFinite(vaccineId)) {
    throw new LaravelError({
      status: 422,
      message:
        "Invalid patient or vaccine selection. Choose a patient and vaccine from the lists.",
    });
  }

  const outcome = payload.outcome === "refused" ? "refused" : "administered";
  const body: Record<string, unknown> = {
    vaccinee_id: vaccineeId,
    vaccine_id: vaccineId,
    batch_number: payload.batch_number?.trim() || null,
    facility_vaccine_inventory_id:
      payload.facility_vaccine_inventory_id != null &&
      Number.isFinite(Number(payload.facility_vaccine_inventory_id))
        ? Number(payload.facility_vaccine_inventory_id)
        : null,
    expiry_date: payload.expiry_date?.trim() || null,
    vvm_confirmed: payload.vvm_confirmed === true,
    date_administered: payload.date_administered || null,
    dose_number: payload.dose_number ?? null,
    total_doses_required: payload.total_doses_required ?? null,
    route: payload.route || null,
    next_due_date: payload.next_due_date || null,
    followup_scheduled: payload.followup_scheduled === 1,
    notes: payload.optional_clinical_notes || null,
    status: outcome === "refused" ? "refused" : "completed",
    outcome,
    injection_site: payload.injection_site?.trim() || null,
  };

  const created = await laravelFetch<Record<string, unknown>>("/immunizations", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapImmunizationToRow(created);
}

// ---------- Facility vaccine inventory ----------

export async function getFacilityVaccineInventory(params?: {
  limit?: number;
  offset?: number;
  facility_id?: number;
}): Promise<{ rows: FacilityVaccineInventoryRow[]; total: number }> {
  const qs = buildQs({
    limit: params?.limit ?? 100,
    offset: params?.offset ?? 0,
    facility_id: params?.facility_id,
  });
  const res = await laravelFetch<
    LaravelListResponse<Record<string, unknown>> & {
      meta?: { total: number; limit: number; offset: number };
    }
  >(`/inventory${qs}`);
  const rows = (res.data || []).map((row) => mapInventoryRow(row));
  const total = res.meta?.total ?? rows.length;
  return { rows, total };
}

export async function createFacilityVaccineInventory(
  payload: CreateFacilityVaccineInventoryInput
): Promise<FacilityVaccineInventoryRow> {
  const created = await laravelFetch<Record<string, unknown>>("/inventory", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapInventoryRow(created);
}

export async function updateFacilityVaccineInventory(
  id: number,
  payload: UpdateFacilityVaccineInventoryInput
): Promise<FacilityVaccineInventoryRow> {
  const updated = await laravelFetch<Record<string, unknown>>(
    `/inventory/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
  return mapInventoryRow(updated);
}

export async function deleteFacilityVaccineInventory(id: number): Promise<void> {
  await laravelFetch(`/inventory/${id}`, { method: "DELETE" });
}

// ---------- Session planning ----------

export async function getSessionPlanning(params: {
  date?: string;
  facility_id?: number;
}): Promise<SessionPlanningResponse> {
  const qs = buildQs({
    date: params.date,
    facility_id: params.facility_id,
  });
  return laravelFetch<SessionPlanningResponse>(`/session-planning${qs}`);
}

export async function upsertSessionVisit(payload: {
  vaccinee_id: number;
  session_date: string;
  status: "checked_in" | "waiting";
}): Promise<SessionVisitRow> {
  return laravelFetch<SessionVisitRow>("/session-planning/visits", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSessionVisit(
  visitId: number,
  payload: { status: "checked_in" | "waiting" }
): Promise<SessionVisitRow> {
  return laravelFetch<SessionVisitRow>(`/session-planning/visits/${visitId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ---------- Reminders (SMS schedule, templates, activity) ----------

function mapScheduledReminderRow(row: Record<string, unknown>): ScheduledReminderRow {
  const vaccinee = row.vaccinee as Record<string, unknown> | undefined;
  const vaccine = row.vaccine as Record<string, unknown> | undefined;
  const facility = row.facility as Record<string, unknown> | undefined;
  const dueAt = row.due_at;
  const sentAt = row.sent_at;
  const doseDue = row.dose_due_on;
  return {
    id: Number(row.id),
    facility_id: Number(row.facility_id ?? 0),
    vaccinee_id: Number(row.vaccinee_id ?? 0),
    vaccine_id: row.vaccine_id != null ? Number(row.vaccine_id) : null,
    immunization_id: row.immunization_id != null ? Number(row.immunization_id) : null,
    sequence: row.sequence != null ? Number(row.sequence) : null,
    days_before_due: row.days_before_due != null ? Number(row.days_before_due) : null,
    dose_due_on: doseDue != null ? String(doseDue).slice(0, 10) : null,
    due_at: dueAt != null ? String(dueAt) : null,
    channel: row.channel != null ? String(row.channel) : "sms",
    status: row.status != null ? String(row.status) : "pending",
    message: row.message != null ? String(row.message) : null,
    sent_at: sentAt != null ? String(sentAt) : null,
    vaccinee: vaccinee
      ? {
          id: Number(vaccinee.id),
          name: String(vaccinee.name ?? ""),
          first_name:
            vaccinee.first_name != null ? String(vaccinee.first_name) : undefined,
          last_name:
            vaccinee.last_name != null ? String(vaccinee.last_name) : undefined,
        }
      : undefined,
    vaccine: vaccine
      ? { id: Number(vaccine.id), name: String(vaccine.name ?? "") }
      : undefined,
    facility: facility
      ? { id: Number(facility.id), name: String(facility.name ?? "") }
      : undefined,
  };
}

export async function getScheduledRemindersWithMeta(params?: {
  limit?: number;
  offset?: number;
  /** Admin only: narrow list to one facility. */
  facility_id?: number;
}): Promise<{
  rows: ScheduledReminderRow[];
  total: number;
  limit: number;
  offset: number;
}> {
  const qs = buildQs({
    limit: params?.limit ?? 200,
    offset: params?.offset ?? 0,
    facility_id:
      params?.facility_id != null && Number.isFinite(params.facility_id)
        ? params.facility_id
        : undefined,
  });
  const res = await laravelFetch<LaravelListResponse<Record<string, unknown>>>(
    `/reminders${qs}`
  );
  const rows = (res.data || []).map((r) => mapScheduledReminderRow(r));
  const meta = res.meta;
  return {
    rows,
    total: meta?.total ?? rows.length,
    limit: meta?.limit ?? rows.length,
    offset: meta?.offset ?? 0,
  };
}

export async function getScheduledReminders(params?: {
  limit?: number;
  offset?: number;
  /** Admin only: narrow list to one facility. */
  facility_id?: number;
}): Promise<ScheduledReminderRow[]> {
  const { rows } = await getScheduledRemindersWithMeta(params);
  return rows;
}

export async function fetchAllScheduledReminders(params?: {
  /** Admin only: narrow list to one facility. */
  facility_id?: number;
}): Promise<ScheduledReminderRow[]> {
  const out: ScheduledReminderRow[] = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const page = await getScheduledRemindersWithMeta({
      ...params,
      limit: LIST_FETCH_PAGE_SIZE,
      offset,
    });
    out.push(...page.rows);
    total = page.total;
    offset += page.rows.length;
    if (page.rows.length === 0) break;
  }
  return out;
}

export async function getReminderSettings(): Promise<ReminderSettingRow> {
  return laravelFetch<ReminderSettingRow>("/reminder-settings");
}

export async function updateReminderSettings(payload: {
  offset_days: number[];
}): Promise<ReminderSettingRow> {
  return laravelFetch<ReminderSettingRow>("/reminder-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getReminderTemplates(params?: {
  limit?: number;
  offset?: number;
}): Promise<ReminderMessageTemplateRow[]> {
  const qs = buildQs({
    limit: params?.limit ?? 50,
    offset: params?.offset ?? 0,
  });
  const res = await laravelFetch<LaravelListResponse<Record<string, unknown>>>(
    `/reminder-templates${qs}`
  );
  return (res.data || []) as ReminderMessageTemplateRow[];
}

export async function createReminderTemplate(payload: {
  name: string;
  body_template: string;
  is_active?: boolean;
  facility_id?: number | null;
}): Promise<ReminderMessageTemplateRow> {
  return laravelFetch<ReminderMessageTemplateRow>("/reminder-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateReminderTemplate(
  id: number,
  payload: Partial<{
    name: string;
    body_template: string;
    is_active: boolean;
  }>
): Promise<ReminderMessageTemplateRow> {
  return laravelFetch<ReminderMessageTemplateRow>(`/reminder-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteReminderTemplate(id: number): Promise<void> {
  await laravelFetch(`/reminder-templates/${id}`, { method: "DELETE" });
}

// ---------- VacciBox (not wired to Laravel yet) ----------

export async function getVacciBoxLogs(_params?: {
  deviceId?: string;
  limit?: number;
  offset?: number;
}): Promise<VacciBoxLogRow[]> {
  throw new LaravelError({
    status: 501,
    message:
      "VacciBox cold-chain logs are not available from the API yet. Implement or connect a VacciBox endpoint on the Laravel backend when ready.",
  });
}

// ---------- Notifications ----------

export async function getNotifications(_params?: {
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  return [];
}
