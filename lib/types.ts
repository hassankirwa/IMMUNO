// User roles for RBAC
export type UserRole = 'admin' | 'vaccine_administrator' | 'practitioner';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  facility?: string;
  avatar?: string;
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  guardianName?: string;
  guardianPhone?: string;
}

export interface HealthcareFacility {
  id: string;
  name: string;
  address: string;
  phone: string;
  type: string;
}

export interface HealthcarePractitioner {
  id: string;
  name: string;
  practitionerId: string;
  specialization: string;
  facility: string;
  phone: string;
  email: string;
}

export interface VaccineRecord {
  id: string;
  patientId: string;
  patientName: string;
  vaccineName: string;
  batchNumber: string;
  dateAdministered: string;
  doseNumber: number;
  totalDosesRequired: number;
  route: 'IM' | 'SC' | 'ID' | 'Oral';
  administeredBy: string;
  facility: string;
  nextDueDate?: string;
  followUpScheduled: boolean;
  notes?: string;
  status: 'completed' | 'scheduled' | 'overdue' | 'pending';
}

export interface Notification {
  id: string;
  patientId: string;
  patientName: string;
  type: 'sms' | 'email' | 'whatsapp';
  message: string;
  scheduledDate: string;
  status: 'pending' | 'sent' | 'failed';
  vaccineName: string;
}

export interface DashboardStats {
  totalPatients: number;
  vaccinationsToday: number;
  upcomingReminders: number;
  overdueVaccinations: number;
  completedThisMonth: number;
  pendingFollowUps: number;
}

/** Laravel GET /v1/session-planning */
export type SessionPlanningStockLevel = "adequate" | "low" | "critical";

export type SessionPlanningSummary = {
  totalExpected: number;
  confirmedAppointments: number;
  highRiskDefaulters: number;
  walkInEstimate: number;
};

export type SessionPlanningComposition = {
  scheduledAppointments: number;
  defaulterRecovery: number;
  walkInsHistorical: number;
};

export type SessionPlanningVaccineDemandRow = {
  vaccine_id: number;
  name: string;
  expected_doses: number;
  percent: number;
};

export type SessionPlanningStockItem = {
  vaccine_id: number;
  name: string | null | undefined;
  quantity_on_hand: number;
  reorder_threshold: number | null;
  level: string;
};

export type SessionPlanningRow = {
  vaccinee_id: number;
  child_name: string;
  guardian_name?: string | null;
  contact_phone?: string | null;
  row_kind: "scheduled" | "defaulter" | "walk_in";
  display_status: string;
  due_vaccines: string[];
  visit_id?: number | null;
  visit_status?: string | null;
};

export type SessionPlanningResponse = {
  date: string;
  facility_id: number;
  summary: SessionPlanningSummary;
  composition: SessionPlanningComposition;
  vaccineDemand: SessionPlanningVaccineDemandRow[];
  stockSummary: {
    level: SessionPlanningStockLevel;
    items: SessionPlanningStockItem[];
  };
  rows: SessionPlanningRow[];
};

export type SessionVisitRow = {
  id: number;
  facility_id: number;
  vaccinee_id: number;
  session_date: string;
  status: string;
  checked_in_at: string | null;
};

export type RoleName = string;

export type MeResponse = {
  /** Laravel: numeric user id (for RBAC / audit display). */
  id?: number;
  name?: string;
  email?: string;
  user?: string;
  full_name: string;
  roles: RoleName[];
  /** Present when using the Laravel API (scoped facility for health officers). */
  facility_id?: number | null;
  /** Laravel: nested facility model when present. */
  facility?: { id?: number; name?: string } | null;
  /** Absolute URL to profile photo (Laravel public storage). */
  avatar_url?: string | null;
};

export type Practitioner = {
  name: string;
  // backend may return additional keys depending on your schema
  [key: string]: unknown;
} | null;

export type BootstrapResponse = {
  user: MeResponse;
  practitioner?: Practitioner;
  csrf_token?: string;
};

/** Linked guardian: one record can be shared by multiple vaccinees (siblings). */
export type GuardianInfo = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type PatientRow = {
  name: string;
  patient_name: string;
  sex: string | null;
  dob: string | null;
  mobile: string | null;
  status: string | null;
  email?: string | null;
  address?: string | null;
  guardian_id?: string | null;
  guardian?: GuardianInfo | null;
};

export type PatientLookupRow = Pick<PatientRow, "name" | "patient_name">;

export type CreatePatientInput = {
  first_name: string;
  last_name?: string;
  patient_name: string;
  sex?: string | null;
  date_of_birth?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  /** Laravel: scope new vaccinee to this facility when set. */
  facility_id?: number | null;
  /** Link to an existing guardian (several children can share the same guardian). */
  guardian_id?: string | number | null;
  /** When set and guardian_id is not, creates a guardian then links. */
  guardian?: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
};

export type GuardianRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type FacilityRow = {
  name: string;
  facility_name?: string | null;
  healthcare_facility_name?: string | null;
  healthcare_service_unit_name?: string | null;
};

