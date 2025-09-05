
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating an optimized production plan.
 *
 * - generateProductionPlan - A function that generates a production plan based on part priorities, machine availability, and production time estimates.
 * - GenerateProductionPlanInput - The input type for the generateProductionPlan function.
 * - GenerateProductionPlanOutput - The return type for the generateProductionPlan function.
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
  quantityToProduce: z.number().describe('The target quantity to produce for this part. This field is mandatory.'),
});

const MachineDataSchema = z.object({
  machineName: z.string().describe('Name of the machine'),
  capacity: z.number().describe('Capacity of the machine'),
  available: z.boolean().describe('Whether the machine is currently available'),
  downtimeDuration: z.optional(z.number()).describe('Duration in minutes for which the machine is unavailable from the start of the shift. This is for planned downtime.'),
});

const FreeUpMachineConstraintSchema = z.object({
    machineName: z.string().describe('The name of the machine to make unavailable.'),
    startTime: z.number().describe('The time in minutes from the start of the shift when the machine becomes unavailable.'),
    endTime: z.number().describe('The time in minutes from the start of the shift when the machine becomes available again.'),
});


const GenerateProductionPlanInputSchema = z.object({
  partsData: z.array(PartDataSchema).describe('Array of part data'),
  machinesData: z.array(MachineDataSchema).describe('Array of machine data'),
  productionShiftDuration: z.number().describe('Total minutes available in current shift'),
  historicalProductionData: z.optional(z.string()).describe('Historical production data for similar operations, as a JSON string.'),
  freeUpMachineConstraints: z.optional(z.array(FreeUpMachineConstraintSchema)).describe('An optional list of constraints to ensure specific machines are unavailable during certain time slots.')
});

export type GenerateProductionPlanInput = z.infer<typeof GenerateProductionPlanInputSchema>;

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
  summary: z.string().describe('A detailed summary of the production plan, including which parts were fully or partially produced and a count of how many parts were completed. If there is an input error, this field will contain the error message.'),
});

export type GenerateProductionPlanOutput = z.infer<typeof GenerateProductionPlanOutputSchema>;

export async function generateProductionPlan(input: GenerateProductionPlanInput): Promise<GenerateProductionPlanOutput> {
  return generateProductionPlanFlow(input);
}

