"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getImmunisationRecords } from "@/lib/api";
import type { ImmunisationRecordRow } from "@/lib/types";
import { deriveImmunisationUiStatus } from "@/lib/immunisation-status";
import { AdministerVaccineDialog } from "@/components/administer-vaccine-dialog";

export default function AdministerPage() {
  const [records, setRecords] = useState<ImmunisationRecordRow[]>([]);

  const refreshStats = useCallback(async () => {
    try {
      const data = await getImmunisationRecords({ limit: 100, offset: 0 });
      setRecords(data);
    } catch {
      setRecords([]);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const stats = useMemo(() => {
    let completed = 0;
    let scheduled = 0;
    let pending = 0;
    let overdue = 0;
    for (const r of records) {
      switch (deriveImmunisationUiStatus(r)) {
        case "completed":
          completed++;
          break;
        case "scheduled":
          scheduled++;
          break;
        case "pending":
          pending++;
          break;
        case "overdue":
          overdue++;
          break;
      }
    }
    return { completed, scheduled, pending, overdue };
  }, [records]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Vaccine Administration
          </h1>
          <p className="mt-1 text-muted-foreground">
            Fill required vaccine administration details. Saved records appear in
            Vaccination Records.
          </p>
        </div>
        <AdministerVaccineDialog onRecordSaved={refreshStats}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Administer Vaccine
          </Button>
        </AdministerVaccineDialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40 bg-card">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
            <p className="text-2xl font-bold">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold">{stats.overdue}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
