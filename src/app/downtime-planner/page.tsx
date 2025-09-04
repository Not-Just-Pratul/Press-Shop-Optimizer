
"use client";

import { useState, useCallback, useEffect } from "react";
import type { Part, Machine, ProductionPlan, PlanInsights, DiscrepancyReport, PlanConfig } from "@/lib/types";
import { getAdjustedProductionPlan } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/app/app-header";
import { ConfigPanel } from "@/components/app/config-panel";
import { initialMachines } from "@/lib/initial-data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Info } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Skeleton } from "@/components/ui/skeleton";
import { calculateDuration } from "@/lib/utils";

const PARTS_STORAGE_KEY = 'press-shop-optimizer-parts';
const PLAN_STORAGE_KEY = 'press-shop-optimizer-plan';
const INSIGHTS_STORAGE_KEY = 'press-shop-optimizer-insights';
const DISCREPANCY_REPORT_STORAGE_KEY = 'press-shop-optimizer-discrepancy-report';
const PLAN_CONFIG_STORAGE_KEY = 'press-shop-optimizer-plan-config';


export default function DowntimePlannerPage() {
  const [masterPartsList, setMasterPartsList] = useState<Part[]>([]);
  const [partsForPlan, setPartsForPlan] = useState<Part[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [insights, setInsights] = useState<PlanInsights | null>(null);
  const [discrepancyReport, setDiscrepancyReport] = useState<DiscrepancyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shiftDuration, setShiftDuration] = useState(0);
  const [shiftStartTime, setShiftStartTime] = useState("09:00");
  
  const { toast } = useToast();
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    try {
      const savedMasterParts = window.localStorage.getItem(PARTS_STORAGE_KEY);
      const allParts = savedMasterParts ? JSON.parse(savedMasterParts) : [];
      setMasterPartsList(allParts);

      const savedPlanConfig = window.localStorage.getItem(PLAN_CONFIG_STORAGE_KEY);
      const planConfig = savedPlanConfig ? JSON.parse(savedPlanConfig) : {};
      
      setPartsForPlan(planConfig.partsData ? planConfig.partsData.map((p: any, i: number) => ({...p, id: p.id || `part-${i}`, actualQuantityProduced: 0 })) : []);
      setMachines(planConfig.machinesData || initialMachines);
      setShiftDuration(planConfig.productionShiftDuration || 0);
      setShiftStartTime(planConfig.startTime || "09:00");

      const savedPlan = window.localStorage.getItem(PLAN_STORAGE_KEY);
      setPlan(savedPlan ? JSON.parse(savedPlan) : null);
      
      const savedInsights = window.localStorage.getItem(INSIGHTS_STORAGE_KEY);
      setInsights(savedInsights ? JSON.parse(savedInsights) : null);

      const savedDiscrepancyReport = window.localStorage.getItem(DISCREPANCY_REPORT_STORAGE_KEY);
      setDiscrepancyReport(savedDiscrepancyReport ? JSON.parse(savedDiscrepancyReport) : null);

    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
    setIsDataLoaded(true);
  }, []);

  const handlePartSelectionChange = (partToAdd: Part) => {
    setPartsForPlan(currentParts => {
        if (partToAdd && !currentParts.some(p => p.id === partToAdd.id)) {
          const newPart = { ...partToAdd, actualQuantityProduced: 0 };
          const newParts = [...currentParts, newPart];
          return newParts.map((p, index) => ({...p, priority: index + 1}));
        }
      return currentParts;
    });
  };

  const handleGenerateAdjustedPlan = useCallback(
    async (options: { replanTime: string }) => {
      setIsLoading(true);

      if (!plan) {
         toast({
          variant: "destructive",
          title: "No Active Plan",
          description: "There is no existing plan to adjust.",
        });
        setIsLoading(false);
        return;
      }
      
      if (!options.replanTime) {
         toast({
          variant: "destructive",
          title: "Re-plan Time Not Set",
          description: "Please specify the time to re-plan from.",
        });
        setIsLoading(false);
        return;
      }

      const elapsedTimeSinceShiftStart = calculateDuration(shiftStartTime, options.replanTime);
      
      if (elapsedTimeSinceShiftStart < 0) {
        toast({
          variant: "destructive",
          title: "Invalid Re-plan Time",
          description: "The re-plan time cannot be before the shift start time.",
        });
        setIsLoading(false);
        return;
      }
      
      const machinesForPlan = machines.map(m => {
        const { id, downtimeStartTimestamp, ...rest } = m;
        return rest;
      });

      const input = {
        partsData: partsForPlan.map(({ id, ...rest }) => rest), 
        machinesData: machinesForPlan, 
        productionShiftDuration: shiftDuration,
        elapsedTimeSinceShiftStart,
        currentProductionPlan: plan,
      };

      const result = await getAdjustedProductionPlan(input as any);

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error Adjusting Plan",
          description: result.error,
        });
      } else if (result.data) {
        setPlan(result.data.plan);
        setInsights(result.data.insights);
        setDiscrepancyReport(result.data.discrepancyReport);

        toast({
          title: "Plan Adjusted & Saved",
          description: "Production plan has been re-generated and saved.",
        });
        
        window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(result.data.plan));
        window.localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(result.data.insights));
        if (result.data.discrepancyReport) {
            window.localStorage.setItem(DISCREPANCY_REPORT_STORAGE_KEY, JSON.stringify(result.data.discrepancyReport));
        }

        const currentConfig = JSON.parse(window.localStorage.getItem(PLAN_CONFIG_STORAGE_KEY) || '{}');
        const updatedConfig = {
            ...currentConfig,
            partsData: partsForPlan,
            machinesData: machines,
        };
        window.localStorage.setItem(PLAN_CONFIG_STORAGE_KEY, JSON.stringify(updatedConfig));
      }

      setIsLoading(false);
    },
    [partsForPlan, machines, toast, plan, shiftStartTime, shiftDuration]
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;

    if (over && active.id !== over.id) {
      setPartsForPlan((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        return reorderedItems.map((item, index) => ({ ...item, priority: index + 1 }));
      });
    }
  }

  const handleResetPlan = useCallback(() => {
    // In downtime planner, reset should probably just reset the changes, not the whole plan.
    // For now, it reloads the initial state from storage.
    setIsLoading(true);
    try {
        const savedPlanConfig = window.localStorage.getItem(PLAN_CONFIG_STORAGE_KEY);
        const planConfig = savedPlanConfig ? JSON.parse(savedPlanConfig) : {};
        
        setPartsForPlan(planConfig.partsData ? planConfig.partsData.map((p: any, i: number) => ({...p, id: p.id || `part-${i}`, actualQuantityProduced: 0})) : []);
        setMachines(planConfig.machinesData || initialMachines);

        const savedPlan = window.localStorage.getItem(PLAN_STORAGE_KEY);
        setPlan(savedPlan ? JSON.parse(savedPlan) : null);
        
        const savedInsights = window.localStorage.getItem(INSIGHTS_STORAGE_KEY);
        setInsights(savedInsights ? JSON.parse(savedInsights) : null);

        const savedDiscrepancyReport = window.localStorage.getItem(DISCREPANCY_REPORT_STORAGE_KEY);
        setDiscrepancyReport(savedDiscrepancyReport ? JSON.parse(savedDiscrepancyReport) : null);
        
         toast({
            title: "Changes Reset",
            description: "Your adjustments have been reverted to the last saved plan.",
        });

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error Resetting",
            description: "Could not reload the plan from your browser's storage.",
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  if (!isDataLoaded) {
      return (
          <div className="flex flex-col h-screen bg-background">
              <AppHeader />
              <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
                  <Skeleton className="h-12 w-3/4 mb-4" />
                  <Skeleton className="h-8 w-full mb-6" />
                  <div className="space-y-4 pt-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                  </div>
              </main>
          </div>
      )
  }
  
  if (!plan) {
      return (
        <div className="flex flex-col h-screen bg-background">
            <AppHeader />
            <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
                 <Alert className="max-w-xl">
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Active Plan Found</AlertTitle>
                    <AlertDescription>
                        There is no production plan currently active in your session. Please generate a plan from the main planner page first.
                    </AlertDescription>
                </Alert>
                <Link href="/planner" passHref>
                    <Button variant="outline" className="mt-6">Go to Planner</Button>
                </Link>
            </main>
        </div>
      )
  }


  return (
    <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
    >
        <div className="flex flex-col min-h-screen bg-background">
            <AppHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
                <div className="container mx-auto">
                    <SortableContext items={partsForPlan.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        <ConfigPanel
                            parts={partsForPlan}
                            setParts={setPartsForPlan}
                            machines={machines}
                            setMachines={setMachines}
                            onGeneratePlan={handleGenerateAdjustedPlan}
                            onResetPlan={handleResetPlan}
                            isGeneratingPlan={isLoading}
                            masterPartsList={masterPartsList}
                            onPartSelectionChange={handlePartSelectionChange}
                            isAdjustingPlan={true}
                            plan={plan}
                            insights={insights}
                            discrepancyReport={discrepancyReport}
                            shiftDuration={shiftDuration}
                            shiftStartTime={shiftStartTime}
                        />
                    </SortableContext>
                </div>
            </main>
        </div>
    </DndContext>
  );
}