const productionPlanPrompt = ai.definePrompt({
  name: 'productionPlanPrompt',
  input: {schema: GenerateProductionPlanInputSchema},
  output: {schema: GenerateProductionPlanOutputSchema},
  prompt: `You are an expert production planner. Your task is to generate an optimized, minute-by-minute production plan.

**VERY IMPORTANT: INPUT VALIDATION**
Before generating a plan, you MUST first validate the input data.
1.  Check every part in the 'partsData' array.
2.  Every part MUST have a 'quantityToProduce' field with a value greater than 0.
3.  If you find any part that is missing 'quantityToProduce' or has a quantity of 0, you MUST STOP immediately.
4.  In this case, you MUST return an empty 'productionPlan' array and set the 'summary' field to this exact error message: "Error: Please fill in the necessary quantity for all parts in the planner." Do not proceed with planning.

**Your ABSOLUTE PRIMARY GOAL (after validation):**
MAXIMIZE MACHINE UTILIZATION. No machine should be idle if there is a task it can perform. Your plan must schedule operations on different machines in parallel. This is the most important rule. Machines with similar names (e.g., 'Press-75T' and 'Press-75T-2') are completely separate, independent resources. You MUST use them for different parts at the same time. A plan that leaves one of these machines idle while the other works is a failed plan.

**Input Data:**

Parts Data:
{{#each partsData}}
- Part: {{this.partName}}
  - Priority: {{this.priority}} (1 is highest)
  - Target Quantity: {{this.quantityToProduce}}
  - Operations:
    {{#each this.operations}}
    - Step: {{this.stepName}}
      - Lowest Press Requirement: {{this.lowestPress}}
      - Die Setting Time (setup time): {{this.dieSettingTime}} minutes
      - Production Time for 50 Pieces: {{this.timeFor50Pcs}} minutes
    {{/each}}
{{/each}}

Machines Data:
{{#each machinesData}}
- Machine: {{this.machineName}}
  - Capacity (Tons): {{this.capacity}}
  - Available: {{this.available}}
  - Planned Downtime: {{this.downtimeDuration}} minutes (This is planned downtime from the start of the shift)
{{/each}}

Total Shift Duration: {{productionShiftDuration}} minutes.
Historical Production Data: {{{historicalProductionData}}}
{{#if freeUpMachineConstraints}}
Constraints:
{{#each freeUpMachineConstraints}}
- Machine '{{this.machineName}}' must be unavailable from minute {{this.startTime}} to minute {{this.endTime}}.
{{/each}}
{{/if}}

**Instructions for Creating the Plan (only if validation passes):**

1.  **Prioritize Parts:** Start by scheduling the parts with the lowest priority number first.
2.  **Process Flow:** Each part must go through its specified operations sequentially. A production operation cannot start until its die setting is complete. A new operation for a part cannot start until the previous production operation for that same part is complete.
3.  **Machine Allocation (Key Optimization):**
    *   For each operation, identify suitable machines based on the "Lowest Press" requirement. A machine's capacity must be greater than or equal to the required tonnage.
    *   **CRITICAL RULE:** To prevent waste, you must not use a press that is excessively large for an operation. A suitable machine is one that meets the minimum tonnage, but you should prioritize the machine with the capacity that is *closest* to the requirement.
    *   **Example:** If an operation requires a 10T press, and machines with 10T, 20T, 30T, and 50T capacity are available, you must first try to schedule on a 10T press. If all 10T presses are busy, you may use a 20T press. You are **NOT** allowed to use a 30T or 50T press for a 10T job unless no 10T or 20T presses are available for the entire shift. Always select the available machine with the lowest suitable capacity.
    *   After identifying the pool of *appropriate* machines, you must check the availability of every machine in that pool and choose the one that allows the earliest possible start time.
4.  **Scheduling Logic (Minute-by-Minute):**
    *   Keep track of each machine's availability schedule. A machine is busy during a scheduled operation and die removal.
    *   **Separate Die Setting:** For each operation, you MUST create two separate items in the \`productionPlan\`:
        a) A "Die Setting" task. Its duration is the 'dieSettingTime'. Its 'quantity' is 0.
        b) A "Production" task. This task must start immediately after the "Die Setting" task on the same machine.
    *   When scheduling an operation for a part (e.g., Part A, Operation 2), find the earliest possible start time for its "Die Setting" task. This time is determined by the maximum of:
        a) The end time of the *previous* operation's "Production" task (Part A, Operation 1).
        b) The time the chosen machine becomes available (after checking ALL suitable machines).
    *   **Adhere to Target Quantity:** The 'quantityToProduce' for each part is a strict target. You MUST calculate the exact time needed to produce this specific quantity. Do NOT produce more than the target quantity. The 'quantity' field in the "Production" task item must match the 'quantityToProduce'.
    *   Calculate the 'endTime' for both "Die Setting" and "Production" tasks based on their respective durations.
5.  **Die Removal Time (New Rule):** After every "Production" task, the machine is occupied for an additional "die removal" period. You must account for this before scheduling the next task on that machine. The die removal times are:
    *   **10 minutes** for machines with capacity 10T, 20T, 30T, and 50T.
    *   **15 minutes** for all other machines (75T and above).
    *   Therefore, a machine's true availability time after a production task is \`task.endTime + die_removal_time\`.
6.  **Downtime, Break, and Availability Rules:**
    *   **Shift Boundary Rule (ABSOLUTE & MANDATORY):** The total shift duration is {{productionShiftDuration}} minutes. No task can be scheduled if its 'endTime' exceeds this value. This is a hard limit that you absolutely must not violate under any circumstances. If a task does not fit, it should not be scheduled.
    *   **Planned Downtime:** If a machine has a 'downtimeDuration', it is **STRICTLY UNAVAILABLE** from the start of the shift (minute 0) for that many minutes. You **MUST NOT** schedule any task that starts, ends, or runs within this time window. For example, if 'downtimeDuration' is 30, the machine is unavailable from time 0 to time 30. The earliest a task can start on this machine is at time 30.
    *   **Live Unavailability:** If a machine is marked as \`available: false\` and has no 'downtimeDuration' specified, it is unavailable for the **ENTIRE** shift. Do not schedule any tasks on it.
    *   **Break Time (MANDATORY & DYNAMIC):** There is a mandatory 30-minute break for all machines. This break MUST be scheduled exactly in the middle of the provided 'productionShiftDuration'. First, calculate the midpoint of the shift as \`midpoint = productionShiftDuration / 2\`. The break window is from \`midpoint - 15\` minutes to \`midpoint + 15\` minutes. For example, if the shift is 540 minutes, the midpoint is 270, and the break is from minute 255 to 285. **NO TASK** can be scheduled that starts, ends, or runs within this 30-minute window for any machine. You must use the provided \`productionShiftDuration\` for this calculation, not a hardcoded value. This is a non-negotiable rule.
    *   **Free Up Machine Constraints:** If 'freeUpMachineConstraints' is provided, you must treat these as **strict unavailability slots**. For each constraint, the specified 'machineName' is unavailable for the entire duration from 'startTime' to 'endTime'. You **MUST NOT** schedule any task that overlaps in any way with this time window.
7.  **Output Format:**
    *   The 'productionPlan' must be an array of scheduled items, with separate entries for 'Die Setting' and 'Production' tasks. Use the \`taskType\` field accordingly.
    *   The 'summary' must explain the key outcomes of the plan. It must include a precise count of how many units of each part were fully completed (i.e., went through their entire process flow up to the target quantity). It should also mention any partially completed parts and highlight key scheduling decisions made to maximize machine usage.

Generate the most efficient production plan possible based on these rules, focusing on aggressive parallel execution, minimal machine idle time, and accurate quantity calculation.
`,
});

const generateProductionPlanFlow = ai.defineFlow(
  {
    name: 'generateProductionPlanFlow',
    inputSchema: GenerateProductionPlanInputSchema,
    outputSchema: GenerateProductionPlanOutputSchema,
  },
  async input => {
    const {output} = await productionPlanPrompt(input);
    return output!;
  }
);
