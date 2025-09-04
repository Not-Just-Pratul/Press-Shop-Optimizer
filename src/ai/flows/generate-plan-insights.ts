
'use server';
/**
 * @fileOverview This file defines a Genkit flow for analyzing a production plan and generating insights.
 *
 * - generatePlanInsights - A function that analyzes a production plan and returns key metrics.
 * - PlanInsightsInput - The input type for the generatePlanInsights function.
 * - PlanInsightsOutput - The return type for the generatePlanInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerateProductionPlanOutput, GenerateProductionPlanInput } from './generate-production-plan';


const PartOperationSchema = z.object({
  stepName: z.string().describe('Name of the process step'),
  lowestPress: z.string().describe('Lowest capacity press for this step'),
  dieSettingTime: z.number().describe('Die setting time in minutes for this specific operation'),
  timeFor50Pcs: z.number().describe('Time in minutes for producing 50 pieces for this specific operation'),
});

const PartDataSchema = z.object({
  partName: z.string().describe('Name of the part'),
  operations: z.array(PartOperationSchema).describe('The sequence of operations for the part'),
  priority: z.number().describe('Priority of the part (lower number = higher priority)'),
  quantityToProduce: z.optional(z.number()).describe('The target quantity to produce for this part. If not provided, the AI should maximize production within the shift.'),
});

const MachineDataSchema = z.object({
  machineName: z.string().describe('Name of the machine'),
  capacity: z.number().describe('Capacity of the machine'),
  available: z.boolean().describe('Whether the machine is currently available'),
  downtimeDuration: z.optional(z.number()).describe('Duration in minutes for which the machine is unavailable. If undefined, the machine is always available.'),
});

const ProductionPlanItemSchema = z.object({
  partName: z.string().describe('Name of the part'),
  operationName: z.string().describe('Name of the operation'),
  machineName: z.string().describe('Name of the machine'),
  quantity: z.number().describe('Quantity to be produced. This will be 0 for a die setting task.'),
  startTime: z.number().describe('Start time in minutes from the beginning of the shift'),
  endTime: z.number().describe('End time in minutes from the beginning of the half'),
  taskType: z.enum(['Die Setting', 'Production']).describe('The type of task being performed.'),
});

const GenerateProductionPlanOutputSchema = z.object({
  productionPlan: z.array(ProductionPlanItemSchema).describe('Array of production plan items, including separate entries for die setting and production.'),
  summary: z.string().describe('A detailed summary of the production plan, including which parts were fully or partially produced and a count of how many parts were completed.'),
});

const GenerateProductionPlanInputSchema = z.object({
  partsData: z.array(PartDataSchema).describe('Array of part data'),
  machinesData: z.array(MachineDataSchema).describe('Array of machine data'),
  productionShiftDuration: z.number().describe('Total minutes available in current shift'),
  historicalProductionData: z.optional(z.string()).describe('Historical production data for similar operations, as a JSON string.'),
});

const MachineUtilizationSchema = z.object({
    machineName: z.string().describe('Name of the machine'),
    utilizationPercentage: z.number().describe('The percentage of time the machine is busy (0-100).'),
    totalTime: z.number().describe('Total available time for the machine in minutes.'),
    busyTime: z.number().describe('Total time the machine is busy in minutes.'),
    idleTime: z.number().describe('Total time the machine is idle in minutes.'),
});

const PartProductionSchema = z.object({
    partName: z.string().describe('Name of the part'),
    quantityProduced: z.number().describe('Total quantity of the part produced.'),
    targetQuantity: z.number().optional().describe('The target production quantity for the part.'),
    operations: z.array(PartOperationSchema).optional().describe('The sequence of operations for the part from the input data.'),
});

export type PartProduction = z.infer<typeof PartProductionSchema>;


const PlanInsightsInputSchema = z.object({
  plan: GenerateProductionPlanOutputSchema,
  config: GenerateProductionPlanInputSchema,
  // Adding stringified versions for the prompt
  stringifiedMachines: z.string(),
  stringifiedParts: z.string(),
  stringifiedPlan: z.string(),
});
export type PlanInsightsInput = z.infer<typeof PlanInsightsInputSchema>;


const PlanInsightsOutputSchema = z.object({
    machineUtilization: z.array(MachineUtilizationSchema).describe('An array of machine utilization metrics.'),
    partProduction: z.array(PartProductionSchema).describe('An array of part production summaries.'),
});
export type PlanInsightsOutput = z.infer<typeof PlanInsightsOutputSchema>;

export async function generatePlanInsights(input: Omit<PlanInsightsInput, 'stringifiedMachines' | 'stringifiedParts' | 'stringifiedPlan'>): Promise<PlanInsightsOutput> {
    const flowInput: PlanInsightsInput = {
        ...input,
        stringifiedMachines: JSON.stringify(input.config.machinesData, null, 2),
        stringifiedParts: JSON.stringify(input.config.partsData, null, 2),
        stringifiedPlan: JSON.stringify(input.plan.productionPlan, null, 2),
    };
    return generatePlanInsightsFlow(flowInput);
}

const insightsPrompt = ai.definePrompt({
    name: 'planInsightsPrompt',
    input: { schema: PlanInsightsInputSchema },
    output: { schema: PlanInsightsOutputSchema },
    prompt: `You are a production data analyst. Your task is to analyze a given production plan and provide key performance indicators.

    **Production Plan Data:**
    - Shift Duration: {{config.productionShiftDuration}} minutes
    - Machine Data: {{{stringifiedMachines}}}
    - Parts Data: {{{stringifiedParts}}}
    - Generated Schedule: {{{stringifiedPlan}}}

    **Analysis Instructions:**

    1.  **Calculate Machine Utilization:**
        - For each machine listed in the input machine data, calculate its utilization percentage.
        - **Total Time:** The total available time for each machine is the \`productionShiftDuration\`.
        - **Busy Time:** Sum the duration of all tasks (both 'Die Setting' and 'Production') assigned to that machine in the schedule. The duration of a task is (endTime - startTime).
        - **Idle Time:** This is Total Time - Busy Time.
        - **Utilization Percentage:** This is (Busy Time / Total Time) * 100. Round to two decimal places.
        - Create an entry for every machine in the \`machinesData\` input, even if it was not used in the plan (its utilization would be 0%).

    2.  **Calculate Part Production:**
        - For each part listed in the input parts data, calculate the total quantity produced.
        - **Quantity Produced:** Sum the 'quantity' from all 'Production' tasks for that specific part in the schedule. Die setting tasks have a quantity of 0 and should be ignored for this calculation.
        - **Target Quantity:** Include the \`quantityToProduce\` from the original parts data for comparison.
        - **Operations**: Important: You must include the original 'operations' array for each part from the input 'partsData'. This is required for downstream calculations.
        - Create an entry for every part in the \`partsData\` input.

    Provide the final analysis in the specified JSON format.
    `,
});

const generatePlanInsightsFlow = ai.defineFlow(
    {
        name: 'generatePlanInsightsFlow',
        inputSchema: PlanInsightsInputSchema,
        outputSchema: PlanInsightsOutputSchema,
    },
    async (input) => {
        const { output } = await insightsPrompt(input);
        if (!output) {
            throw new Error('Failed to generate plan insights');
        }
        return output;
    }
);

    