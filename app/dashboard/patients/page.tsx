"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Syringe,
  Phone,
  Mail,
  MapPin,
  User,
  Calendar,
  Users,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { vaccineRecords } from "@/lib/mock-data";
import type { CreatePatientInput, PatientRow } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPatient,
  getGuardians,
  getPatients,
  ApiError,
} from "@/lib/api";
import {
  downloadCsvFile,
  exportPatientsCsv,
  parseCsv,
  patientRowsToImportPayloads,
  patientTemplateCsv,
  tableToObjects,
} from "@/lib/csv-import-export";
import { CsvDataMenu } from "@/components/csv-data-menu";
import { useAppSession } from "@/components/app-session-provider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/** Patients under this age use parent/guardian contact details by default. */
const MINOR_THRESHOLD_YEARS = 18;

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

function splitFullName(full: string): {
  patient_name: string;
  first_name: string;
  last_name?: string;
} {
  const t = full.trim();
  const parts = t.split(/\s+/).filter(Boolean);
  const first_name = parts[0] || "";
  const last_name =
    parts.length > 1 ? parts.slice(1).join(" ") : undefined;
  return { patient_name: t || first_name, first_name, last_name };
}

type UiPatient = {
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
};

export default function PatientsPage() {
  const router = useRouter();
  const session = useAppSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<UiPatient | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [patients, setPatients] = useState<UiPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapBackendPatient = (row: PatientRow): UiPatient => {
    const g = row.guardian;
    return {
      id: row.name,
      name: row.patient_name || row.name,
      dateOfBirth: row.dob || "",
      gender: row.sex || "",
      phone: row.mobile || "",
      email: row.email ?? "",
      address: row.address ?? "",
      guardianId: row.guardian_id ?? undefined,
      guardianName: g?.name,
      guardianPhone: g?.phone ?? undefined,
      guardianEmail: g?.email ?? undefined,
      guardianAddress: g?.address ?? undefined,
    };
  };

  const [addFullName, setAddFullName] = useState("");
  const [addDob, setAddDob] = useState("");
  const [addGender, setAddGender] = useState("");
  const [addPatientPhone, setAddPatientPhone] = useState("");
  const [addPatientEmail, setAddPatientEmail] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [guardianMode, setGuardianMode] = useState<"none" | "new" | "existing">(
    "none"
  );
  const [existingGuardianId, setExistingGuardianId] = useState("");
  const [guardianPickerOpen, setGuardianPickerOpen] = useState(false);
  const [guardianSearchQuery, setGuardianSearchQuery] = useState("");
  const [newGuardianName, setNewGuardianName] = useState("");
  const [newGuardianPhone, setNewGuardianPhone] = useState("");
  const [newGuardianEmail, setNewGuardianEmail] = useState("");
  const [newGuardianAddress, setNewGuardianAddress] = useState("");
  const [guardianOptions, setGuardianOptions] = useState<
    { id: string; label: string }[]
  >([]);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [importSummaryOpen, setImportSummaryOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    errors: string[];
  } | null>(null);

  const addIsMinor = isMinorDob(addDob);

  const selectedGuardianLabel = useMemo(
    () => guardianOptions.find((g) => g.id === existingGuardianId)?.label,
    [guardianOptions, existingGuardianId]
  );

  const resetAddForm = () => {
    setAddFullName("");
    setAddDob("");
    setAddGender("");
    setAddPatientPhone("");
    setAddPatientEmail("");
    setAddAddress("");
    setGuardianMode("none");
    setExistingGuardianId("");
    setGuardianPickerOpen(false);
    setGuardianSearchQuery("");
    setNewGuardianName("");
    setNewGuardianPhone("");
    setNewGuardianEmail("");
    setNewGuardianAddress("");
    setAddFormError(null);
  };

  useEffect(() => {
    if (!isAddDialogOpen) return;
    let cancelled = false;
    const q = guardianSearchQuery.trim();
    const delay = q.length === 0 ? 0 : 300;
    const t = window.setTimeout(async () => {
      try {
        const rows = await getGuardians({
          search: q || undefined,
          limit: 100,
          offset: 0,
        });
        if (cancelled) return;
        setGuardianOptions(
          rows.map((r) => ({
            id: r.id,
            label: [r.name, r.phone || r.email].filter(Boolean).join(" · "),
          }))
        );
      } catch {
        if (!cancelled) setGuardianOptions([]);
      }
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [isAddDialogOpen, guardianSearchQuery]);

  useEffect(() => {
    if (addIsMinor && guardianMode === "none") {
      setGuardianMode("new");
    }
  }, [addIsMinor, guardianMode]);

  async function handleAddPatient(e: React.FormEvent) {
    e.preventDefault();
    setAddFormError(null);
    const nameParts = splitFullName(addFullName);
    if (!nameParts.patient_name) {
      setAddFormError("Enter the patient’s full name.");
      return;
    }
    if (!addDob) {
      setAddFormError("Enter the date of birth.");
      return;
    }
    if (!addGender) {
      setAddFormError("Select gender.");
      return;
    }
    if (addIsMinor && guardianMode === "none") {
      setAddFormError(
        "Minors need a parent or guardian — add a new one or link an existing guardian."
      );
      return;
    }
    if (addIsMinor) {
      if (guardianMode === "existing") {
        if (!existingGuardianId) {
          setAddFormError(
            "Select a parent or guardian, or add a new guardian record."
          );
          return;
        }
      } else if (guardianMode === "new") {
        if (!newGuardianName.trim()) {
          setAddFormError("Enter the parent or guardian’s name.");
          return;
        }
        if (!newGuardianPhone.trim() && !newGuardianEmail.trim()) {
          setAddFormError(
            "Provide at least a phone number or email for the guardian."
          );
          return;
        }
      }
    }

    const facilityId = session.bootstrap?.user?.facility_id ?? null;

    setAddSubmitting(true);
    try {
      const payload: CreatePatientInput = {
        ...nameParts,
        sex: addGender,
        date_of_birth: addDob,
        mobile: addPatientPhone.trim() || null,
        email: addPatientEmail.trim() || null,
        address: addAddress.trim() || null,
        facility_id: facilityId,
      };

      if (addIsMinor) {
        if (guardianMode === "existing") {
          payload.guardian_id = existingGuardianId;
        } else if (guardianMode === "new") {
          payload.guardian = {
            name: newGuardianName.trim(),
            phone: newGuardianPhone.trim() || null,
            email: newGuardianEmail.trim() || null,
            address: newGuardianAddress.trim() || null,
          };
        }
      } else if (guardianMode === "existing" && existingGuardianId) {
        payload.guardian_id = existingGuardianId;
      } else if (guardianMode === "new" && newGuardianName.trim()) {
        payload.guardian = {
          name: newGuardianName.trim(),
          phone: newGuardianPhone.trim() || null,
          email: newGuardianEmail.trim() || null,
          address: newGuardianAddress.trim() || null,
        };
      }

      await createPatient(payload);
      const data = await getPatients({ search: "", limit: 20, offset: 0 });
      setPatients(data.map(mapBackendPatient));
      setIsAddDialogOpen(false);
      resetAddForm();
    } catch (err) {
      const fe = err as ApiError;
      setAddFormError(fe.message || "Could not create patient");
    } finally {
      setAddSubmitting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPatients({ search: "", limit: 20, offset: 0 });
        if (!cancelled) {
          setPatients(data.map(mapBackendPatient));
        }
      } catch (err) {
        const fe = err as ApiError;
        if (!cancelled) {
          if (fe.status === 401 || fe.status === 403) {
            router.push("/login");
          }
          setError(fe.message || "Failed to load patients");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleExportPatientsCsv() {
    setCsvBusy(true);
    setError(null);
    try {
      const data = await getPatients({ search: "", limit: 5000, offset: 0 });
      const csv = exportPatientsCsv(data.map(mapBackendPatient));
      const y = new Date();
      const stamp = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      downloadCsvFile(`patients-export-${stamp}.csv`, csv);
    } catch (err) {
      const fe = err as ApiError;
      setError(fe.message || "Export failed");
    } finally {
      setCsvBusy(false);
    }
  }

  function handleDownloadPatientTemplate() {
    const content = patientTemplateCsv(true);
    const y = new Date();
    const stamp = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    downloadCsvFile(`patients-import-template-${stamp}.csv`, content);
  }

  async function handleImportPatientsCsv(file: File) {
    setError(null);
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const table = parseCsv(text);
    const { records } = tableToObjects(table);
    const facilityId = session.bootstrap?.user?.facility_id ?? null;
    const payloads = patientRowsToImportPayloads(records, facilityId);
    const errors: string[] = [];
    let created = 0;
    for (const p of payloads) {
      if (!p.ok) {
        errors.push(`Row ${p.rowIndex}: ${p.error}`);
        continue;
      }
      try {
        await createPatient(p.payload);
        created++;
      } catch (err) {
        const fe = err as ApiError;
        errors.push(
          `Row ${p.rowIndex}: ${fe.message || "Could not create patient"}`
        );
      }
    }
    setImportSummary({ created, errors });
    setImportSummaryOpen(true);
    try {
      const data = await getPatients({ search: "", limit: 20, offset: 0 });
      setPatients(data.map(mapBackendPatient));
    } catch {
      /* ignore */
    }
  }

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPatientVaccinations = (patientId: string) => {
    return vaccineRecords.filter((r) => r.patientId === patientId);
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();

    if (years < 1) {
      const totalMonths =
        months + (today.getDate() < birthDate.getDate() ? -1 : 0);
      return `${totalMonths < 0 ? 12 + totalMonths : totalMonths} months`;
    }
    return `${years} years`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Patients
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage patient records and vaccination history
          </p>
          {session.displayName && (
            <p className="mt-1 text-xs text-muted-foreground">
              Signed in as {session.displayName}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CsvDataMenu
            onExport={() => void handleExportPatientsCsv()}
            onDownloadTemplate={handleDownloadPatientTemplate}
            onImportFile={(f) => void handleImportPatientsCsv(f)}
            busy={csvBusy}
          />
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (open) resetAddForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleAddPatient}>
              <DialogHeader>
                <DialogTitle>Add New Patient</DialogTitle>
                <DialogDescription>
                  For children and teens under {MINOR_THRESHOLD_YEARS}, use a
                  parent or guardian for contact details. One guardian can be
                  linked to several children.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {addFormError && (
                  <p className="text-sm text-destructive" role="alert">
                    {addFormError}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Patient name"
                      value={addFullName}
                      onChange={(e) => setAddFullName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={addDob}
                      onChange={(e) => setAddDob(e.target.value)}
                    />
                  </div>
                </div>
                {addDob && (
                  <p className="text-xs text-muted-foreground">
                    {addIsMinor
                      ? `Under ${MINOR_THRESHOLD_YEARS} — contact should be a parent or guardian.`
                      : `Age ${ageInFullYears(addDob) ?? "—"} — patient may have their own phone or email.`}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={addGender} onValueChange={setAddGender}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Patient phone{" "}
                      {addIsMinor && (
                        <span className="text-muted-foreground font-normal">
                          (optional)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={
                        addIsMinor ? "Usually left blank for young children" : "+1…"
                      }
                      value={addPatientPhone}
                      onChange={(e) => setAddPatientPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Patient email{" "}
                    {addIsMinor && (
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={
                      addIsMinor ? "Optional for minors" : "patient@email.com"
                    }
                    value={addPatientEmail}
                    onChange={(e) => setAddPatientEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Home address"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                  />
                </div>

                <div
                  className={cn(
                    "rounded-lg border p-4 space-y-3",
                    addIsMinor ? "border-primary/30 bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4" />
                    Parent / guardian
                    {addIsMinor && (
                      <Badge variant="secondary" className="text-xs">
                        Required for minors
                      </Badge>
                    )}
                  </div>
                  <RadioGroup
                    value={guardianMode}
                    onValueChange={(v) =>
                      setGuardianMode(v as "none" | "new" | "existing")
                    }
                    className="grid gap-2"
                  >
                    {!addIsMinor && (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <RadioGroupItem value="none" id="gm-none" />
                        <span>No guardian on file</span>
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="new" id="gm-new" />
                      <span>Add new guardian</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="existing" id="gm-ex" />
                      <span>Link existing guardian (same adult, multiple children)</span>
                    </label>
                  </RadioGroup>

                  {guardianMode === "existing" && (
                    <div className="space-y-2 pt-1">
                      <Label htmlFor="guardian-combobox">Guardian</Label>
                      {guardianOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No guardians yet — choose “Add new guardian” or create
                          one from the first child.
                        </p>
                      ) : (
                        <Popover
                          open={guardianPickerOpen}
                          onOpenChange={(open) => {
                            setGuardianPickerOpen(open);
                            if (!open) setGuardianSearchQuery("");
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              id="guardian-combobox"
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={guardianPickerOpen}
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {selectedGuardianLabel ||
                                  "Search and select a guardian…"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-0"
                            align="start"
                          >
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Search by name, phone, or ID…"
                                value={guardianSearchQuery}
                                onValueChange={setGuardianSearchQuery}
                              />
                              <CommandList>
                                <CommandEmpty>No guardian matches.</CommandEmpty>
                                <CommandGroup>
                                  {guardianOptions.map((g) => (
                                    <CommandItem
                                      key={g.id}
                                      value={`${g.label} ${g.id}`}
                                      onSelect={() => {
                                        setExistingGuardianId(g.id);
                                        setGuardianPickerOpen(false);
                                        setGuardianSearchQuery("");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          existingGuardianId === g.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {g.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  )}

                  {guardianMode === "new" && (
                    <div className="grid gap-3 pt-1">
                      <div className="space-y-2">
                        <Label htmlFor="g-name">Guardian full name</Label>
                        <Input
                          id="g-name"
                          placeholder="e.g. Parent or legal guardian"
                          value={newGuardianName}
                          onChange={(e) => setNewGuardianName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="g-phone">Guardian phone</Label>
                          <Input
                            id="g-phone"
                            type="tel"
                            placeholder="Primary number"
                            value={newGuardianPhone}
                            onChange={(e) => setNewGuardianPhone(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="g-email">Guardian email</Label>
                          <Input
                            id="g-email"
                            type="email"
                            placeholder="For reminders"
                            value={newGuardianEmail}
                            onChange={(e) => setNewGuardianEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="g-addr">Guardian address (optional)</Label>
                        <Input
                          id="g-addr"
                          placeholder="If different from patient"
                          value={newGuardianAddress}
                          onChange={(e) => setNewGuardianAddress(e.target.value)}
                        />
                      </div>
                      {addIsMinor && (
                        <p className="text-xs text-muted-foreground">
                          For the next sibling, pick “Link existing guardian” and
                          select this same person.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addSubmitting}>
                  {addSubmitting ? "Saving…" : "Add Patient"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Dialog open={importSummaryOpen} onOpenChange={setImportSummaryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import finished</DialogTitle>
            <DialogDescription>
              {importSummary
                ? `${importSummary.created} patient(s) created.${
                    importSummary.errors.length > 0
                      ? ` ${importSummary.errors.length} row(s) could not be imported.`
                      : ""
                  }`
                : null}
            </DialogDescription>
          </DialogHeader>
          {importSummary && importSummary.errors.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4 text-sm text-destructive">
              {importSummary.errors.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setImportSummaryOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search and Filters */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, ID, or guardian contact…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending Vaccines</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Patient Records ({filteredPatients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="hidden md:table-cell">Age</TableHead>
                  <TableHead className="hidden lg:table-cell">Contact</TableHead>
                  <TableHead>Vaccinations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => {
                  const patientVaccines = getPatientVaccinations(patient.id);
                  const completedCount = patientVaccines.filter(
                    (v) => v.status === "completed"
                  ).length;
                  const pendingCount = patientVaccines.filter(
                    (v) => v.status !== "completed"
                  ).length;

                  return (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {patient.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {patient.gender}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {patient.id}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {calculateAge(patient.dateOfBirth)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm">
                          {isMinorDob(patient.dateOfBirth) &&
                          (patient.guardianName ||
                            patient.guardianPhone ||
                            patient.guardianEmail) ? (
                            <>
                              <p className="text-xs font-medium text-muted-foreground">
                                Guardian
                              </p>
                              <p className="font-medium">
                                {patient.guardianName ?? "—"}
                              </p>
                              {patient.guardianPhone ? (
                                <p>{patient.guardianPhone}</p>
                              ) : null}
                              {patient.guardianEmail ? (
                                <p className="text-muted-foreground">
                                  {patient.guardianEmail}
                                </p>
                              ) : null}
                              {(patient.phone || patient.email) && (
                                <p className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border/60">
                                  Patient:{" "}
                                  {[patient.phone, patient.email]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <p>{patient.phone || "—"}</p>
                              <p className="text-muted-foreground">
                                {patient.email || ""}
                              </p>
                              {patient.guardianName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Also: {patient.guardianName}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge
                            variant="outline"
                            className="bg-success/10 text-success border-success/20"
                          >
                            {completedCount} done
                          </Badge>
                          {pendingCount > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-warning/10 text-warning-foreground border-warning/20"
                            >
                              {pendingCount} pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setSelectedPatient(patient)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/vaccinations?patient=${patient.id}`}>
                                <Syringe className="mr-2 h-4 w-4" />
                                View Vaccinations
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Phone className="mr-2 h-4 w-4" />
                              Send Reminder
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Patient Detail Dialog */}
      <Dialog
        open={!!selectedPatient}
        onOpenChange={() => setSelectedPatient(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          {selectedPatient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedPatient.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p>{selectedPatient.name}</p>
                    <Badge variant="outline" className="font-mono text-xs mt-1">
                      {selectedPatient.id}
                    </Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Date of Birth
                      </p>
                      <p className="font-medium">
                        {selectedPatient.dateOfBirth}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-medium">{selectedPatient.gender}</p>
                    </div>
                  </div>
                </div>

                {selectedPatient.guardianName &&
                  isMinorDob(selectedPatient.dateOfBirth) && (
                    <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 space-y-2">
                      <p className="text-sm font-medium text-accent flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Parent / guardian (primary contact)
                      </p>
                      <p className="font-medium">{selectedPatient.guardianName}</p>
                      {selectedPatient.guardianId && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Guardian ID #{selectedPatient.guardianId}
                        </p>
                      )}
                      <div className="grid gap-1 text-sm">
                        {selectedPatient.guardianPhone ? (
                          <p>
                            <span className="text-muted-foreground">Phone: </span>
                            {selectedPatient.guardianPhone}
                          </p>
                        ) : null}
                        {selectedPatient.guardianEmail ? (
                          <p>
                            <span className="text-muted-foreground">Email: </span>
                            {selectedPatient.guardianEmail}
                          </p>
                        ) : null}
                        {selectedPatient.guardianAddress ? (
                          <p>
                            <span className="text-muted-foreground">Address: </span>
                            {selectedPatient.guardianAddress}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}

                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isMinorDob(selectedPatient.dateOfBirth)
                        ? "Patient phone (optional)"
                        : "Phone"}
                    </p>
                    <p className="font-medium">
                      {selectedPatient.phone || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isMinorDob(selectedPatient.dateOfBirth)
                        ? "Patient email (optional)"
                        : "Email"}
                    </p>
                    <p className="font-medium">
                      {selectedPatient.email || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {selectedPatient.address || "—"}
                    </p>
                  </div>
                </div>

                {selectedPatient.guardianName &&
                  !isMinorDob(selectedPatient.dateOfBirth) && (
                    <div className="p-3 rounded-lg border border-border">
                      <p className="text-sm font-medium mb-1">Also on file</p>
                      <p className="text-sm">
                        Guardian: {selectedPatient.guardianName}
                        {selectedPatient.guardianPhone
                          ? ` · ${selectedPatient.guardianPhone}`
                          : ""}
                      </p>
                    </div>
                  )}
              </div>
              <DialogFooter>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/vaccinations?patient=${selectedPatient.id}`}>
                    <Syringe className="mr-2 h-4 w-4" />
                    View Vaccination History
                  </Link>
                </Button>
                <Button>Edit Patient</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
