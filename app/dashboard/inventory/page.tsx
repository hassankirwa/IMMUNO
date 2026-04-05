"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { CsvDataMenu } from "@/components/csv-data-menu";
import {
  downloadCsvFile,
  exportInventoryCsv,
  inventoryRowsToImportPayloads,
  inventoryTemplateCsv,
  parseCsv,
  tableToObjects,
} from "@/lib/csv-import-export";
import {
  createFacilityVaccineInventory,
  deleteFacilityVaccineInventory,
  getFacilityVaccineInventory,
  getHealthcareFacilities,
  getVaccines,
  updateFacilityVaccineInventory,
} from "@/lib/api";
import type { FacilityVaccineInventoryRow } from "@/lib/types";
import { useAppSession } from "@/components/app-session-provider";

export default function InventoryPage() {
  const session = useAppSession();
  const isAdmin = session.roles.includes("admin");
  const userFacilityId = session.bootstrap?.user?.facility_id ?? null;

  const [rows, setRows] = useState<FacilityVaccineInventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<{ name: string; label: string }[]>(
    []
  );
  const [vaccines, setVaccines] = useState<{ id: string; label: string }[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<FacilityVaccineInventoryRow | null>(null);

  /** Admin-only: narrow the list to one facility (IDs are string facility ids from API). */
  const [filterFacility, setFilterFacility] = useState<string>("");
  const [formFacility, setFormFacility] = useState<string>("");
  const [formVaccine, setFormVaccine] = useState<string>("");
  const [formQty, setFormQty] = useState<string>("0");
  const [formBatch, setFormBatch] = useState("");
  const [formExpiry, setFormExpiry] = useState("");
  const [formReorder, setFormReorder] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);
  const [importSummaryOpen, setImportSummaryOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    errors: string[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows: data } = await getFacilityVaccineInventory({
        limit: 200,
        offset: 0,
        facility_id:
          isAdmin && filterFacility ? Number(filterFacility) : undefined,
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterFacility]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [facList, vacList] = await Promise.all([
          isAdmin ? getHealthcareFacilities({ limit: 200 }) : Promise.resolve([]),
          getVaccines({ limit: 200 }),
        ]);
        if (cancelled) return;
        if (isAdmin) {
          setFacilities(
            facList.map((f) => ({
              name: f.name,
              label: f.facility_name || f.name,
            }))
          );
        }
        setVaccines(
          vacList.map((v) => ({
            id: v.name,
            label: v.vaccine_name || v.item_name || v.name,
          }))
        );
      } catch {
        if (!cancelled) setError("Failed to load facilities or vaccines");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const resetAddForm = () => {
    setFormFacility("");
    setFormVaccine("");
    setFormQty("0");
    setFormBatch("");
    setFormExpiry("");
    setFormReorder("");
  };

  const openEdit = (row: FacilityVaccineInventoryRow) => {
    setEditRow(row);
    setFormQty(String(row.quantity_on_hand ?? 0));
    setFormBatch(row.batch_number || "");
    setFormExpiry(row.expiry_date || "");
    setFormReorder(
      row.reorder_threshold != null ? String(row.reorder_threshold) : ""
    );
  };

  const submitAdd = async () => {
    setError(null);
    if (isAdmin && !formFacility.trim()) {
      setError("Select a facility.");
      return;
    }
    const vaccineId = Number.parseInt(formVaccine, 10);
    if (!Number.isFinite(vaccineId)) {
      setError("Select a vaccine.");
      return;
    }
    const qty = Number.parseInt(formQty, 10);
    const reorder = formReorder.trim()
      ? Number.parseInt(formReorder, 10)
      : null;
    try {
      await createFacilityVaccineInventory({
        facility_id: isAdmin
          ? formFacility
            ? Number(formFacility)
            : null
          : userFacilityId,
        vaccine_id: vaccineId,
        quantity_on_hand: Number.isFinite(qty) ? qty : 0,
        batch_number: formBatch.trim() || null,
        expiry_date: formExpiry || null,
        reorder_threshold:
          reorder !== null && Number.isFinite(reorder) ? reorder : null,
      });
      setAddOpen(false);
      resetAddForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add stock line");
    }
  };

  const submitEdit = async () => {
    if (!editRow) return;
    setError(null);
    const qty = Number.parseInt(formQty, 10);
    const reorder = formReorder.trim()
      ? Number.parseInt(formReorder, 10)
      : null;
    try {
      await updateFacilityVaccineInventory(editRow.id, {
        quantity_on_hand: Number.isFinite(qty) ? qty : 0,
        batch_number: formBatch.trim() || null,
        expiry_date: formExpiry || null,
        reorder_threshold:
          reorder !== null && Number.isFinite(reorder) ? reorder : null,
      });
      setEditRow(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    }
  };

  async function handleExportInventoryCsv() {
    setCsvBusy(true);
    setError(null);
    try {
      const { rows: data } = await getFacilityVaccineInventory({
        limit: 5000,
        offset: 0,
        facility_id:
          isAdmin && filterFacility ? Number(filterFacility) : undefined,
      });
      const csv = exportInventoryCsv(data);
      const y = new Date();
      const stamp = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      downloadCsvFile(`vaccine-inventory-export-${stamp}.csv`, csv);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setCsvBusy(false);
    }
  }

  function handleDownloadInventoryTemplate() {
    const content = inventoryTemplateCsv(true, userFacilityId);
    const y = new Date();
    const stamp = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    downloadCsvFile(`vaccine-inventory-import-template-${stamp}.csv`, content);
  }

  async function handleImportInventoryCsv(file: File) {
    setError(null);
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const table = parseCsv(text);
    const { records } = tableToObjects(table);
    const payloads = inventoryRowsToImportPayloads(records, {
      defaultFacilityId: userFacilityId,
      isAdmin,
    });
    const errors: string[] = [];
    let created = 0;
    for (const p of payloads) {
      if (!p.ok) {
        errors.push(`Row ${p.rowIndex}: ${p.error}`);
        continue;
      }
      try {
        await createFacilityVaccineInventory(p.payload);
        created++;
      } catch (err) {
        errors.push(
          `Row ${p.rowIndex}: ${err instanceof Error ? err.message : "Could not create line"}`
        );
      }
    }
    setImportSummary({ created, errors });
    setImportSummaryOpen(true);
    await load();
  }

  const onDelete = async (row: FacilityVaccineInventoryRow) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Remove inventory line for ${row.vaccine?.name ?? "vaccine"} at this facility?`
      )
    ) {
      return;
    }
    setError(null);
    try {
      await deleteFacilityVaccineInventory(row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  };

  const lowStock = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.reorder_threshold != null &&
          r.quantity_on_hand <= r.reorder_threshold
      ).length,
    [rows]
  );

  const adminFacilityFilter = (
    <div className="flex w-full flex-col gap-2 sm:max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label>Facility (filter)</Label>
          <Select
            value={filterFacility || "__all"}
            onValueChange={(v) => setFilterFacility(v === "__all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All facilities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All facilities</SelectItem>
              {facilities.map((f) => (
                <SelectItem key={f.name} value={f.name}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" onClick={() => load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Apply
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Reload applies the filter. &quot;All facilities&quot; loads every site&apos;s stock lines.
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          Vaccine inventory
        </h1>
        <p className="text-muted-foreground">
          Stock on hand by facility (Laravel API). Each row is one vial stock line (same facility, vaccine, lot, and
          expiry). On Administer vaccine, choosing a line here fills lot and expiry and reduces quantity by one per dose.
          VVM checks are captured on the administration screen, not on inventory rows.{" "}
          <Link
            href="/dashboard/schedule?tab=eir"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Edit dose schedules (EIR)
          </Link>{" "}
          is separate from stock.
        </p>
        <p className="text-sm text-muted-foreground border-l-2 border-primary/25 pl-3">
          {isAdmin ? (
            <>
              <span className="font-medium text-foreground">Admin:</span> you see inventory{" "}
              <span className="font-medium text-foreground">across all facilities</span>. Use the facility filter below to
              show one site, or leave &quot;All facilities&quot; for the full list.
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">Your facility only:</span> this list is scoped to your
              assigned site{userFacilityId != null ? ` (facility #${userFacilityId})` : ""}. You cannot view or edit
              other facilities&apos; stock.
            </>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              At / below reorder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{lowStock}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {isAdmin ? adminFacilityFilter : null}
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <CsvDataMenu
                onExport={() => void handleExportInventoryCsv()}
                onDownloadTemplate={handleDownloadInventoryTemplate}
                onImportFile={(f) => void handleImportInventoryCsv(f)}
                busy={csvBusy}
              />
            <Dialog
              open={addOpen}
              onOpenChange={(o) => {
                setAddOpen(o);
                if (!o) resetAddForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add stock line
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add inventory line</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  {isAdmin ? (
                    <div className="space-y-2">
                      <Label>Facility</Label>
                      <Select
                        value={formFacility || undefined}
                        onValueChange={setFormFacility}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select facility" />
                        </SelectTrigger>
                        <SelectContent>
                          {facilities.map((f) => (
                            <SelectItem key={f.name} value={f.name}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label>Vaccine</Label>
                    <Select value={formVaccine} onValueChange={setFormVaccine}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vaccine" />
                      </SelectTrigger>
                      <SelectContent>
                        {vaccines.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity on hand</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formQty}
                      onChange={(e) => setFormQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lot / batch number (optional)</Label>
                    <Input
                      value={formBatch}
                      onChange={(e) => setFormBatch(e.target.value)}
                      placeholder="Leave blank to auto-generate (e.g. VA-20260405-…)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry date</Label>
                    <Input
                      type="date"
                      value={formExpiry}
                      onChange={(e) => setFormExpiry(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reorder threshold (optional)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formReorder}
                      onChange={(e) => setFormReorder(e.target.value)}
                      placeholder="Alert when qty ≤ this"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void submitAdd()}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead>Vaccine</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Lot / batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Reorder at</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No inventory rows yet. Add a stock line or check API
                      permissions.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.facility?.name ?? `Facility #${row.facility_id}`}
                      </TableCell>
                      <TableCell>
                        {row.vaccine?.name ?? `Vaccine #${row.vaccine_id}`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.quantity_on_hand}
                      </TableCell>
                      <TableCell>{row.batch_number ?? "—"}</TableCell>
                      <TableCell>{row.expiry_date ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.reorder_threshold ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => void onDelete(row)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={importSummaryOpen} onOpenChange={setImportSummaryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import finished</DialogTitle>
            <DialogDescription>
              {importSummary
                ? `${importSummary.created} stock line(s) created.${
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

      <Dialog
        open={!!editRow}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit inventory line</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Quantity on hand</Label>
              <Input
                type="number"
                min={0}
                value={formQty}
                onChange={(e) => setFormQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Lot / batch number</Label>
              <Input
                value={formBatch}
                onChange={(e) => setFormBatch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry date</Label>
              <Input
                type="date"
                value={formExpiry}
                onChange={(e) => setFormExpiry(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Changes to lot or expiry apply to this stock line for future administrations.
            </p>
            <div className="space-y-2">
              <Label>Reorder threshold</Label>
              <Input
                type="number"
                min={0}
                value={formReorder}
                onChange={(e) => setFormReorder(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button onClick={() => void submitEdit()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
