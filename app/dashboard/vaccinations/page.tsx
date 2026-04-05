"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Syringe,
} from "lucide-react";
import { getImmunisationRecords, ApiError } from "@/lib/api";
import type { ImmunisationRecordRow } from "@/lib/types";
import { deriveImmunisationUiStatus } from "@/lib/immunisation-status";
import { AdministerVaccineDialog } from "@/components/administer-vaccine-dialog";

const statusColors = {
  completed: "bg-success/10 text-success border-success/20",
  scheduled: "bg-primary/10 text-primary border-primary/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-warning/10 text-warning-foreground border-warning/20",
};

const statusIcons = {
  completed: CheckCircle2,
  scheduled: Clock,
  overdue: AlertTriangle,
  pending: Clock,
};

export default function VaccinationsPage() {
  type UiRecord = {
    id: string;
    patientName: string;
    vaccineName: string;
    batchNumber: string;
    dateAdministered: string;
    doseNumber: number;
    totalDosesRequired: number;
    route: string;
    administeredBy: string;
    facility: string;
    nextDueDate?: string;
    followUpScheduled: boolean;
    notes?: string;
    status: "completed" | "scheduled" | "overdue" | "pending";
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [records, setRecords] = useState<UiRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<UiRecord | null>(null);

  const toUiRecord = (row: ImmunisationRecordRow): UiRecord => ({
    id: row.name,
    patientName: row.patient,
    vaccineName: row.vaccine_name,
    batchNumber: row.batch_number || "-",
    dateAdministered: row.date_administered || "",
    doseNumber: row.dose_number || 0,
    totalDosesRequired: row.total_doses_required || 0,
    route: row.route || "-",
    administeredBy: row.healthcare_practitioner || "-",
    facility: row.healthcare_facility || "-",
    nextDueDate: row.next_due_date || undefined,
    followUpScheduled: !!row.followup_scheduled,
    notes: row.optional_clinical_notes || undefined,
    status: deriveImmunisationUiStatus(row),
  });

  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getImmunisationRecords({
        search: searchQuery,
        limit: 100,
        offset: 0,
      });
      setRecords(data.map(toUiRecord));
    } catch (err) {
      const fe = err as ApiError;
      setError(fe.message || "Failed to load immunisation records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch =
        record.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.vaccineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: records.length,
      completed: records.filter((r) => r.status === "completed").length,
      scheduled: records.filter((r) => r.status === "scheduled").length,
      overdue: records.filter((r) => r.status === "overdue").length,
      pending: records.filter((r) => r.status === "pending").length,
    };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Vaccination Records
          </h1>
          <p className="text-muted-foreground mt-1">
            Registry of immunisation records from vaccine administration. Log doses with Administer Vaccine; they appear here automatically.
          </p>
        </div>
        <AdministerVaccineDialog onRecordSaved={loadRecords}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Administer Vaccine
          </Button>
        </AdministerVaccineDialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Syringe className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-success">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-primary">
                  {stats.scheduled}
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-chart-4">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-chart-4/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">
                  {stats.overdue}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Tabs defaultValue="all" onValueChange={setStatusFilter}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value={statusFilter} className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Vaccine</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Batch #
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Dose
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Date
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => {
                      const StatusIcon = statusIcons[record.status];
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {record.patientName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {record.patientName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.vaccineName}</p>
                              <p className="text-xs text-muted-foreground">
                                {record.route}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-sm">
                            {record.batchNumber}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {record.doseNumber}/{record.totalDosesRequired}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {record.status === "completed"
                              ? record.dateAdministered
                              : record.nextDueDate || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColors[record.status]}
                            >
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {record.status}
                            </Badge>
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
                                  onClick={() => setSelectedRecord(record)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Record
                                </DropdownMenuItem>
                                {record.status !== "completed" && (
                                  <DropdownMenuItem>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Bell className="mr-2 h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      {/* Record Detail Dialog */}
      <Dialog
        open={!!selectedRecord}
        onOpenChange={() => setSelectedRecord(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          {selectedRecord && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Syringe className="h-5 w-5 text-primary" />
                  Vaccination Record Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Patient Info */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedRecord.patientName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedRecord.patientName}</p>
                    <Badge
                      variant="outline"
                      className={statusColors[selectedRecord.status]}
                    >
                      {selectedRecord.status}
                    </Badge>
                  </div>
                </div>

                {/* Vaccine Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Vaccine</p>
                    <p className="font-medium">{selectedRecord.vaccineName}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Batch Number</p>
                    <p className="font-medium font-mono">
                      {selectedRecord.batchNumber}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Dose</p>
                    <p className="font-medium">
                      {selectedRecord.doseNumber} of{" "}
                      {selectedRecord.totalDosesRequired}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Route</p>
                    <p className="font-medium">{selectedRecord.route}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">
                      Date Administered
                    </p>
                    <p className="font-medium">
                      {selectedRecord.dateAdministered || "Not administered yet"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Facility</p>
                    <p className="font-medium">{selectedRecord.facility}</p>
                  </div>
                </div>

                {/* Administered By */}
                {selectedRecord.administeredBy && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">
                      Administered By
                    </p>
                    <p className="font-medium">{selectedRecord.administeredBy}</p>
                  </div>
                )}

                {/* Follow Up Info */}
                {selectedRecord.nextDueDate && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground">Next Due Date</p>
                    <p className="font-medium">{selectedRecord.nextDueDate}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Follow-up:{" "}
                      {selectedRecord.followUpScheduled
                        ? "Scheduled"
                        : "Not scheduled"}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {selectedRecord.notes && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">
                      Clinical Notes
                    </p>
                    <p className="text-sm mt-1">{selectedRecord.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRecord(null)}
                >
                  Close
                </Button>
                {selectedRecord.status !== "completed" && (
                  <Button>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark Complete
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
