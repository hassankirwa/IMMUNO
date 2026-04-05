/**
 * API entry: Laravel backend only (`NEXT_PUBLIC_LARAVEL_API_URL`).
 */
import * as laravel from "./laravel-api";

/** Thrown by the Laravel client; use for `instanceof` / typed catches at the app boundary. */
export { LaravelError as ApiError } from "./laravel-api";
import type {
  BootstrapResponse,
  ChannelGatewaySettings,
  CreateFacilityVaccineInventoryInput,
  CreatePatientInput,
  FacilityRow,
  FacilityVaccineInventoryRow,
  ImmunisationRecordRow,
  MeResponse,
  Notification,
  PatientLookupRow,
  GuardianRow,
  PatientRow,
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

export async function login(email: string, password: string): Promise<void> {
  return laravel.login(email, password);
}

export async function logout(): Promise<void> {
  return laravel.logout();
}

export async function getMe(): Promise<MeResponse> {
  return laravel.getMe();
}

export async function getBootstrap(): Promise<BootstrapResponse> {
  return laravel.getBootstrap();
}

export async function updateProfile(payload: {
  name: string;
  email?: string;
}): Promise<void> {
  return laravel.updateProfile(payload);
}

export async function changePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  return laravel.changePassword(payload);
}

export async function uploadProfileAvatar(file: File): Promise<void> {
  return laravel.uploadProfileAvatar(file);
}

export async function deleteProfileAvatar(): Promise<void> {
  return laravel.deleteProfileAvatar();
}

export async function getChannelGatewaySettings(): Promise<ChannelGatewaySettings> {
  return laravel.getChannelGatewaySettings();
}

export async function updateChannelGatewaySettings(
  payload: Record<string, unknown>
): Promise<ChannelGatewaySettings> {
  return laravel.updateChannelGatewaySettings(payload);
}

export async function getPatients(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PatientRow[]> {
  return laravel.getPatients(params);
}

export async function searchPatientsByName(
  fullName: string
): Promise<PatientLookupRow[]> {
  return laravel.searchPatientsByName(fullName);
}

export async function createPatient(
  payload: CreatePatientInput
): Promise<PatientLookupRow> {
  return laravel.createPatient(payload);
}

export async function getGuardians(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<GuardianRow[]> {
  return laravel.getGuardians(params);
}

export async function createHealthcareFacility(payload: {
  facility_name: string;
}): Promise<FacilityRow> {
  return laravel.createHealthcareFacility(payload);
}

export async function getPatientsByFacility(params: {
  facilityName: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PatientRow[]> {
  return laravel.getPatientsByFacility(params);
}

export async function getHealthcareFacilities(params?: {
  facilityName?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<FacilityRow[]> {
  return laravel.getHealthcareFacilities(params);
}

export async function getHealthcarePractitioners(params?: {
  facility?: string;
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PractitionerRow[]> {
  return laravel.getHealthcarePractitioners(params);
}

export async function getVaccines(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<VaccineRow[]> {
  return laravel.getVaccines(params);
}

export async function getImmunisationRouteOptions(): Promise<string[]> {
  return laravel.getImmunisationRouteOptions();
}

export async function getImmunisationRecords(params?: {
  search?: string;
  limit?: number;
  offset?: number;
  facility_id?: number;
}): Promise<ImmunisationRecordRow[]> {
  return laravel.getImmunisationRecords(params);
}

export async function fetchAllImmunisationRecords(params?: {
  search?: string;
  facility_id?: number;
}): Promise<ImmunisationRecordRow[]> {
  return laravel.fetchAllImmunisationRecords(params);
}

export async function createImmunisationRecord(
  payload: Omit<ImmunisationRecordRow, "name">
): Promise<ImmunisationRecordRow> {
  return laravel.createImmunisationRecord(payload);
}

export async function getVaccineDoseIntervals(
  vaccineId: string
): Promise<{
  rows: VaccineDoseIntervalRow[];
  totalDoses: number;
}> {
  return laravel.getVaccineDoseIntervals(vaccineId);
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
  return laravel.putVaccineDoseIntervals(vaccineId, payload);
}

export async function getScheduledReminders(params?: {
  limit?: number;
  offset?: number;
  facility_id?: number;
}): Promise<ScheduledReminderRow[]> {
  return laravel.getScheduledReminders(params);
}

export async function fetchAllScheduledReminders(params?: {
  facility_id?: number;
}): Promise<ScheduledReminderRow[]> {
  return laravel.fetchAllScheduledReminders(params);
}

export async function getReminderSettings(): Promise<ReminderSettingRow> {
  return laravel.getReminderSettings();
}

export async function updateReminderSettings(payload: {
  offset_days: number[];
}): Promise<ReminderSettingRow> {
  return laravel.updateReminderSettings(payload);
}

export async function getReminderTemplates(params?: {
  limit?: number;
  offset?: number;
}): Promise<ReminderMessageTemplateRow[]> {
  return laravel.getReminderTemplates(params);
}

export async function createReminderTemplate(payload: {
  name: string;
  body_template: string;
  is_active?: boolean;
  facility_id?: number | null;
}): Promise<ReminderMessageTemplateRow> {
  return laravel.createReminderTemplate(payload);
}

export async function updateReminderTemplate(
  id: number,
  payload: Partial<{
    name: string;
    body_template: string;
    is_active: boolean;
  }>
): Promise<ReminderMessageTemplateRow> {
  return laravel.updateReminderTemplate(id, payload);
}

export async function deleteReminderTemplate(id: number): Promise<void> {
  return laravel.deleteReminderTemplate(id);
}

export async function getFacilityVaccineInventory(params?: {
  limit?: number;
  offset?: number;
  facility_id?: number;
}): Promise<{ rows: FacilityVaccineInventoryRow[]; total: number }> {
  return laravel.getFacilityVaccineInventory(params);
}

export async function createFacilityVaccineInventory(
  payload: CreateFacilityVaccineInventoryInput
): Promise<FacilityVaccineInventoryRow> {
  return laravel.createFacilityVaccineInventory(payload);
}

export async function updateFacilityVaccineInventory(
  id: number,
  payload: UpdateFacilityVaccineInventoryInput
): Promise<FacilityVaccineInventoryRow> {
  return laravel.updateFacilityVaccineInventory(id, payload);
}

export async function deleteFacilityVaccineInventory(id: number): Promise<void> {
  return laravel.deleteFacilityVaccineInventory(id);
}

export async function getSessionPlanning(params: {
  date?: string;
  facility_id?: number;
}): Promise<SessionPlanningResponse> {
  return laravel.getSessionPlanning(params);
}

export async function upsertSessionVisit(payload: {
  vaccinee_id: number;
  session_date: string;
  status: "checked_in" | "waiting";
}): Promise<SessionVisitRow> {
  return laravel.upsertSessionVisit(payload);
}

export async function updateSessionVisit(
  visitId: number,
  payload: { status: "checked_in" | "waiting" }
): Promise<SessionVisitRow> {
  return laravel.updateSessionVisit(visitId, payload);
}

export async function getVacciBoxLogs(params?: {
  deviceId?: string;
  limit?: number;
  offset?: number;
}): Promise<VacciBoxLogRow[]> {
  return laravel.getVacciBoxLogs(params);
}

export async function getNotifications(params?: {
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  return laravel.getNotifications(params);
}
