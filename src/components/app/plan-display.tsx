
"use client";

import { useState, useMemo } from "react";
import type { ProductionPlan, Machine, PlanInsights, PartOperation, PartData } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, BarChart2, GanttChartSquare, Hourglass, Utensils } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import Image from 'next/image';
import { Badge } from "../ui/badge";
import * as XLSX from "xlsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, LabelList, GroupedBar } from "recharts";
import { cn } from "@/lib/utils";


interface PlanDisplayProps {
  plan: ProductionPlan | null;
  insights: PlanInsights | null;
  isLoading: boolean;
  machines: Machine[];
  shiftDuration: number;
  shiftStartTime: string;
}

const formatTimeFactory = (shiftStartTime: string) => (minutes: number) => {
    if (!shiftStartTime) return '';
    const [startHour, startMinute] = shiftStartTime.split(':').map(Number);
    
    const date = new Date();
    date.setHours(startHour, startMinute, 0, 0); 
    date.setMinutes(date.getMinutes() + minutes);
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
};


export function PlanDisplay({ plan, insights, isLoading, machines, shiftDuration, shiftStartTime = "09:00" }: PlanDisplayProps) {

  const formatTime = useMemo(() => formatTimeFactory(shiftStartTime), [shiftStartTime]);

  if (isLoading) {
    return <PlanDisplaySkeleton />;
  }

  if (!plan) {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg h-full min-h-[60vh] bg-card">
            <GanttChartSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-2xl font-bold font-headline mb-2">No Plan Generated</h3>
            <p className="text-muted-foreground max-w-md">
                Select parts and machines from the panel, then click "Generate Production Plan" to see your optimized schedule here.
            </p>
        </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle className="font-headline">Generated Production Plan</CardTitle>
                <CardDescription>{plan.summary}</CardDescription>
            </div>
             <PlanActions plan={plan} insights={insights} shiftDuration={shiftDuration} allMachines={machines} formatTime={formatTime}/>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gantt">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-2">
            <TabsTrigger value="gantt"><GanttChartSquare className="mr-2 h-4 w-4" />Task Grid</TabsTrigger>
            <TabsTrigger value="dashboard"><BarChart2 className="mr-2 h-4 w-4"/>Dashboard</TabsTrigger>
          </TabsList>
          <TabsContent value="gantt" className="mt-4">
             <GanttChart plan={plan} machines={machines} shiftDuration={shiftDuration} formatTime={formatTime} />
          </TabsContent>
          <TabsContent value="dashboard" className="mt-4">
            <Dashboard insights={insights} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PlanActions({ plan, insights, shiftDuration, allMachines, formatTime }: { plan: ProductionPlan, insights: PlanInsights | null, shiftDuration: number, allMachines: Machine[], formatTime: (minutes: number) => string }) {
    const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);

    const handleDownloadXlsx = async () => {
        if (!plan || !insights) return;
        setIsGeneratingXlsx(true);
    
        try {
            const { productionPlan } = plan;
            const wb = XLSX.utils.book_new();

            // --- Gantt Chart Sheet (Grid Format) ---
            const tasksByMachine = allMachines.map(machine => ({
                machineName: machine.machineName,
                tasks: productionPlan
                    .filter(p => p.machineName === machine.machineName)
                    .sort((a, b) => a.startTime - b.startTime)
            }));

            const maxTasks = Math.max(0, ...tasksByMachine.map(m => m.tasks.length));
            
            const ganttGridData = tasksByMachine.map(machineWithTasks => {
                const row: { [key: string]: string } = { 'Machine': machineWithTasks.machineName };
                for (let i = 0; i < maxTasks; i++) {
                    const task = machineWithTasks.tasks[i];
                    if (task) {
                        const timeRange = `Time: ${formatTime(task.startTime)} - ${formatTime(task.endTime)}`;
                        const partInfo = `Part No.: ${task.partName}`;
                        const opInfo = `Operation: ${task.operationName}`;
                        const qtyInfo = task.taskType === 'Production' ? `Quantity: ${task.quantity}` : `Task: ${task.taskType}`;
                        
                        row[`Task ${i + 1}`] = `${timeRange}\n${partInfo}\n${opInfo}\n${qtyInfo}`;
                    } else {
                        row[`Task ${i + 1}`] = '';
                    }
                }
                return row;
            });

            const ganttSheet = XLSX.utils.json_to_sheet(ganttGridData);
            const ganttColWidths = [{ wch: 20 }]; // Machine name column
            for (let i = 0; i < maxTasks; i++) {
                ganttColWidths.push({ wch: 30 }); // Task columns
            }
            ganttSheet['!cols'] = ganttColWidths;

            // Apply text wrapping to all cells
            const range = XLSX.utils.decode_range(ganttSheet['!ref']!);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = { c: C, r: R };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    if (!ganttSheet[cell_ref]) continue;
                    ganttSheet[cell_ref].s = { alignment: { wrapText: true, vertical: 'top' } };
                }
            }


            XLSX.utils.book_append_sheet(wb, ganttSheet, "Gantt Chart");

            // --- Dashboard Sheet ---
            const dashboardData = [];
            dashboardData.push(["Machine Utilization"]);
            const machineHeaders = ["Machine", "Utilization (%)", "Busy Time (min)", "Idle Time (min)"];
            dashboardData.push(machineHeaders);
            insights.machineUtilization.forEach(m => {
                dashboardData.push([m.machineName, m.utilizationPercentage.toFixed(2), m.busyTime, m.idleTime]);
            });

            dashboardData.push([]); // Spacer
            dashboardData.push(["Part Production Summary"]);
            const partHeaders = ["Part Name", "Target Quantity", "Quantity Produced"];
            dashboardData.push(partHeaders);
            insights.partProduction.forEach(p => {
                 dashboardData.push([p.partName, p.targetQuantity, p.quantityProduced]);
            });
            const dashboardSheet = XLSX.utils.aoa_to_sheet(dashboardData);
            dashboardSheet['!cols'] = [{wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}];
            XLSX.utils.book_append_sheet(wb, dashboardSheet, "Dashboard");

    
            // --- Production Matrix Sheet ---
            const allOpsInPlan = Array.from(new Set(productionPlan.map(p => p.operationName))).sort();
            const uniquePartsData = insights.partProduction;

            const matrixData: any[] = [];
            const header = ["Part Name", "Target", ...allOpsInPlan, "Total Finished Parts"];
            
             uniquePartsData.forEach(part => {
                const row: { [key: string]: string | number } = { "Part Name": part.partName, "Target": part.targetQuantity || 'N/A' };
                const partOps = productionPlan.filter(p => p.partName === part.partName);
                
                const partOpSequence = part.operations?.map(op => op.stepName) || [];
                
                let lastOpQuantity = Infinity; 
                
                const allOpTotals: { [key: string]: number } = {};
                allOpsInPlan.forEach(opName => {
                    allOpTotals[opName] = partOps
                        .filter(p => p.operationName === opName && p.taskType === 'Production')
                        .reduce((sum, p) => sum + p.quantity, 0);
                });

                partOpSequence.forEach(opName => {
                    const currentOpQuantity = allOpTotals[opName] || 0;
                    const realisticQuantity = Math.min(currentOpQuantity, lastOpQuantity);
                    row[opName] = realisticQuantity > 0 ? realisticQuantity : "-";
                    lastOpQuantity = realisticQuantity;
                });
                
                allOpsInPlan.forEach(opName => {
                    if (!row.hasOwnProperty(opName)) {
                        row[opName] = "-";
                    }
                });
                
                const finalOpName = partOpSequence.length > 0 ? partOpSequence[partOpSequence.length - 1] : undefined;
                const finalQuantity = finalOpName ? (row[finalOpName] || 0) : 0;
                row["Total Finished Parts"] = finalQuantity;

                matrixData.push(row);
            });

            const matrixSheet = XLSX.utils.json_to_sheet(matrixData, { header });
            const matrixColWidths = [{wch: 25}, {wch: 10}, ...allOpsInPlan.map(() => ({wch: 15})), {wch: 20}];
            matrixSheet['!cols'] = matrixColWidths;
            XLSX.utils.book_append_sheet(wb, matrixSheet, "Production Matrix");


            // --- Detailed Plan Sheet ---
            const detailedData: any[] = [];
            
            uniquePartsData.forEach(part => {
                 const cumulativeQuantities: { [key: string]: number } = {};
                 detailedData.push({ "Part Name": part.partName, "Operation": `(Target: ${part.targetQuantity || 'N/A'})`});

                 const partPlanItems = productionPlan.filter(item => item.partName === part.partName);

                 partPlanItems.forEach(item => {
                    let cumulativeQty: number | string = '';
                    if (item.taskType === 'Production') {
                        const key = `${item.partName}-${item.operationName}`;
                        cumulativeQuantities[key] = (cumulativeQuantities[key] || 0) + item.quantity;
                        cumulativeQty = cumulativeQuantities[key];
                    }

                    detailedData.push({
                        "Part Name": "",
                        "Operation": item.operationName,
                        "Task Type": item.taskType,
                        "Machine": item.machineName,
                        "Quantity": item.taskType === 'Production' ? item.quantity : '',
                        "Cumulative Quantity Produced": cumulativeQty,
                        "Start Time": formatTime(item.startTime),
                        "End Time": formatTime(item.endTime),
                        "Duration (min)": item.endTime - item.startTime,
                        "Operator Name": "",
                        "Actual Quantity": "",
                    });
                 });
                 detailedData.push({}); // Add a blank row between parts
            });
    
            const detailedSheet = XLSX.utils.json_to_sheet(detailedData, {
                header: ["Part Name", "Operation", "Task Type", "Machine", "Quantity", "Cumulative Quantity Produced", "Start Time", "End Time", "Duration (min)", "Operator Name", "Actual Quantity"],
                skipHeader: false,
            });
    
            detailedSheet['!cols'] = [
                { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, 
                { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                { wch: 20 }, { wch: 20 }
            ];
            XLSX.utils.book_append_sheet(wb, detailedSheet, "Detailed Plan");

            const today = new Date();
            const dateString = today.toISOString().split('T')[0];
            const fileName = `${dateString} - Production Plan.xlsx`;
    
            XLSX.writeFile(wb, fileName);
    
        } catch (error) {
            console.error("Failed to generate XLSX", error);
        } finally {
            setIsGeneratingXlsx(false);
        }
      };

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadXlsx} disabled={isGeneratingXlsx || !insights}>
                {isGeneratingXlsx ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isGeneratingXlsx ? "Exporting..." : "Download XLSX"}
            </Button>
        </div>
    );
}

