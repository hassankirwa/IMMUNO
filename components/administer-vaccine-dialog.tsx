"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus, Syringe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  createImmunisationRecord,
  createPatient,
  ApiError,
  getFacilityVaccineInventory,
  getHealthcareFacilities,
  getImmunisationRouteOptions,
  getPatientsByFacility,
  getVaccineDoseIntervals,
  getVaccines,
} from "@/lib/api";
import type {
  FacilityVaccineInventoryRow,
  ImmunisationRecordRow,
  MeResponse,
} from "@/lib/types";

/** Earliest expiry first (FEFO). Missing expiry sorts last. */
function sortInventoryFefo(rows: FacilityVaccineInventoryRow[]): FacilityVaccineInventoryRow[] {
  return [...rows].sort((a, b) => {
    const ea = a.expiry_date?.trim() || "9999-12-31";
    const eb = b.expiry_date?.trim() || "9999-12-31";
    if (ea !== eb) return ea.localeCompare(eb);
    return a.id - b.id;
  });
}

/** Prefer lines with quantity; among those, earliest expiry (FEFO). */
function pickFefoInventoryLine(rows: FacilityVaccineInventoryRow[]): FacilityVaccineInventoryRow | null {
  const withStock = sortInventoryFefo(rows.filter((r) => (r.quantity_on_hand ?? 0) > 0));
  if (withStock.length) return withStock[0];
  const sorted = sortInventoryFefo(rows);
  return sorted[0] ?? null;
}
import { Checkbox } from "@/components/ui/checkbox";
import { useAppSession } from "@/components/app-session-provider";

type Option = { value: string; label: string };

type FormState = {
  patient: string;
  healthcare_facility: string;
  healthcare_practitioner: string;
  vaccine_name: string;
  outcome: "administered" | "refused";
  injection_site: string;
  /** Laravel: selected facility stock line id, or "" for manual lot/expiry */
  inventory_line_id: string;
  batch_number: string;
  expiry_date: string;
  vvm_confirmed: boolean;
  date_administered: string;
  route: string;
  dose_number: string;
  total_doses_required: string;
  next_due_date: string;
  followup_scheduled: "yes" | "no";
  optional_clinical_notes: string;
};

const INJECTION_SITE_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "left_deltoid", label: "Left deltoid" },
  { value: "right_deltoid", label: "Right deltoid" },
  { value: "left_thigh", label: "Left thigh" },
  { value: "right_thigh", label: "Right thigh" },
  { value: "other", label: "Other" },
];

function ymdToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateYmd: string, days: number): string {
  const d = new Date(`${dateYmd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function computeNextDueFromIntervals(
  dateAdministered: string,
  doseNumber: number,
  totalDoses: number,
  intervals: { after_dose: number; interval_days: number }[]
) {
  if (!dateAdministered) return "";
  if (totalDoses > 0 && doseNumber >= totalDoses) return "";
  const row = intervals.find((i) => i.after_dose === doseNumber);
  const days = row?.interval_days ?? 30;
  return addDays(dateAdministered, days);
}

function formatIntervalScheduleSummary(
  intervals: { after_dose: number; interval_days: number }[]
): string {
  if (!intervals.length) {
    return "Single-dose vaccine — no spacing rules between doses.";
  }
  const sorted = [...intervals].sort((a, b) => a.after_dose - b.after_dose);
  return sorted
    .map((r) => `${r.after_dose}→${r.after_dose + 1}: ${r.interval_days} d`)
    .join("; ");
}

function SearchableSelect({
  options,
  value,
  onChange,
  onCreate,
  createLabel,
  placeholder,
  disabled,
  onQueryChange,
  suppressInlineCreate,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onCreate?: (name: string) => Promise<void> | void;
  createLabel?: string;
  placeholder: string;
  disabled?: boolean;
  /** Fires when the search box text changes (for external actions like “Add patient”). */
  onQueryChange?: (query: string) => void;
  /** When true, inline “create” actions are hidden (use an external button instead). */
  suppressInlineCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery)
    );
  }, [options, normalizedQuery]);
  const hasExactMatch = useMemo(() => {
    if (!normalizedQuery) return false;
    return options.some(
      (option) =>
        option.label.trim().toLowerCase() === normalizedQuery ||
        option.value.trim().toLowerCase() === normalizedQuery
    );
  }, [options, normalizedQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">{selected?.label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              onQueryChange?.(v);
            }}
          />
          <CommandList>
            <CommandEmpty>
              {onCreate &&
              !suppressInlineCreate &&
              normalizedQuery &&
              !hasExactMatch ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={async () => {
                    await onCreate(query.trim());
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add {createLabel || "item"} "{query.trim()}"
                </Button>
              ) : (
                "No results found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreate &&
              !suppressInlineCreate &&
              normalizedQuery &&
              !hasExactMatch &&
              filteredOptions.length > 0 && (
                <CommandGroup>
                  <CommandItem
                    value={`Add patient ${query.trim()}`}
                    onSelect={async () => {
                      await onCreate(query.trim());
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add {createLabel || "item"} "{query.trim()}"
                  </CommandItem>
                </CommandGroup>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function AdministerVaccineDialog({
  children,
  onRecordSaved,
}: {
  children: ReactNode;
  onRecordSaved?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const session = useAppSession();
  const [isAdministerDialogOpen, setIsAdministerDialogOpen] = useState(false);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [addPatientSubmitting, setAddPatientSubmitting] = useState(false);
  const [sessionFacilityLabel, setSessionFacilityLabel] = useState("");
  const [addPatientForm, setAddPatientForm] = useState({
    fullName: "",
    dob: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    guardian: "",
    guardianPhone: "",
  });

  const [patientOptions, setPatientOptions] = useState<Option[]>([]);
  const [vaccineOptions, setVaccineOptions] = useState<Option[]>([]);
  const [routeOptions, setRouteOptions] = useState<Option[]>([]);
  const [doseIntervals, setDoseIntervals] = useState<
    { after_dose: number; interval_days: number }[]
  >([]);
  /** From EIR master schedule (vaccine.total_doses); drives dose # dropdown. */
  const [masterScheduleTotalDoses, setMasterScheduleTotalDoses] = useState(1);
  const [inventoryRows, setInventoryRows] = useState<FacilityVaccineInventoryRow[]>([]);
  /** When true, do not overwrite lot/expiry with FEFO (user chose manual stock entry). */
  const [manualInventoryEntry, setManualInventoryEntry] = useState(false);

  const [form, setForm] = useState<FormState>({
    patient: "",
    healthcare_facility: "",
    healthcare_practitioner: "",
    vaccine_name: "",
    outcome: "administered",
    injection_site: "",
    inventory_line_id: "",
    batch_number: "",
    expiry_date: "",
    vvm_confirmed: false,
    date_administered: ymdToday(),
    route: "",
    dose_number: "1",
    total_doses_required: "1",
    next_due_date: "",
    followup_scheduled: "yes",
    optional_clinical_notes: "",
  });

  const me = session.bootstrap?.user as MeResponse | undefined;
  const loggedPractitioner = session.bootstrap?.practitioner as Record<string, unknown> | null;
  const loggedPractitionerFacility = useMemo(() => {
    for (const key of ["healthcare_facility", "facility", "default_facility"]) {
      const value = loggedPractitioner?.[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  }, [loggedPractitioner]);

  const sessionFacilityValue = useMemo(() => {
    if (me?.facility_id != null && Number.isFinite(Number(me.facility_id))) {
      return String(me.facility_id);
    }
    return loggedPractitionerFacility;
  }, [me?.facility_id, loggedPractitionerFacility]);

  const sessionPractitionerValue = useMemo(() => "laravel:current-user", []);

  const sessionPractitionerLabel = useMemo(() => {
    return me?.full_name?.trim() || session.displayName || "—";
  }, [me?.full_name, session.displayName]);

  const onFieldChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
    setFormSuccess(null);
  };

  const inventoryForVaccine = useMemo(() => {
    if (!form.vaccine_name) return [];
    const vid = Number(form.vaccine_name);
    if (!Number.isFinite(vid)) return [];
    return sortInventoryFefo(inventoryRows.filter((r) => r.vaccine_id === vid));
  }, [inventoryRows, form.vaccine_name]);

  /** When inventory loads after vaccine pick, apply FEFO if user did not choose manual entry. */
  useEffect(() => {
    if (!isAdministerDialogOpen) return;
    if (form.outcome !== "administered" || !form.vaccine_name || manualInventoryEntry) return;
    const vid = Number(form.vaccine_name);
    if (!Number.isFinite(vid)) return;
    const forVaccine = inventoryRows.filter((r) => r.vaccine_id === vid);
    const fefo = pickFefoInventoryLine(forVaccine);
    setForm((prev) => {
      const currentId = prev.inventory_line_id;
      const currentValid =
        Boolean(currentId) && forVaccine.some((r) => String(r.id) === currentId);
      if (currentValid) return prev;
      if (fefo) {
        return {
          ...prev,
          inventory_line_id: String(fefo.id),
          batch_number: fefo.batch_number?.trim() || "",
          expiry_date: fefo.expiry_date || "",
        };
      }
      return {
        ...prev,
        inventory_line_id: "",
        batch_number: "",
        expiry_date: "",
      };
    });
  }, [
    isAdministerDialogOpen,
    form.outcome,
    form.vaccine_name,
    inventoryRows,
    manualInventoryEntry,
  ]);

  useEffect(() => {
    if (!isAdministerDialogOpen) return;
    let cancelled = false;
    async function loadFormData() {
      setLoadingFormData(true);
      setFormError(null);
      try {
        const facilityValue = sessionFacilityValue;
        const practitionerValue = sessionPractitionerValue;

        let facilityLabel = "";
        if (me?.facility_id != null) {
          const n = me.facility?.name;
          facilityLabel =
            (typeof n === "string" && n.trim() ? n.trim() : "") ||
            `Facility #${me.facility_id}`;
        }

        if (cancelled) return;
        setSessionFacilityLabel(facilityLabel);

        const [vaccines, routesRaw, patients] = await Promise.all([
          getVaccines({ limit: 300, offset: 0 }),
          getImmunisationRouteOptions().catch(() => ["IM", "SC", "ID", "Oral"]),
          facilityValue
            ? getPatientsByFacility({
                facilityName: facilityValue,
                limit: 300,
                offset: 0,
              }).catch(() => [])
            : Promise.resolve([]),
        ]);

        if (cancelled) return;

        setVaccineOptions(
          vaccines.map((v) => ({
            value: v.name,
            label: v.item_name || v.vaccine_name || v.name,
          }))
        );
        setRouteOptions(routesRaw.map((route) => ({ value: route, label: route })));
        setPatientOptions(
          patients.map((p) => ({
            value: p.name,
            label: `${p.patient_name || p.name} (${p.name})`,
          }))
        );

        setForm((prev) => ({
          ...prev,
          healthcare_facility: facilityValue,
          healthcare_practitioner: practitionerValue,
        }));
      } catch (err) {
        const fe = err as ApiError;
        if (!cancelled) {
          if (fe.status === 401 || fe.status === 403) router.push("/login");
          setFormError(fe.message || "Failed to load form data");
        }
      } finally {
        if (!cancelled) setLoadingFormData(false);
      }
    }
    loadFormData();
    return () => {
      cancelled = true;
    };
  }, [
    isAdministerDialogOpen,
    me?.facility?.name,
    me?.facility_id,
    router,
    sessionFacilityValue,
    sessionPractitionerValue,
  ]);

  useEffect(() => {
    if (!isAdministerDialogOpen || !form.healthcare_facility) {
      setInventoryRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fid = Number(form.healthcare_facility);
        if (!Number.isFinite(fid)) {
          setInventoryRows([]);
          return;
        }
        const { rows } = await getFacilityVaccineInventory({
          facility_id: fid,
          limit: 200,
          offset: 0,
        });
        if (!cancelled) setInventoryRows(rows);
      } catch {
        if (!cancelled) setInventoryRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdministerDialogOpen, form.healthcare_facility]);

  useEffect(() => {
    if (!form.vaccine_name) {
      setDoseIntervals([]);
      setMasterScheduleTotalDoses(1);
      setForm((prev) => ({
        ...prev,
        total_doses_required: "1",
        dose_number: "1",
      }));
      return;
    }
    let cancelled = false;
    getVaccineDoseIntervals(form.vaccine_name)
      .then(({ rows, totalDoses }) => {
        if (cancelled) return;
        setDoseIntervals(rows);
        setMasterScheduleTotalDoses(Math.max(1, totalDoses));
        setForm((prev) => ({
          ...prev,
          total_doses_required: String(Math.max(1, totalDoses)),
          dose_number: "1",
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setDoseIntervals([]);
          setMasterScheduleTotalDoses(1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [form.vaccine_name]);

  const intervalScheduleSummary = useMemo(
    () => formatIntervalScheduleSummary(doseIntervals),
    [doseIntervals]
  );

  const patientHasExactMatch = useMemo(() => {
    const n = patientSearchQuery.trim().toLowerCase();
    if (!n) return false;
    return patientOptions.some(
      (o) =>
        o.label.trim().toLowerCase() === n || o.value.trim().toLowerCase() === n
    );
  }, [patientOptions, patientSearchQuery]);

  const showAddPatientBelowSearch =
    patientSearchQuery.trim().length > 0 &&
    !patientHasExactMatch &&
    !addPatientSubmitting;

  const openAddPatientModal = useCallback((prefillName: string) => {
    setAddPatientForm((prev) => ({
      ...prev,
      fullName: prefillName.trim(),
    }));
    setFormError(null);
    setIsAddPatientOpen(true);
  }, []);

  const submitAddPatientModal = async () => {
    const name = addPatientForm.fullName.trim();
    if (!name) {
      setFormError("Patient full name is required.");
      return;
    }
    setAddPatientSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const parts = name.split(/\s+/);
      const fid =
        me?.facility_id != null && Number.isFinite(Number(me.facility_id))
          ? Number(me.facility_id)
          : null;
      const created = await createPatient({
        first_name: parts[0] || name,
        last_name: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
        patient_name: name,
        sex: addPatientForm.gender || null,
        date_of_birth: addPatientForm.dob || null,
        mobile: addPatientForm.phone || null,
        email: addPatientForm.email || null,
        facility_id: fid,
      });
      const option: Option = {
        value: created.name,
        label: `${created.patient_name || created.name} (${created.name})`,
      };
      setPatientOptions((prev) => {
        if (prev.some((item) => item.value === option.value)) return prev;
        return [option, ...prev];
      });
      onFieldChange("patient", created.name);
      setFormSuccess(`Patient "${created.patient_name || created.name}" was added.`);
      setIsAddPatientOpen(false);
      setAddPatientForm({
        fullName: "",
        dob: "",
        gender: "",
        phone: "",
        email: "",
        address: "",
        guardian: "",
        guardianPhone: "",
      });
      setPatientSearchQuery("");
    } catch (err) {
      const fe = err as ApiError;
      if (fe.status === 401 || fe.status === 403) {
        router.push("/login");
        return;
      }
      setFormError(fe.message || "Failed to add patient");
    } finally {
      setAddPatientSubmitting(false);
    }
  };

  const applySuggestedFollowup = () => {
    const dose = Number(form.dose_number || 0);
    const total = Number(form.total_doses_required || 0);
    const suggested = computeNextDueFromIntervals(
      form.date_administered,
      dose,
      total,
      doseIntervals
    );
    onFieldChange("next_due_date", suggested);
  };

  const submitRecord = async () => {
    setFormError(null);
    setFormSuccess(null);
    if (
      !form.patient ||
      !form.healthcare_facility ||
      !form.healthcare_practitioner ||
      !form.vaccine_name ||
      !form.date_administered
    ) {
      setFormError("Please complete all required fields.");
      return;
    }

    if (form.outcome === "administered") {
      if (!form.batch_number.trim() || !form.route) {
        setFormError("Batch number and route are required when the vaccine was administered.");
        return;
      }
      if (!form.vvm_confirmed) {
        setFormError("Confirm the VVM stage before recording administration.");
        return;
      }
      if (!form.expiry_date.trim()) {
        setFormError("Expiry date is required — pick a facility stock line or enter it manually.");
        return;
      }
    }

    const doseNumber = Number(form.dose_number || 0);
    const totalDoses = Number(form.total_doses_required || 0);
    const nextDue =
      form.followup_scheduled === "yes"
        ? form.next_due_date ||
          computeNextDueFromIntervals(
            form.date_administered,
            doseNumber,
            totalDoses,
            doseIntervals
          )
        : "";

    const payload: Omit<ImmunisationRecordRow, "name"> = {
      patient: form.patient,
      healthcare_facility: form.healthcare_facility,
      healthcare_practitioner: form.healthcare_practitioner,
      vaccine_name: form.vaccine_name,
      batch_number: form.batch_number.trim() || null,
      date_administered: form.date_administered,
      dose_number: Number.isFinite(doseNumber) ? doseNumber : null,
      total_doses_required: Number.isFinite(totalDoses) ? totalDoses : null,
      route: form.route,
      next_due_date: nextDue || null,
      followup_scheduled: form.followup_scheduled === "yes" ? 1 : 0,
      optional_clinical_notes: form.optional_clinical_notes.trim() || null,
      outcome: form.outcome,
      injection_site: form.injection_site.trim() || null,
      facility_vaccine_inventory_id: form.inventory_line_id
        ? Number(form.inventory_line_id)
        : null,
      expiry_date: form.expiry_date.trim() || null,
      vvm_confirmed: form.vvm_confirmed,
    };

    setSubmitting(true);
    try {
      await createImmunisationRecord(payload);
      setFormSuccess("Immunisation record has been saved.");
      setIsAdministerDialogOpen(false);
      await onRecordSaved?.();
      setForm((prev) => ({
        ...prev,
        patient: "",
        vaccine_name: "",
        outcome: "administered",
        injection_site: "",
        inventory_line_id: "",
        batch_number: "",
        expiry_date: "",
        vvm_confirmed: false,
        date_administered: ymdToday(),
        route: "",
        dose_number: "1",
        total_doses_required: "1",
        next_due_date: "",
        followup_scheduled: "yes",
        optional_clinical_notes: "",
        healthcare_facility: sessionFacilityValue,
        healthcare_practitioner: sessionPractitionerValue,
      }));
    } catch (err) {
      const fe = err as ApiError;
      if (fe.status === 401 || fe.status === 403) {
        router.push("/login");
        return;
      }
      setFormError(fe.message || "Failed to save immunisation record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={isAdministerDialogOpen}
        onOpenChange={(open) => {
          setIsAdministerDialogOpen(open);
          if (!open) {
            setPatientSearchQuery("");
            setManualInventoryEntry(false);
          }
        }}
      >
        <DialogTrigger asChild>{children}</DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
            <DialogHeader>
              <DialogTitle>Administer Vaccine</DialogTitle>
              <DialogDescription>
                Search and select values, then fill remaining fields manually.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {loadingFormData && (
                <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                  Loading dropdown data...
                </div>
              )}
              {formError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                  {formSuccess}
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Your facility and practitioner</Label>
                <p className="text-xs text-muted-foreground">
                  Taken from your signed-in account and cannot be changed for this record.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Healthcare facility *</Label>
                    <Input
                      readOnly
                      value={
                        sessionFacilityLabel ||
                        sessionFacilityValue ||
                        "—"
                      }
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Healthcare practitioner *</Label>
                    <Input
                      readOnly
                      value={sessionPractitionerLabel}
                      className="bg-muted/50"
                    />
                  </div>
                </div>
                {!sessionFacilityValue || !sessionPractitionerValue ? (
                  <p className="text-sm text-amber-700">
                    Your account is missing a facility or practitioner link. Ask an administrator
                    to assign them before recording administrations.
                  </p>
                ) : null}
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-semibold">Patient information</Label>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Patient *</Label>
                  <SearchableSelect
                    options={patientOptions}
                    value={form.patient}
                    onChange={(value) => {
                      onFieldChange("patient", value);
                      setPatientSearchQuery("");
                    }}
                    onQueryChange={setPatientSearchQuery}
                    suppressInlineCreate
                    placeholder="Select patient"
                    disabled={loadingFormData || addPatientSubmitting}
                  />
                  {showAddPatientBelowSearch ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => openAddPatientModal(patientSearchQuery)}
                      disabled={addPatientSubmitting}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add patient
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-semibold">Vaccine Details</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vaccine Name *</Label>
                    <SearchableSelect
                      options={vaccineOptions}
                      value={form.vaccine_name}
                      onChange={(value) => {
                        setManualInventoryEntry(false);
                        const vid = Number(value);
                        const forVaccine = Number.isFinite(vid)
                          ? inventoryRows.filter((r) => r.vaccine_id === vid)
                          : [];
                        const fefo = pickFefoInventoryLine(forVaccine);
                        setForm((prev) => ({
                          ...prev,
                          vaccine_name: value,
                          inventory_line_id: fefo ? String(fefo.id) : "",
                          batch_number: fefo?.batch_number?.trim() || "",
                          expiry_date: fefo?.expiry_date || "",
                        }));
                        setFormError(null);
                        setFormSuccess(null);
                      }}
                      placeholder="Select vaccine"
                      disabled={loadingFormData}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Outcome *</Label>
                    <Select
                      value={form.outcome}
                      onValueChange={(value: "administered" | "refused") => {
                        if (value === "refused") setManualInventoryEntry(false);
                        setForm((prev) => ({
                          ...prev,
                          outcome: value,
                          ...(value === "refused"
                            ? {
                                vvm_confirmed: false,
                                inventory_line_id: "",
                              }
                            : {}),
                        }));
                        setFormError(null);
                        setFormSuccess(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administered">Administered</SelectItem>
                        <SelectItem value="refused">Refused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.outcome === "administered" && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-muted-foreground">
                        Facility stock line (vial)
                      </Label>
                      <Select
                        value={form.inventory_line_id || "__manual__"}
                        onValueChange={(v) => {
                          if (v === "__manual__") {
                            setManualInventoryEntry(true);
                            setForm((prev) => ({
                              ...prev,
                              inventory_line_id: "",
                            }));
                            setFormError(null);
                            setFormSuccess(null);
                            return;
                          }
                          setManualInventoryEntry(false);
                          const row = inventoryForVaccine.find((r) => String(r.id) === v);
                          setForm((prev) => ({
                            ...prev,
                            inventory_line_id: v,
                            batch_number: row?.batch_number?.trim() || prev.batch_number,
                            expiry_date: row?.expiry_date || "",
                          }));
                          setFormError(null);
                          setFormSuccess(null);
                        }}
                        disabled={!form.healthcare_facility || !form.vaccine_name}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select stock line or enter manually" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__manual__">
                            Manual entry (not linked to stock)
                          </SelectItem>
                          {inventoryForVaccine.map((row) => (
                            <SelectItem key={row.id} value={String(row.id)}>
                              Lot {row.batch_number ?? "—"} · exp {row.expiry_date ?? "—"}{" "}
                              · qty {row.quantity_on_hand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        When you choose a vaccine, the earliest-expiring batch with stock is selected
                        (FEFO). You can switch lines or use manual entry; saving a linked line
                        decrements quantity by one dose.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-muted-foreground">Injection site</Label>
                    <Select
                      value={form.injection_site || "__none__"}
                      onValueChange={(value) =>
                        onFieldChange("injection_site", value === "__none__" ? "" : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent>
                        {INJECTION_SITE_OPTIONS.map((o) => (
                          <SelectItem
                            key={o.value || "none"}
                            value={o.value || "__none__"}
                          >
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      Route {form.outcome === "administered" ? "*" : ""}
                    </Label>
                    <SearchableSelect
                      options={routeOptions}
                      value={form.route}
                      onChange={(value) => onFieldChange("route", value)}
                      placeholder="Select route"
                      disabled={loadingFormData || form.outcome === "refused"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      Lot / batch number {form.outcome === "administered" ? "*" : ""}
                    </Label>
                    <Input
                      value={form.batch_number}
                      onChange={(e) => onFieldChange("batch_number", e.target.value)}
                      placeholder="Lot or batch number"
                      disabled={form.outcome === "refused"}
                    />
                  </div>
                  {form.outcome === "administered" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Vial expiry *</Label>
                        <Input
                          type="date"
                          value={form.expiry_date}
                          onChange={(e) => onFieldChange("expiry_date", e.target.value)}
                        />
                      </div>
                      <div className="flex items-start gap-3 sm:col-span-2">
                        <Checkbox
                          id="vvm-confirmed"
                          checked={form.vvm_confirmed}
                          onCheckedChange={(c) =>
                            onFieldChange("vvm_confirmed", c === true)
                          }
                        />
                        <Label
                          htmlFor="vvm-confirmed"
                          className="text-sm font-normal leading-snug cursor-pointer"
                        >
                          I confirm the Vaccine Vial Monitor (VVM) indicates this vial is usable
                          (not beyond discard stage) before administration. *
                        </Label>
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Date Administered *</Label>
                    <Input
                      type="date"
                      value={form.date_administered}
                      onChange={(e) => onFieldChange("date_administered", e.target.value)}
                    />
                  </div>
                  {form.outcome === "administered" && form.vaccine_name ? (
                    <div className="sm:col-span-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Schedule (EIR): </span>
                      {intervalScheduleSummary}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Dose number</Label>
                    <Select
                      value={form.dose_number}
                      onValueChange={(v) => onFieldChange("dose_number", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dose #" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(
                          { length: Math.max(1, masterScheduleTotalDoses) },
                          (_, i) => i + 1
                        ).map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            Dose {n}
                            {masterScheduleTotalDoses > 0 ? ` of ${masterScheduleTotalDoses}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Total doses in series</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.total_doses_required}
                      onChange={(e) => onFieldChange("total_doses_required", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Prefilled from the immunization schedule; change only if clinically needed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-semibold">Follow-up</Label>
                <p className="text-xs text-muted-foreground">
                  Next due date is recalculated from vaccine interval rules when you save. A
                  pending SMS reminder is created or updated for the same patient and vaccine.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Next Due Date</Label>
                    <Input
                      type="date"
                      value={form.next_due_date}
                      onChange={(e) => onFieldChange("next_due_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Schedule Follow-up</Label>
                    <Select
                      value={form.followup_scheduled}
                      onValueChange={(value: "yes" | "no") =>
                        onFieldChange("followup_scheduled", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.followup_scheduled === "yes" && (
                  <Button type="button" variant="outline" onClick={applySuggestedFollowup}>
                    Auto-calculate Next Due Date
                  </Button>
                )}
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label className="text-muted-foreground">Clinical Notes</Label>
                <Textarea
                  rows={3}
                  value={form.optional_clinical_notes}
                  onChange={(e) => onFieldChange("optional_clinical_notes", e.target.value)}
                  placeholder="Optional clinical notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAdministerDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={submitRecord} disabled={submitting} className="gap-2">
                <Syringe className="h-4 w-4" />
                {submitting ? "Saving..." : "Record Administration"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <Dialog
          open={isAddPatientOpen}
          onOpenChange={(open) => {
            setIsAddPatientOpen(open);
            if (!open) {
              setAddPatientForm({
                fullName: "",
                dob: "",
                gender: "",
                phone: "",
                email: "",
                address: "",
                guardian: "",
                guardianPhone: "",
              });
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Patient</DialogTitle>
              <DialogDescription>
                Enter the patient details to create a new record
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="administer-add-patient-name">Full name *</Label>
                  <Input
                    id="administer-add-patient-name"
                    placeholder="Enter patient name"
                    value={addPatientForm.fullName}
                    onChange={(e) =>
                      setAddPatientForm((p) => ({ ...p, fullName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="administer-add-patient-dob">Date of birth</Label>
                  <Input
                    id="administer-add-patient-dob"
                    type="date"
                    value={addPatientForm.dob}
                    onChange={(e) =>
                      setAddPatientForm((p) => ({ ...p, dob: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={addPatientForm.gender || "__unset__"}
                    onValueChange={(v) =>
                      setAddPatientForm((p) => ({
                        ...p,
                        gender: v === "__unset__" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unset__">Not specified</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="administer-add-patient-phone">Phone number</Label>
                  <Input
                    id="administer-add-patient-phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={addPatientForm.phone}
                    onChange={(e) =>
                      setAddPatientForm((p) => ({ ...p, phone: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="administer-add-patient-email">Email</Label>
                <Input
                  id="administer-add-patient-email"
                  type="email"
                  placeholder="patient@email.com"
                  value={addPatientForm.email}
                  onChange={(e) =>
                    setAddPatientForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="administer-add-patient-address">Address</Label>
                <Input
                  id="administer-add-patient-address"
                  placeholder="Enter full address"
                  value={addPatientForm.address}
                  onChange={(e) =>
                    setAddPatientForm((p) => ({ ...p, address: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="administer-add-patient-guardian">Guardian name</Label>
                  <Input
                    id="administer-add-patient-guardian"
                    placeholder="Guardian name (if minor)"
                    value={addPatientForm.guardian}
                    onChange={(e) =>
                      setAddPatientForm((p) => ({ ...p, guardian: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="administer-add-patient-guardian-phone">Guardian phone</Label>
                  <Input
                    id="administer-add-patient-guardian-phone"
                    type="tel"
                    placeholder="Guardian phone"
                    value={addPatientForm.guardianPhone}
                    onChange={(e) =>
                      setAddPatientForm((p) => ({ ...p, guardianPhone: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddPatientOpen(false)}
                disabled={addPatientSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitAddPatientModal}
                disabled={addPatientSubmitting}
              >
                {addPatientSubmitting ? "Saving..." : "Add Patient"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  );
}
