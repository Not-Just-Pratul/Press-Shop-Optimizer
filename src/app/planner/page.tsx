
"use client";

import { useState, useCallback, useEffect } from "react";
import type { Part, Machine, ProductionPlan, PlanInsights, DiscrepancyReport, PlanConfig } from "@/lib/types";
import { getProductionPlan } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/app/app-header";
import { ConfigPanel } from "@/components/app/config-panel";
import { initialParts, initialMachines } from "@/lib/initial-data";
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


const PARTS_STORAGE_KEY = 'press-shop-optimizer-parts';
const MACHINES_STORAGE_KEY = 'press-shop-optimizer-machines';
const PLAN_STORAGE_KEY = 'press-shop-optimizer-plan';
const INSIGHTS_STORAGE_KEY = 'press-shop-optimizer-insights';
const DISCREPANCY_REPORT_STORAGE_KEY = 'press-shop-optimizer-discrepancy-report';
const PLAN_CONFIG_STORAGE_KEY = 'press-shop-optimizer-plan-config';


export default function PlannerPage() {
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
      const savedParts = window.localStorage.getItem(PARTS_STORAGE_KEY);
      setMasterPartsList(savedParts ? JSON.parse(savedParts) : initialParts);
      
      const savedMachines = window.localStorage.getItem(MACHINES_STORAGE_KEY);
      setMachines(savedMachines ? JSON.parse(savedMachines) : initialMachines);

      // Load persisted plan data
      const savedPlan = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (savedPlan) setPlan(JSON.parse(savedPlan));

      const savedInsights = window.localStorage.getItem(INSIGHTS_STORAGE_KEY);
      if (savedInsights) setInsights(JSON.parse(savedInsights));
      
      const savedDiscrepancyReport = window.localStorage.getItem(DISCREPANCY_REPORT_STORAGE_KEY);
      if (savedDiscrepancyReport) setDiscrepancyReport(JSON.parse(savedDiscrepancyReport));

      const savedConfig = window.localStorage.getItem(PLAN_CONFIG_STORAGE_KEY);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setPartsForPlan(config.partsData || []);
        setMachines(config.machinesData || initialMachines);
        setShiftDuration(config.productionShiftDuration || 0);
        setShiftStartTime(config.startTime || "09:00");
      }

    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      setMasterPartsList(initialParts);
      setMachines(initialMachines);
    }
    setIsDataLoaded(true);
  }, []);
  
  useEffect(() => {
    if (isDataLoaded) {
      try {
        window.localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(machines));
      } catch (error) {
        console.error("Failed to save machines to localStorage", error);
      }
    }
  }, [machines, isDataLoaded]);

  const handlePartSelectionChange = (partToAdd: Part) => {
    setPartsForPlan(currentParts => {
        if (partToAdd && !currentParts.some(p => p.id === partToAdd.id)) {
          // When adding a part, default its selectedOperations to all operations
          const partWithSelectedOps = { ...partToAdd, selectedOperations: [...partToAdd.operations] };
          const newParts = [...currentParts, partWithSelectedOps];
          return newParts.map((p, index) => ({...p, priority: index + 1}));
        }
      return currentParts;
    });
  };

  const handleResetPlan = useCallback(() => {
    setIsLoading(true);
    setPlan(null);
    setInsights(null);
    setDiscrepancyReport(null);
    setPartsForPlan([]);
    setShiftDuration(0);
    setShiftStartTime("09:00");

    try {
        window.localStorage.removeItem(PLAN_STORAGE_KEY);
        window.localStorage.removeItem(INSIGHTS_STORAGE_KEY);
        window.localStorage.removeItem(DISCREPANCY_REPORT_STORAGE_KEY);
        window.localStorage.removeItem(PLAN_CONFIG_STORAGE_KEY);
        toast({
            title: "Plan Reset",
            description: "The planner has been cleared.",
        });
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Error Resetting Plan",
            description: "Could not clear the saved plan from your browser's storage.",
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);


  const handleGeneratePlan = useCallback(
    async (options: { 
        duration: number;
        startTime: string;
        constraints: Array<{ machineName: string; startTime: number, endTime: number }> 
    }) => {
      setIsLoading(true);
      setPlan(null);
      setInsights(null);
      setDiscrepancyReport(null);
      setShiftDuration(options.duration);
      setShiftStartTime(options.startTime);


      if (partsForPlan.length === 0) {
        toast({
          variant: "destructive",
          title: "No parts selected",
          description: "Please select at least one part to generate a plan.",
        });
        setIsLoading(false);
        return;
      }
      
      const machinesForPlan = machines.map(({ id, downtimeStartTimestamp, ...rest}) => rest);

      const partsForApi = partsForPlan.map(({ id, selectedOperations, operations, ...rest }) => ({
          ...rest,
          operations: selectedOperations || operations, // Use selected, fallback to all
      }));


      const input = {
        partsData: partsForApi,
        machinesData: machinesForPlan, 
        productionShiftDuration: options.duration,
        freeUpMachineConstraints: options.constraints.length > 0 ? options.constraints : undefined,
      };
      
      const configForStorage: PlanConfig & {startTime: string} = {
        ...input,
         partsData: partsForPlan,
         machinesData: machines,
         startTime: options.startTime,
      }

      const result = await getProductionPlan(input as any);

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error Generating Plan",
          description: result.error,
        });
      } else if (result.data) {
        setPlan(result.data.plan);
        setInsights(result.data.insights);
        setDiscrepancyReport(result.data.discrepancyReport);
        toast({
          title: "Plan Generated & Saved",
          description: "Your new plan is ready and will be here if you refresh.",
        });
        
        try {
            window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(result.data.plan));
            if(result.data.insights) window.localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(result.data.insights));
            if (result.data.discrepancyReport) {
                window.localStorage.setItem(DISCREPANCY_REPORT_STORAGE_KEY, JSON.stringify(result.data.discrepancyReport));
            }
            window.localStorage.setItem(PLAN_CONFIG_STORAGE_KEY, JSON.stringify(configForStorage));
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Could not save plan",
                description: "Your plan was generated but could not be saved to your browser's storage.",
            });
        }

      }

      setIsLoading(false);
    },
    [partsForPlan, machines, toast]
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
                            onGeneratePlan={handleGeneratePlan}
                            onResetPlan={handleResetPlan}
                            isGeneratingPlan={isLoading}
                            masterPartsList={masterPartsList}
                            onPartSelectionChange={handlePartSelectionChange}
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