function GanttChart({ plan, machines, shiftDuration, formatTime }: { plan: ProductionPlan, machines: Machine[], shiftDuration: number, formatTime: (minutes: number) => string }) {
    const { productionPlan } = plan;

    const getPartColor = (partName: string, taskType: 'Die Setting' | 'Production') => {
        let hash = 0;
        for (let i = 0; i < partName.length; i++) {
            hash = partName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        
        if (taskType === 'Die Setting') {
            return {
                background: `hsl(${hue}, 40%, 92%)`,
                border: `hsl(${hue}, 30%, 85%)`,
                pattern: 'repeating-linear-gradient(45deg, transparent, transparent 5px, hsla(0, 0%, 0%, 0.03) 5px, hsla(0, 0%, 0%, 0.03) 10px)'
            };
        }

        return {
            background: `hsl(${hue}, 80%, 90%)`,
            border: `hsl(${hue}, 60%, 80%)`,
            pattern: 'none'
        };
    };

    return (
        <div className="border rounded-lg bg-card overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="sticky left-0 bg-muted/50 z-10 w-40 min-w-[160px] font-semibold">Machine</TableHead>
                        <TableHead>Tasks</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {machines.map((machine, index) => (
                        <TableRow key={`${machine.machineName}-${index}`} className="h-36">
                            <TableCell className="font-semibold sticky left-0 bg-card z-10 w-40 min-w-[160px] border-r align-top">
                                {machine.machineName}
                            </TableCell>
                            <TableCell className="p-2 align-top">
                                <div className="flex flex-wrap gap-2">
                                    {productionPlan
                                        .filter(item => item.machineName === machine.machineName)
                                        .sort((a,b) => a.startTime - b.startTime)
                                        .map((item, itemIndex) => {
                                            const colors = getPartColor(item.partName, item.taskType);
                                            const uniqueKey = `${item.machineName}-${item.partName}-${item.operationName}-${item.startTime}-${itemIndex}`;

                                            return (
                                                <div
                                                    key={uniqueKey}
                                                    className="w-48 h-32 rounded-md p-2 shadow-sm border text-xs"
                                                    style={{
                                                        backgroundColor: colors.background,
                                                        borderColor: colors.border,
                                                        backgroundImage: colors.pattern,
                                                    }}
                                                >
                                                    <p className="font-bold break-words">{item.partName}</p>
                                                    <p className="text-muted-foreground break-words">
                                                        {item.taskType === 'Die Setting' ? 'Die Setting' : item.operationName}
                                                    </p>
                                                    <div className="space-y-1 mt-1">
                                                        {item.taskType === 'Production' && (
                                                            <p className="font-mono text-primary">Qty: {item.quantity}</p>
                                                        )}
                                                        <p className="text-muted-foreground">{`${formatTime(item.startTime)} - ${formatTime(item.endTime)}`}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function Dashboard({ insights }: { insights: PlanInsights | null }) {
    if (!insights) {
        return (
            <div className="flex flex-col items-center justify-center text-center min-h-[400px] bg-card/50 rounded-lg p-4">
                <BarChart2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Dashboard insights are being generated...</p>
            </div>
        );
    }

    const { machineUtilization, partProduction } = insights;
    
    const chartConfig = {
        targetQuantity: {
          label: "Target",
          color: "hsl(var(--muted-foreground) / 0.5)",
        },
        quantityProduced: {
          label: "Produced",
          color: "hsl(var(--primary))",
        },
      } satisfies import("@/components/ui/chart").ChartConfig;


    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Part Production Summary</CardTitle>
                        <CardDescription>Total units produced for each part vs. target quantity.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[400px] w-full">
                            <BarChart data={partProduction} layout="vertical" margin={{ left: 20, right: 30 }} barCategoryGap="20%">
                                <XAxis type="number" />
                                <YAxis dataKey="partName" type="category" width={100} tickLine={false} axisLine={false} className="text-xs sm:text-sm" />
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="targetQuantity" fill="var(--color-targetQuantity)" radius={4}>
                                    <LabelList
                                        position="right"
                                        offset={8}
                                        className="fill-muted-foreground"
                                        fontSize={12}
                                    />
                                </Bar>
                                <Bar dataKey="quantityProduced" fill="var(--color-quantityProduced)" radius={4}>
                                    <LabelList
                                        position="right"
                                        offset={8}
                                        className="fill-foreground"
                                        fontSize={12}
                                    />
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Machine Utilization</CardTitle>
                        <CardDescription>Percentage of time each machine is active during the shift.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-[400px] w-full">
                            <BarChart data={machineUtilization} layout="vertical" margin={{ left: 20, right: 30 }}>
                                <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                <YAxis dataKey="machineName" type="category" width={100} tickLine={false} axisLine={false} className="text-xs sm:text-sm"/>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
                                <Bar dataKey="utilizationPercentage" fill="hsl(var(--primary))" radius={4}>
                                    <LabelList 
                                        position="right"
                                        offset={8} 
                                        className="fill-foreground"
                                        fontSize={12}
                                        formatter={(value: number) => `${value.toFixed(1)}%`}
                                    />
                                 </Bar>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hourglass className="h-5 w-5" />
                        Machine Downtime
                    </CardTitle>
                    <CardDescription>Total idle time (downtime) for each machine during the shift.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="h-[400px] w-full">
                        <BarChart data={machineUtilization} layout="vertical" margin={{ left: 20, right: 30 }}>
                                <XAxis type="number" tickFormatter={(value) => `${value} min`} />
                                <YAxis dataKey="machineName" type="category" width={100} tickLine={false} axisLine={false} className="text-xs sm:text-sm"/>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
                                <Bar dataKey="idleTime" fill="hsl(var(--secondary))" radius={4}>
                                    <LabelList
                                        position="right"
                                        offset={8}
                                        className="fill-foreground"
                                        fontSize={12}
                                        formatter={(value: number) => `${value.toFixed(0)} min`}
                                    />
                                </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}

function PlanDisplaySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-5/6 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4 border rounded-lg p-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-10 w-32 rounded-md" />
              <Skeleton className="h-10 flex-1 rounded-md" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

    