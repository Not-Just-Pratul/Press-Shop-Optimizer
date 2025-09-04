
"use client";

import type { Machine } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { DowntimeTimer } from "./downtime-countdown";
import { cn } from "@/lib/utils";

interface MachinesManagerProps {
  machines: Machine[];
  setMachines: React.Dispatch<React.SetStateAction<Machine[]>>;
}

export function MachinesManager({ machines, setMachines }: MachinesManagerProps) {

  const handleAvailabilityChange = (machineId: string, available: boolean) => {
    setMachines(currentMachines => currentMachines.map(m => {
        if (m.id === machineId) {
            return {
                ...m,
                available,
                downtimeStartTimestamp: available ? undefined : Date.now()
            };
        }
        return m;
    }));
  };
  
  const handlePlannedDowntimeChange = (machineId: string, duration: number) => {
    setMachines(currentMachines => currentMachines.map(m =>
        m.id === machineId ? { ...m, downtimeDuration: Math.max(0, duration) } : m
    ));
  };


  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage planned downtime for the AI planner and track live machine status.
      </p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px] sm:w-auto">Machine</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Planned Downtime</TableHead>
              <TableHead>Live Status</TableHead>
              <TableHead className="text-center">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((machine) => (
              <TableRow key={machine.id}>
                <TableCell className="font-medium">{machine.machineName}</TableCell>
                <TableCell>{machine.capacity > 0 ? `${machine.capacity}T` : 'N/A'}</TableCell>
                <TableCell>
                    <Input
                        type="number"
                        className="h-8 w-24"
                        placeholder="e.g. 30"
                        value={machine.downtimeDuration || ''}
                        onChange={(e) => handlePlannedDowntimeChange(machine.id, parseInt(e.target.value, 10) || 0)}
                    />
                </TableCell>
                <TableCell>
                    {!machine.available && machine.downtimeStartTimestamp ? (
                        <DowntimeTimer
                            startTimestamp={machine.downtimeStartTimestamp}
                        />
                    ) : (
                        <span className={cn("text-sm", machine.available ? "text-green-600" : "text-muted-foreground")}>
                            {machine.available ? "Operational" : "Offline"}
                        </span>
                    )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center">
                    <Switch
                      id={`available-${machine.id}`}
                      checked={machine.available}
                      onCheckedChange={(checked) => handleAvailabilityChange(machine.id, checked)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
