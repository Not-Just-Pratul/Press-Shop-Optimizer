import type { GenerateProductionPlanOutput, GenerateProductionPlanInput } from "@/ai/flows/generate-production-plan";
import type { PlanInsightsOutput, PartProduction } from "@/ai/flows/generate-plan-insights";
import type { DiscrepancyReportOutput } from "@/ai/flows/generate-discrepancy-report";

export interface PartOperation {
  stepName: string;
  lowestPress: string;
  dieSettingTime: number;
  timeFor50Pcs: number;
}

export interface Part {
  id: string;
  partName: string;
  partDescription: string;
  operations: PartOperation[];
  selectedOperations?: PartOperation[]; // For planner page
  priority: number;
  quantityToProduce?: number;
  actualQuantityProduced?: number; // For downtime planner
}

export interface Machine {
  id:string;
  machineName: string;
  capacity: number;
  available: boolean;
  downtimeDuration?: number; // For planned downtime fed to AI
  downtimeStartTimestamp?: number; // For live countdown
}


// Types for AI schema
export type PartData = Omit<Part, 'id' | 'selectedOperations'>;
export type MachineData = Omit<Machine, 'id' | 'downtimeStartTimestamp'>;

export type PlanConfig = Pick<GenerateProductionPlanInput, 'partsData' | 'machinesData' | 'productionShiftDuration' | 'historicalProductionData'> & {
    partsData: Part[];
    machinesData: Machine[];
    startTime?: string;
};


// Add taskType to the plan items
export type ProductionPlan = Omit<GenerateProductionPlanOutput, 'productionPlan'> & {
  productionPlan: (GenerateProductionPlanOutput['productionPlan'][number] & {
    taskType: 'Die Setting' | 'Production';
  })[];
};

export type PlanInsights = Omit<PlanInsightsOutput, 'partProduction'> & {
  partProduction: (PartProduction & { operations?: PartOperation[] })[];
};
export type DiscrepancyReport = DiscrepancyReportOutput;
