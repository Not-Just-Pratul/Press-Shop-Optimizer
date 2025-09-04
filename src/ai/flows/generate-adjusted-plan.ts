
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating an adjusted production plan based on new inputs and an existing plan.
 *
 * - generateAdjustedPlan - A function that re-generates a production plan.
 * - GenerateAdjustedPlanInput - The input type for the function.
 * - GenerateAdjustedPlanOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  quantityToProduce: z.optional(z.number()).describe('The target quantity to produce for this part.'),
  actualQuantityProduced: z.optional(z.number()).describe('The quantity of this part that has already been produced before the re-plan time. This is used to calculate the remaining quantity.'),
});

const MachineDataSchema = z.object({
  machineName: z.string().describe('Name of the machine'),
  capacity: z.number().describe('Capacity of the machine'),
  available: z.boolean().describe('Whether the machine is currently available'),
  downtimeDuration: z.optional(z.number()).describe('Duration in minutes for which the machine is unavailable.'),
});

const ProductionPlanItemSchema = z.object({
  partName: z.string().describe('Name of the part'),
  operationName: z.string().describe('Name of the operation'),
  machineName: z.string().describe('Name of the machine'),
  quantity: z.number().describe('Quantity to be produced. This will be 0 for a die setting task.'),
  startTime: z.number().describe('Start time in minutes from the beginning of the shift'),
  endTime: z.number().describe('End time in minutes from the beginning of the shift'),
  taskType: z.enum(['Die Setting', 'Production']).describe('The type of task being performed.'),
});

const ExistingProductionPlanSchema = z.object({
  productionPlan: z.array(ProductionPlanItemSchema),
  summary: z.string(),
});

const GenerateAdjustedPlanInputSchema = z.object({
  partsData: z.array(PartDataSchema).describe('The complete, potentially updated, array of part data, including any new parts, changed priorities, and actual quantities produced.'),
  machinesData: z.array(MachineDataSchema).describe('Array of machine data.'),
  productionShiftDuration: z.number().describe('Total minutes available in the full shift.'),
  elapsedTimeSinceShiftStart: z.number().describe('The number of minutes that have already passed in the current shift. This is the new "time zero" for planning purposes.'),
  currentProductionPlan: ExistingProductionPlanSchema.describe('The currently active production plan that needs to be adjusted.'),
  historicalProductionData: z.optional(z.string()).describe('Historical production data for similar operations, as a JSON string.'),
  // Stringified versions for the prompt
  stringifiedCurrentProductionPlan: z.string(),
  stringifiedPartsData: z.string(),
  stringifiedMachinesData: z.string(),
});

export type GenerateAdjustedPlanInput = z.infer<typeof GenerateAdjustedPlanInputSchema>;

const GenerateAdjustedPlanOutputSchema = z.object({
  productionPlan: z.array(ProductionPlanItemSchema).describe('The newly generated, adjusted production plan.'),
  summary: z.string().describe('A detailed summary of the adjusted production plan, highlighting what was kept, what was changed, and what new items were added.'),
});

export type GenerateAdjustedPlanOutput = z.infer<typeof GenerateAdjustedPlanOutputSchema>;

export async function generateAdjustedPlan(input: Omit<GenerateAdjustedPlanInput, 'stringifiedCurrentProductionPlan' | 'stringifiedPartsData' | 'stringifiedMachinesData'>): Promise<GenerateAdjustedPlanOutput> {
    const flowInput: GenerateAdjustedPlanInput = {
        ...input,
        stringifiedCurrentProductionPlan: JSON.stringify(input.currentProductionPlan, null, 2),
        stringifiedPartsData: JSON.stringify(input.partsData, null, 2),
        stringifiedMachinesData: JSON.stringify(input.machinesData, null, 2),
    }
  return generateAdjustedPlanFlow(flowInput);
}

