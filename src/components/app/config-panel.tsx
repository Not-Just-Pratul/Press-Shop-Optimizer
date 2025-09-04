
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Part, Machine, ProductionPlan, PlanInsights, DiscrepancyReport } from "@/lib/types";
import { PartsManager } from "./parts-manager";
import { MachinesManager } from "./machines-manager";
import { PlannerControls } from "./planner-controls";
import { Button } from "../ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfigPanelProps {
  parts: Part[];
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
  machines: Machine[];
  setMachines: React.Dispatch<React.SetStateAction<Machine[]>>;
  onGeneratePlan: (options: any) => void;
  onResetPlan: () => void;
  isGeneratingPlan: boolean;
  masterPartsList: Part[];
  onPartSelectionChange: (part: Part) => void;
  isAdjustingPlan?: boolean;
  plan: ProductionPlan | null;
  insights: PlanInsights | null;
  discrepancyReport: DiscrepancyReport | null;
  shiftDuration: number;
  shiftStartTime: string;
}

export function ConfigPanel({ 
    parts, 
    setParts, 
    machines, 
    setMachines, 
    onGeneratePlan, 
    onResetPlan,
    isGeneratingPlan,
    masterPartsList,
    onPartSelectionChange,
    isAdjustingPlan = false,
    plan,
    insights,
    discrepancyReport,
    shiftDuration,
    shiftStartTime
}: ConfigPanelProps) {
  return (
    <div className="space-y-6">
        <Link href="/" passHref>
            <Button variant="outline" className="mb-4 hidden">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>
        </Link>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{isAdjustingPlan ? 'Adjust Active Plan' : 'Daily Production Planner'}</h2>
        <p className="text-muted-foreground">
          {isAdjustingPlan 
            ? "Add new parts, update quantities, and re-prioritize to adjust the current plan."
            : "Select and prioritize parts, configure machines, then generate a new plan."
          }
        </p>
      </div>
      <Tabs defaultValue="parts" className="w-full">
        <TabsList className={cn("grid w-full", isAdjustingPlan ? "grid-cols-2" : "grid-cols-3")}>
          <TabsTrigger value="parts">Parts</TabsTrigger>
          {!isAdjustingPlan && <TabsTrigger value="machines">Machines</TabsTrigger>}
          <TabsTrigger value="planner">Generate</TabsTrigger>
        </TabsList>
        <TabsContent value="parts" className="mt-4">
          <PartsManager 
            parts={parts} 
            setParts={setParts} 
            machines={machines}
            isPlanner={true} 
            masterPartsList={masterPartsList}
            onPartSelectionChange={onPartSelectionChange}
            isAdjustingPlan={isAdjustingPlan}
          />
        </TabsContent>
        {!isAdjustingPlan && (
          <TabsContent value="machines" className="mt-4">
            <MachinesManager machines={machines} setMachines={setMachines} />
          </TabsContent>
        )}
        <TabsContent value="planner" className="mt-4">
          <PlannerControls 
            machines={machines}
            onGeneratePlan={onGeneratePlan as any} 
            onResetPlan={onResetPlan}
            isGeneratingPlan={isGeneratingPlan}
            isAdjustingPlan={isAdjustingPlan}
            plan={plan}
            insights={insights}
            discrepancyReport={discrepancyReport}
            shiftDuration={shiftDuration}
            shiftStartTime={shiftStartTime}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
