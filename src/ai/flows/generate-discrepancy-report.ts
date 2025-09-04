
'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing a production plan for machine usage discrepancies.
 *
 * - generateDiscrepancyReport - A function that analyzes the plan to find suboptimal machine assignments.
 * - GenerateDiscrepancyReportInput - The input type for the function.
 * - GenerateDiscrepancyReportOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { PlanConfig, ProductionPlan } from '@/lib/types';


const DiscrepancySchema = z.object({
  partName: z.string().describe('Name of the part'),
  operationName: z.string().describe('Name of the operation'),
  idealMachineName: z.string().describe('The name of the most efficient machine for this operation based on the parts data (lowestPress).'),
  idealMachineCapacity: z.number().describe('The capacity of the ideal machine.'),
  actualMachineName: z.string().describe('The name of the machine actually used in the plan.'),
  actualMachineCapacity: z.number().describe('The capacity of the machine actually used.'),
  reason: z.string().describe('A brief, clear explanation for why the suboptimal machine was chosen (e.g., "Ideal machine was busy with another part", "All ideal machines had scheduled downtime", "This was the next available suitable machine").'),
  severity: z.enum(['Low', 'Medium', 'High']).describe('The severity of the inefficiency. "Low" for a small capacity jump (e.g., 10T to 20T). "Medium" for a moderate jump (e.g., 10T to 50T). "High" for a large jump (e.g., 10T to 100T or more).'),
});

const GenerateDiscrepancyReportInputSchema = z.object({
  plan: z.any().describe('The generated production plan object.'),
  config: z.any().describe('The configuration object used to generate the plan, containing partsData and machinesData.'),
  // Adding stringified versions for the prompt context
  stringifiedPlan: z.string(),
  stringifiedParts: z.string(),
  stringifiedMachines: z.string(),
});
export type GenerateDiscrepancyReportInput = z.infer<typeof GenerateDiscrepancyReportInputSchema>;

const GenerateDiscrepancyReportOutputSchema = z.object({
  discrepancies: z.array(DiscrepancySchema).describe('An array of machine assignment discrepancies. If no discrepancies are found, this array will be empty.'),
});
export type DiscrepancyReportOutput = z.infer<typeof GenerateDiscrepancyReportOutputSchema>;

// Wrapper function to be called from server actions
export async function generateDiscrepancyReport(input: {plan: ProductionPlan, config: PlanConfig}): Promise<DiscrepancyReportOutput> {
    const flowInput: GenerateDiscrepancyReportInput = {
        ...input,
        stringifiedPlan: JSON.stringify(input.plan.productionPlan, null, 2),
        stringifiedParts: JSON.stringify(input.config.partsData, null, 2),
        stringifiedMachines: JSON.stringify(input.config.machinesData, null, 2),
    };
    return generateDiscrepancyReportFlow(flowInput);
}


const discrepancyReportPrompt = ai.definePrompt({
  name: 'discrepancyReportPrompt',
  input: {schema: GenerateDiscrepancyReportInputSchema},
  output: {schema: GenerateDiscrepancyReportOutputSchema},
  prompt: `You are a production efficiency analyst. Your task is to analyze a generated production plan and identify every instance where a machine was used inefficiently.

**Definition of Inefficiency:**
An inefficiency occurs when a production operation is assigned to a machine with a capacity that is higher than the specified 'lowestPress' requirement for that operation.

**Input Data:**
- Part Specifications (including 'lowestPress'): {{{stringifiedParts}}}
- Machine Specifications (including 'capacity'): {{{stringifiedMachines}}}
- Production Schedule: {{{stringifiedPlan}}}

**Analysis Instructions:**

1.  **Iterate Through Production Tasks:** Go through each item in the 'Production Schedule' that has a \`taskType\` of "Production". Ignore "Die Setting" tasks.
2.  **Find Operation Specs:** For each production task, find the corresponding part and operation in the 'Part Specifications' to get its 'lowestPress' requirement (e.g., "Press-75T").
3.  **Compare Ideal vs. Actual:**
    -   The 'lowestPress' value from the part spec is the **ideal machine**.
    -   The 'machineName' in the schedule item is the **actual machine**.
4.  **Identify Discrepancy:** A discrepancy exists if the capacity of the 'actual machine' is greater than the capacity of the 'ideal machine'.
    -   To do this, you must look up the capacity of both machine names in the 'Machine Specifications' data.
5.  **Create Discrepancy Record:** For each discrepancy found, create an object with the following details:
    -   \`partName\`, \`operationName\`
    -   \`idealMachineName\`: The name of the ideal machine (from 'lowestPress').
    -   \`idealMachineCapacity\`: The capacity of the ideal machine.
    -   \`actualMachineName\`: The name of the machine used in the plan.
    -   \`actualMachineCapacity\`: The capacity of the actual machine.
    -   \`reason\`: Analyze the schedule at the \`startTime\` of the discrepant task. Explain briefly why the ideal machine wasn't used. Common reasons are: "Ideal machine was busy performing [Other Part Name] - [Operation]", or "All ideal capacity machines were occupied."
    -   \`severity\`: Rate the inefficiency based on the capacity difference.
        -   **Low**: A small jump (e.g., 30T required, 50T used).
        -   **Medium**: A significant jump (e.g., 30T required, 75T used).
        -   **High**: A very large jump (e.g., 30T required, 150T or more used).

**Output:**
Return an array of these discrepancy records. If no inefficiencies are found, return an empty array.
`,
});

const generateDiscrepancyReportFlow = ai.defineFlow(
  {
    name: 'generateDiscrepancyReportFlow',
    inputSchema: GenerateDiscrepancyReportInputSchema,
    outputSchema: GenerateDiscrepancyReportOutputSchema,
  },
  async (input) => {
    const {output} = await discrepancyReportPrompt(input);
    if (!output) {
      throw new Error('The AI failed to generate a discrepancy report.');
    }
    return output;
  }
);