export type PractitionerRow = {
  name: string;
  practitioner_name?: string | null;
  user_id?: string | null;
  employee_name?: string | null;
  healthcare_facility?: string | null;
};

export type VaccineRow = {
  name: string;
  /** From Item.item_name when loading vaccines via Item doctype */
  vaccine_name?: string | null;
  item_name?: string | null;
  item_group?: string | null;
  disabled?: number | boolean | null;
  /** Doses in the series; drives interval row count (after_dose 1 … total_doses − 1). */
  total_doses?: number | null;
};

export type FacilityVaccineInventoryRow = {
  id: number;
  facility_id: number;
  vaccine_id: number;
  quantity_on_hand: number;
  batch_number: string | null;
  expiry_date: string | null;
  reorder_threshold: number | null;
  facility?: { id: number; name: string } | null;
  vaccine?: { id: number; name: string } | null;
};

export type CreateFacilityVaccineInventoryInput = {
  facility_id?: number | null;
  vaccine_id: number;
  quantity_on_hand?: number;
  batch_number?: string | null;
  expiry_date?: string | null;
  reorder_threshold?: number | null;
};

export type UpdateFacilityVaccineInventoryInput = {
  quantity_on_hand?: number;
  batch_number?: string | null;
  expiry_date?: string | null;
  reorder_threshold?: number | null;
};

export type ImmunisationRecordRow = {
  name: string;
  patient: string;
  /** Laravel: friendly name from vaccinee when API returns nested vaccinee */
  patient_display_name?: string | null;
  healthcare_facility: string | null;
  healthcare_practitioner: string | null;
  vaccine_name: string;
  /** Laravel: optional link to facility stock line (decremented on administer). */
  facility_vaccine_inventory_id?: number | null;
  batch_number: string | null;
  /** Optional vial / packaging identifier (scan or type). */
  vial_barcode?: string | null;
  /** Vial expiry (aligns with inventory expiry when a stock line is selected). */
  expiry_date?: string | null;
  /** Laravel: confirms VVM stage is acceptable before administration. */
  vvm_confirmed?: boolean | null;
  date_administered: string | null;
  dose_number: number | null;
  total_doses_required: number | null;
  route: string | null;
  next_due_date: string | null;
  followup_scheduled: 0 | 1 | null;
  optional_clinical_notes: string | null;
  /** Laravel API: administered | refused */
  outcome?: "administered" | "refused" | null;
  injection_site?: string | null;
};

export type VaccineDoseIntervalRow = {
  id: number;
  vaccine_id: number;
  after_dose: number;
  interval_days: number;
};

export type ScheduledReminderRow = {
  id: number;
  facility_id: number;
  vaccinee_id: number;
  vaccine_id: number | null;
  immunization_id: number | null;
  sequence: number | null;
  days_before_due: number | null;
  dose_due_on: string | null;
  due_at: string | null;
  channel: string;
  status: string;
  message: string | null;
  sent_at: string | null;
  vaccine?: { id: number; name: string } | null;
  vaccinee?: { id: number; name: string; first_name?: string; last_name?: string } | null;
  facility?: { id: number; name: string } | null;
};

export type ReminderMessageTemplateRow = {
  id: number;
  facility_id: number | null;
  name: string;
  body_template: string;
  is_active: boolean;
};

export type ReminderSettingRow = {
  id: number;
  facility_id: number | null;
  offset_days: number[];
};

export type VacciBoxLogRow = {
  name: string;
  message_id: string;
  device_id: string;
  customer: string | null;
  temperature: number;
  battery_voltage: number;
  power_state: string;
  door_status: string;
  longitude: number | null;
  latitude: number | null;
  timestamp: string;
};

export type NotificationLogRow = {
  name: string;
  subject?: string | null;
  email_content?: string | null;
  for_user?: string | null;
  type?: string | null;
  creation?: string | null;
  read?: 0 | 1 | null;
};

export type SmsChannelProvider = "africas_talking" | "twilio";

export type SmsChannelEnvironment = "sandbox" | "production";

/** Laravel GET /v1/channel-gateway-settings (admin; secrets masked) */
export type ChannelGatewaySettings = {
  sms: {
    provider: SmsChannelProvider;
    environment: SmsChannelEnvironment;
    enabled: boolean;
    /** Masked: Africa's Talking app username, or Twilio Account SID */
    username: string | null;
    api_key_configured: boolean;
    /** Sender ID (Africa's Talking) or E.164 From (Twilio) */
    sender_id: string | null;
  };
  whatsapp: {
    enabled: boolean;
    phone_number_id: string | null;
    business_account_id: string | null;
    access_token_configured: boolean;
  };
  email: {
    use_custom_smtp: boolean;
    smtp_host: string | null;
    smtp_port: number | null;
    smtp_username: string | null;
    smtp_password_configured: boolean;
    smtp_encryption: string | null;
    from_address: string | null;
    from_name: string | null;
  };
};
