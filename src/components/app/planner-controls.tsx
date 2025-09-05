
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ZapOff, PlusCircle, X, RotateCcw, Clock } from "lucide-react";
import type { Machine, ProductionPlan, PlanInsights, DiscrepancyReport } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "../ui/separator";
import { PlanDisplay } from "./plan-display";
import { DiscrepancyReportDisplay } from "./discrepancy-report";
import { calculateDuration } from "@/lib/utils";

interface Constraint {
    id: string;
    machineName: string;
    startTime: string;
    endTime: string;
}

interface PlannerControlsProps {
  machines: Machine[];
  onGeneratePlan: (options: { duration?: number; startTime?: string; constraints?: Array<{ machineName: string; startTime: number; endTime: number }>, replanTime?: string }) => void;
  onResetPlan: () => void;
  isGeneratingPlan: boolean;
  isAdjustingPlan?: boolean;
  plan: ProductionPlan | null;
  insights: PlanInsights | null;
  discrepancyReport: DiscrepancyReport | null;
  shiftDuration: number;
  shiftStartTime: string;
}


export function PlannerControls({ 
  machines,
  onGeneratePlan,
  onResetPlan,
  isGeneratingPlan, 
  isAdjustingPlan = false,
  plan,
  insights,
  discrepancyReport,
  shiftDuration,
  shiftStartTime
}: PlannerControlsProps) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [replanTime, setReplanTime] = useState("");
  const [constraints, setConstraints] = useState<Constraint[]>([]);

  useEffect(() => {
    if (isAdjustingPlan) {
        setStartTime(shiftStartTime);
    }
  }, [isAdjustingPlan, shiftStartTime]);


  const timeSlots = useMemo(() => {
    const slots: { value: string, label: string }[] = [];
    const duration = calculateDuration(startTime, endTime);
    if (duration <= 0) return [];

    const today = new Date().toISOString().split('T')[0];
    const startDateTime = new Date(`${today}T${startTime}:00`);

    for (let i = 0; i <= duration; i += 30) {
        const slotDate = new Date(startDateTime.getTime() + i * 60000);
        slots.push({
            value: slotDate.toTimeString().substring(0, 5),
            label: slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        });
    }
    return slots;
  }, [startTime, endTime]);
  
  const handleAddConstraint = () => {
    setConstraints([...constraints, { id: crypto.randomUUID(), machineName: "", startTime: "", endTime: "" }]);
  };

  const handleRemoveConstraint = (id: string) => {
    setConstraints(constraints.filter(c => c.id !== id));
  };
  
  const handleConstraintChange = (id: string, field: 'machineName' | 'startTime' | 'endTime', value: string) => {
      setConstraints(constraints.map(c => {
          if (c.id === id) {
              const newConstraint = { ...c, [field]: value };
              // if startTime changes, reset endTime if it's no longer valid
              if (field === 'startTime' && newConstraint.endTime && newConstraint.endTime < value) {
                  newConstraint.endTime = "";
              }
              return newConstraint;
          }
          return c;
      }));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAdjustingPlan) {
        onGeneratePlan({ replanTime });
        return;
    }

    const duration = calculateDuration(startTime, endTime);
    const processedConstraints = constraints
        .map(c => ({
            machineName: c.machineName,
            startTime: calculateDuration(startTime, c.startTime),
            endTime: calculateDuration(startTime, c.endTime),
        }))
        .filter(c => c.machineName && c.startTime >= 0 && c.endTime > c.startTime);
    
    const options = {
        duration,
        startTime,
        constraints: processedConstraints
    };

    if (duration > 0) {
        onGeneratePlan(options as any);
    }
  };
  
  const totalShiftDuration = calculateDuration(startTime, endTime);
  const availableMachinesForConstraints = machines.filter(
      m => !constraints.some(c => c.machineName === m.machineName)
  );


  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{isAdjustingPlan ? 'Re-Run Planner' : 'Run Planner'}</h3>
          <p className="text-sm text-muted-foreground">
            {isAdjustingPlan
              ? "Enter actual production quantities, set a re-plan time, and regenerate."
              : "Set the production shift start and end times, then generate an optimized plan using AI."
            }
          </p>
        </div>
        
        {isAdjustingPlan ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Card className="bg-muted/30">
                  <CardHeader className="flex-row items-center gap-4 space-y-0 pb-2">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                      <CardTitle className="text-base">Original Shift Start</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-2xl font-bold">{shiftStartTime}</p>
                  </CardContent>
               </Card>
               <div className="space-y-2">
                  <Label htmlFor="replan-time">Re-plan From Time</Label>
                  <Input 
                      id="replan-time"
                      type="time"
                      value={replanTime}
                      onChange={(e) => setReplanTime(e.target.value)}
                      required
                  />
                  <p className="text-xs text-muted-foreground">Enter the time to start the new plan from.</p>
               </div>
            </div>
        ) : (
          <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="space-y-2 w-full sm:flex-1">
                      <Label htmlFor="start-time">Shift Start Time</Label>
                      <Input 
                          id="start-time"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                      />
                  </div>
                  <div className="space-y-2 w-full sm:flex-1">
                      <Label htmlFor="end-time">Shift End Time</Label>
                      <Input 
                          id="end-time"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                      />
                  </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Calculated duration: <span className="font-semibold">{totalShiftDuration > 0 ? `${totalShiftDuration} minutes` : 'Invalid time range'}</span>
              </p>

              <Card className="bg-muted/30">
                  <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                          <ZapOff className="h-4 w-4" />
                          Optional: Machine Unavailability
                      </CardTitle>
                      <CardDescription>
                          Block out specific time slots for machines. The planner will not schedule any tasks during these times.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {constraints.map((constraint, index) => {
                        const availableEndTimeSlots = timeSlots.filter(slot => slot.value > constraint.startTime);
                        return (
                          <div key={constraint.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
                              <div>
                                  {index === 0 && <Label htmlFor={`free-up-machine-${constraint.id}`}>Machine</Label>}
                                  <Select 
                                      value={constraint.machineName} 
                                      onValueChange={(value) => handleConstraintChange(constraint.id, 'machineName', value)}
                                  >
                                      <SelectTrigger id={`free-up-machine-${constraint.id}`}>
                                          <SelectValue placeholder="Select machine" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {constraint.machineName && <SelectItem value={constraint.machineName}>{constraint.machineName}</SelectItem>}
                                          {availableMachinesForConstraints.map(m => (
                                              <SelectItem key={m.id} value={m.machineName}>{m.machineName}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                              </div>
                              <div>
                                  {index === 0 && <Label htmlFor={`free-from-time-${constraint.id}`}>Free From</Label>}
                                  <Select 
                                      value={constraint.startTime} 
                                      onValueChange={(value) => handleConstraintChange(constraint.id, 'startTime', value)} 
                                      disabled={!constraint.machineName}
                                  >
                                      <SelectTrigger id={`free-from-time-${constraint.id}`}>
                                          <SelectValue placeholder="Start time" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {timeSlots.map(slot => (
                                              <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                              </div>
                               <div>
                                  {index === 0 && <Label htmlFor={`free-to-time-${constraint.id}`}>Free To</Label>}
                                  <Select 
                                      value={constraint.endTime} 
                                      onValueChange={(value) => handleConstraintChange(constraint.id, 'endTime', value)} 
                                      disabled={!constraint.startTime}
                                  >
                                      <SelectTrigger id={`free-to-time-${constraint.id}`}>
                                          <SelectValue placeholder="End time" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {availableEndTimeSlots.map(slot => (
                                              <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 hover:bg-destructive/10 group sm:inline-flex"
                                    >
                                        <X className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will remove the constraint for machine "{constraint.machineName || 'unset'}".
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveConstraint(constraint.id)}>Remove</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )
                      })}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="outline" size="sm">
                                    <PlusCircle className="mr-2 h-4 w-4"/>
                                    Add Constraint
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Add Constraint</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to add a new machine constraint?
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleAddConstraint}>Add</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                  </CardContent>
              </Card>
          </div>
        )}

        
        <div className="flex flex-wrap gap-4 items-center">
          <Button type="submit" disabled={isGeneratingPlan || (!isAdjustingPlan && totalShiftDuration <= 0)} size="lg">
            {isGeneratingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isGeneratingPlan ? 'Generating...' : (isAdjustingPlan ? 'Re-Generate Plan' : 'Generate Production Plan')}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" size="lg" disabled={isGeneratingPlan}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Plan
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to reset the plan?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear the current plan, insights, and all selected parts. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onResetPlan}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>
      
      {(isGeneratingPlan || plan) && <Separator className="my-8" />}

      <div className="space-y-8">
        <PlanDisplay
          plan={plan}
          insights={insights}
          isLoading={isGeneratingPlan}
          machines={machines}
          shiftDuration={isAdjustingPlan ? shiftDuration : totalShiftDuration}
          shiftStartTime={isAdjustingPlan ? shiftStartTime : startTime}
        />
        {discrepancyReport && <DiscrepancyReportDisplay report={discrepancyReport} />}
      </div>
    </div>
  );
}

    