"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Battery, DoorOpen, MapPin, Search, Thermometer } from "lucide-react";
import { ApiError, getVacciBoxLogs } from "@/lib/api";
import type { VacciBoxLogRow } from "@/lib/types";

export default function ColdChainPage() {
  const [deviceId, setDeviceId] = useState("");
  const [logs, setLogs] = useState<VacciBoxLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async (filterDeviceId?: string) => {
    const raw = filterDeviceId !== undefined ? filterDeviceId : deviceId;
    setLoading(true);
    setError(null);
    try {
      const data = await getVacciBoxLogs({
        deviceId: raw?.trim() || undefined,
        limit: 100,
        offset: 0,
      });
      setLogs(data);
    } catch (err) {
      const fe = err as ApiError;
      setError(fe.message || "Failed to load cold-chain logs");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Plan: near-realtime via polling while this view is open.
  useEffect(() => {
    const id = window.setInterval(() => loadLogs(), 45_000);
    return () => window.clearInterval(id);
  }, [loadLogs]);

  const stats = useMemo(() => {
    if (logs.length === 0) {
      return {
        avgTemp: 0,
        lowBattery: 0,
        openDoor: 0,
        gpsTagged: 0,
      };
    }

    const avgTemp =
      logs.reduce((sum, row) => sum + Number(row.temperature || 0), 0) / logs.length;
    const lowBattery = logs.filter((row) => Number(row.battery_voltage) < 11.5).length;
    const openDoor = logs.filter((row) =>
      String(row.door_status || "").toLowerCase().includes("open")
    ).length;
    const gpsTagged = logs.filter((row) => row.latitude && row.longitude).length;

    return { avgTemp, lowBattery, openDoor, gpsTagged };
  }, [logs]);

  const temperatureBadge = (temp: number) => {
    if (temp < 2 || temp > 8) return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          Cold-Chain Monitoring
        </h1>
        <p className="text-muted-foreground">
          Live telemetry from VacciBox devices (temperature, voltage, door status, GPS)
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by Device ID (optional)"
                className="pl-9"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              />
            </div>
            <Button onClick={() => loadLogs(deviceId)} disabled={loading}>
              {loading ? "Loading..." : "Load Logs"}
            </Button>
          </div>
          {error && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Temperature</p>
                <p className="text-2xl font-bold">{stats.avgTemp.toFixed(2)}°C</p>
              </div>
              <Thermometer className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Battery Events</p>
                <p className="text-2xl font-bold">{stats.lowBattery}</p>
              </div>
              <Battery className="h-8 w-8 text-chart-4/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Door Open Events</p>
                <p className="text-2xl font-bold">{stats.openDoor}</p>
              </div>
              <DoorOpen className="h-8 w-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">GPS Tagged Logs</p>
                <p className="text-2xl font-bold">{stats.gpsTagged}</p>
              </div>
              <MapPin className="h-8 w-8 text-success/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            VacciBox Logs ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>Battery</TableHead>
                  <TableHead>Power</TableHead>
                  <TableHead>Door</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.name}>
                    <TableCell>{log.timestamp}</TableCell>
                    <TableCell className="font-medium">{log.device_id}</TableCell>
                    <TableCell>
                      <Badge variant={temperatureBadge(Number(log.temperature))}>
                        {Number(log.temperature).toFixed(2)}°C
                      </Badge>
                    </TableCell>
                    <TableCell>{Number(log.battery_voltage).toFixed(2)} V</TableCell>
                    <TableCell>{log.power_state}</TableCell>
                    <TableCell>{log.door_status}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {log.latitude && log.longitude
                        ? `${log.latitude.toFixed(5)}, ${log.longitude.toFixed(5)}`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