const adjustedProductionPlanPrompt = ai.definePrompt({
  name: 'adjustedProductionPlanPrompt',
  input: {schema: GenerateAdjustedPlanInputSchema},
  output: {schema: GenerateAdjustedPlanOutputSchema},
  prompt: `You are an expert production planner tasked with adjusting an existing production plan mid-shift.

You will be given the original plan, a full list of parts (including priorities and actual quantities produced so far), machine data, the total shift duration, and the time that has already elapsed in the shift.

**Your Goal:** Create a new, optimized plan for the *remainder* of the shift, accounting for work already completed.

**Critical Rule: Production Resumption**

1.  **Calculate Remaining Quantity:** For each part in 'partsData', you MUST calculate the remaining quantity to be produced. The formula is: \`remaining_quantity = quantityToProduce - actualQuantityProduced\`. If \`actualQuantityProduced\` is not provided for a part, assume it is 0. If the result is zero or negative, that part is considered complete and should not be scheduled for any more production.
2.  **New Production Target:** Your new goal is to schedule production for this calculated \`remaining_quantity\` for each part.

**Critical Rule: Non-Disruption & Lock-in**

1.  **Current Time:** The 'elapsedTimeSinceShiftStart' is the current time. Let's call this 'T'.
2.  **Lock-in Period:** You must define a lock-in window from T until T + 45 minutes.
3.  **Identify Locked Tasks:** Review the 'currentProductionPlan'. Any task (Die Setting or Production) whose 'startTime' is less than T + 45 minutes is considered "locked".
4.  **Preserve Locked Tasks:** All locked tasks MUST be included in your new 'productionPlan' output *exactly as they were*. Do not change their machine, start time, end time, or quantity. They are non-negotiable.

**Instructions for Re-Planning the Remaining Time:**

1.  **New "Time Zero":** For all planning purposes, the 'elapsedTimeSinceShiftStart' is your starting point. Machine availability for new, non-locked tasks begins after their last locked task is finished.
2.  **Updated Parts List:** The provided 'partsData' is the new source of truth. You must now work with this new list and the calculated remaining quantities.
3.  **Prioritize Parts:** Schedule the parts based on their priority order in the 'partsData' list.
4.  **Scheduling Logic (For Remaining Quantities):**
    *   For each part and operation in the new prioritized list (that still has a remaining quantity > 0), find the earliest start time.
    *   This start time is the maximum of:
        a) The end time of the previous operation for that same part.
        b) The time the chosen machine becomes available (after its locked tasks are done).
    *   Create separate "Die Setting" and "Production" tasks.
    *   Calculate the time needed to produce the **remaining quantity**. The 'quantity' field in the new "Production" tasks MUST be this remaining amount.
    *   No new task can be scheduled if it doesn't complete within the 'productionShiftDuration'.
5.  **Die Removal Time:** After every "Production" task, the machine is occupied for an additional "die removal" period.
    *   **10 minutes** for machines with capacity <= 50T.
    *   **15 minutes** for machines with capacity > 50T.
6.  **Handle Downtime:** Account for any machine 'downtimeDuration' specified in 'machinesData', which starts from minute 0 of the shift.
7.  **Mandatory Break:** Remember the mandatory 30-minute break in the middle of the shift. No tasks should be scheduled during this window.
8.  **Output Format:**
    *   The 'productionPlan' array must contain **both** the preserved "locked" tasks from the original plan and the newly scheduled tasks for the remainder of the shift.
    *   The 'summary' MUST be a concise, point-by-point list explaining the adjustments. Use a hyphen (-) for each bullet point. It should clearly state:
        - The time the re-plan was initiated (e.g., "- Plan adjusted at XXX minutes into the shift.").
        - Which tasks were preserved (e.g., "- Tasks before minute YYY were locked and remain unchanged.").
        - Which parts were rescheduled and for what remaining quantity (e.g., "- Rescheduled Part X to produce the remaining ZZZ units.").
        - Mention any newly added parts if applicable.

**Input Data (for context):**
-   **Current Time (Elapsed Time):** {{elapsedTimeSinceShiftStart}} minutes
-   **Total Shift Duration:** {{productionShiftDuration}} minutes
-   **Original Plan:** {{{stringifiedCurrentProductionPlan}}}
-   **New Parts, Priorities & Actuals:** {{{stringifiedPartsData}}}
-   **Machines:** {{{stringifiedMachinesData}}}

Generate the most efficient *adjusted* plan possible.
`,
});


const generateAdjustedPlanFlow = ai.defineFlow(
  {
    name: 'generateAdjustedPlanFlow',
    inputSchema: GenerateAdjustedPlanInputSchema,
    outputSchema: GenerateAdjustedPlanOutputSchema,
  },
  async input => {
    const {output} = await adjustedProductionPlanPrompt(input);
    if (!output) {
      throw new Error("The AI failed to generate an adjusted production plan.");
    }
    return output;
  }
);
