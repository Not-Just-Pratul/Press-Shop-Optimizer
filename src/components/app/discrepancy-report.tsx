
"use client";

import type { DiscrepancyReport } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, ArrowDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


interface DiscrepancyReportDisplayProps {
    report: DiscrepancyReport | null;
}

export function DiscrepancyReportDisplay({ report }: DiscrepancyReportDisplayProps) {
    if (!report || report.discrepancies.length === 0) {
        return null;
    }

    const getSeverityVariant = (severity: 'Low' | 'Medium' | 'High'): "default" | "secondary" | "destructive" => {
        switch (severity) {
            case 'Low': return 'secondary';
            case 'Medium': return 'default';
            case 'High': return 'destructive';
            default: return 'secondary';
        }
    }

    return (
        <Card className="border-amber-500/50">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-xl">Inefficiency Report</CardTitle>
                        <CardDescription>
                            The following operations were scheduled on non-ideal machines, potentially increasing costs.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Part</TableHead>
                            <TableHead className="hidden sm:table-cell">Operation</TableHead>
                            <TableHead className="text-center">Ideal vs. Actual</TableHead>
                            <TableHead className="hidden lg:table-cell">Reason</TableHead>
                            <TableHead className="text-right">Severity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.discrepancies.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.partName}</TableCell>
                                    <TableCell className="hidden sm:table-cell min-w-[150px]">{item.operationName}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 font-mono text-sm">
                                            <Badge variant="outline" className="w-full sm:w-auto justify-center">{item.idealMachineName} ({item.idealMachineCapacity}T)</Badge>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                                            <ArrowDown className="h-4 w-4 text-muted-foreground shrink-0 sm:hidden" />
                                            <Badge className="w-full sm:w-auto justify-center">{item.actualMachineName} ({item.actualMachineCapacity}T)</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <p className="text-muted-foreground cursor-help truncate max-w-xs">{item.reason}</p>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{item.reason}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={getSeverityVariant(item.severity)}>{item.severity}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            </CardContent>
        </Card>
    );
}
