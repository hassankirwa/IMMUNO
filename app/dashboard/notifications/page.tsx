"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Search,
  Send,
  MessageSquare,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Filter,
  Plus,
} from "lucide-react";
import {
  getImmunisationRecords,
  getNotifications,
  getPatients,
} from "@/lib/api";
import type { Notification, PatientRow, ImmunisationRecordRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppSession } from "@/components/app-session-provider";

/** Outbound compose/bulk (and row Send/Retry) — admins only; not for health_officer. */
function canSendOutboundNotifications(roles: string[]): boolean {
  return roles.includes("admin");
}

const channelIcons = {
  sms: Phone,
  email: Mail,
  whatsapp: MessageSquare,
};

const channelColors = {
  sms: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  email: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  whatsapp: "bg-success/10 text-success border-success/20",
};

const statusColors = {
  pending: "bg-warning/10 text-warning-foreground border-warning/20",
  sent: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function NotificationsPage() {
  const session = useAppSession();
  const canSend = canSendOutboundNotifications(session.roles);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [immunisationRecords, setImmunisationRecords] = useState<ImmunisationRecordRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [notifRows, patientRows, recordRows] = await Promise.all([
          getNotifications({ limit: 100 }),
          getPatients({ limit: 200 }),
          getImmunisationRecords({ limit: 200 }),
        ]);
        if (cancelled) return;
        setNotifications(notifRows);
        setPatients(patientRows);
        setImmunisationRecords(recordRows);
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setPatients([]);
          setImmunisationRecords([]);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesSearch =
        notification.patientName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || notification.status === statusFilter;

      const matchesChannel =
        channelFilter === "all" || notification.type === channelFilter;

      return matchesSearch && matchesStatus && matchesChannel;
    });
  }, [searchQuery, statusFilter, channelFilter]);

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      pending: notifications.filter((n) => n.status === "pending").length,
      sent: notifications.filter((n) => n.status === "sent").length,
      failed: notifications.filter((n) => n.status === "failed").length,
    };
  }, []);

  const overduePatients = useMemo(() => {
    const byName = new Map(patients.map((p) => [p.name, p]));
    const seen = new Set<string>();
    const out: PatientRow[] = [];
    for (const row of immunisationRecords) {
      if (!row.next_due_date) continue;
      const isOverdue = new Date(row.next_due_date).getTime() < Date.now();
      if (!isOverdue) continue;
      if (seen.has(row.patient)) continue;
      seen.add(row.patient);
      const patient = byName.get(row.patient);
      if (patient) out.push(patient);
    }
    return out;
  }, [immunisationRecords, patients]);

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Notification Center
          </h1>
          <p className="text-muted-foreground mt-1">
            {canSend
              ? "Send reminders via SMS, Email, and WhatsApp"
              : "View notification history and delivery status"}
          </p>
        </div>
        {canSend && (
        <div className="flex gap-2">
          <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Compose Notification</DialogTitle>
                <DialogDescription>
                  Send a notification to a specific patient
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Patient</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.name} value={patient.name}>
                          {patient.patient_name || patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notification Channels</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="sms"
                        checked={selectedChannels.includes("sms")}
                        onCheckedChange={() => toggleChannel("sms")}
                      />
                      <Label htmlFor="sms" className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        SMS
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="email"
                        checked={selectedChannels.includes("email")}
                        onCheckedChange={() => toggleChannel("email")}
                      />
                      <Label htmlFor="email" className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="whatsapp"
                        checked={selectedChannels.includes("whatsapp")}
                        onCheckedChange={() => toggleChannel("whatsapp")}
                      />
                      <Label htmlFor="whatsapp" className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reminder">
                        Vaccination Reminder
                      </SelectItem>
                      <SelectItem value="overdue">Overdue Notice</SelectItem>
                      <SelectItem value="confirmation">
                        Appointment Confirmation
                      </SelectItem>
                      <SelectItem value="followup">Follow-up Reminder</SelectItem>
                      <SelectItem value="custom">Custom Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Enter your message here..."
                    rows={4}
                    defaultValue="Dear [Patient Name], this is a reminder that your [Vaccine Name] vaccination is scheduled for [Date]. Please visit [Facility Name] at your earliest convenience."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="send-now"
                        name="schedule"
                        defaultChecked
                        className="h-4 w-4"
                      />
                      <Label htmlFor="send-now">Send Now</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="schedule-later"
                        name="schedule"
                        className="h-4 w-4"
                      />
                      <Label htmlFor="schedule-later">Schedule Later</Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsComposeOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setIsComposeOpen(false)}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send Notification
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Users className="h-4 w-4" />
                Bulk Send
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Bulk Notification</DialogTitle>
                <DialogDescription>
                  Send notifications to multiple patients at once via SMS, Email,
                  or WhatsApp
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select defaultValue="overdue">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overdue">
                        Overdue Vaccinations ({overduePatients.length} patients)
                      </SelectItem>
                      <SelectItem value="upcoming">
                        Upcoming This Week
                      </SelectItem>
                      <SelectItem value="pending">Pending Follow-ups</SelectItem>
                      <SelectItem value="all">All Patients</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm font-medium mb-2">Selected Recipients</p>
                  <div className="flex flex-wrap gap-2">
                    {overduePatients.slice(0, 5).map((patient) => (
                      <Badge
                        key={patient?.name}
                        variant="outline"
                        className="bg-card"
                      >
                        {patient?.patient_name || patient?.name}
                      </Badge>
                    ))}
                    {overduePatients.length > 5 && (
                      <Badge variant="outline" className="bg-primary/10">
                        +{overduePatients.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notification Channels</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                        selectedChannels.includes("sms")
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => toggleChannel("sms")}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={selectedChannels.includes("sms")}
                          onCheckedChange={() => toggleChannel("sms")}
                        />
                        <Phone className="h-5 w-5 text-chart-1" />
                      </div>
                      <p className="font-medium">SMS</p>
                      <p className="text-xs text-muted-foreground">
                        BulkSMS Gateway
                      </p>
                    </div>
                    <div
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                        selectedChannels.includes("email")
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => toggleChannel("email")}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={selectedChannels.includes("email")}
                          onCheckedChange={() => toggleChannel("email")}
                        />
                        <Mail className="h-5 w-5 text-chart-2" />
                      </div>
                      <p className="font-medium">Email</p>
                      <p className="text-xs text-muted-foreground">SMTP Server</p>
                    </div>
                    <div
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                        selectedChannels.includes("whatsapp")
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => toggleChannel("whatsapp")}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={selectedChannels.includes("whatsapp")}
                          onCheckedChange={() => toggleChannel("whatsapp")}
                        />
                        <MessageSquare className="h-5 w-5 text-success" />
                      </div>
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-xs text-muted-foreground">
                        WhatsApp Business API
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Message Template</Label>
                  <Textarea
                    rows={4}
                    defaultValue="URGENT: Dear [Patient Name], your [Vaccine Name] vaccination is overdue. Please contact [Facility Name] at [Phone] to schedule your appointment immediately. Your health is our priority."
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables: [Patient Name], [Vaccine Name], [Facility Name],
                    [Phone], [Date]
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsBulkOpen(false)} className="gap-2">
                  <Send className="h-4 w-4" />
                  Send to {overduePatients.length} Recipients
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Send className="h-8 w-8 text-primary/30" />
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
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-success">{stats.sent}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-destructive">
                  {stats.failed}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <Tabs defaultValue="all" onValueChange={setStatusFilter}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
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
                      <TableHead>Channel</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Vaccine
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Message
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map((notification) => {
                      const ChannelIcon = channelIcons[notification.type];
                      return (
                        <TableRow key={notification.id}>
                          <TableCell className="font-medium">
                            {notification.patientName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1",
                                channelColors[notification.type]
                              )}
                            >
                              <ChannelIcon className="h-3 w-3" />
                              {notification.type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {notification.vaccineName}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[300px]">
                            <p className="truncate text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                          </TableCell>
                          <TableCell>{notification.scheduledDate}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColors[notification.status]}
                            >
                              {notification.status === "sent" && (
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                              )}
                              {notification.status === "pending" && (
                                <Clock className="mr-1 h-3 w-3" />
                              )}
                              {notification.status === "failed" && (
                                <AlertCircle className="mr-1 h-3 w-3" />
                              )}
                              {notification.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canSend && notification.status === "pending" && (
                              <Button size="sm" variant="outline" className="gap-1">
                                <Send className="h-3 w-3" />
                                Send Now
                              </Button>
                            )}
                            {canSend && notification.status === "failed" && (
                              <Button size="sm" variant="outline" className="gap-1">
                                <Send className="h-3 w-3" />
                                Retry
                              </Button>
                            )}
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
    </div>
  );
}
