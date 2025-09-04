
'use server';

import { generateProductionPlan, GenerateProductionPlanInput, GenerateProductionPlanOutput } from '@/ai/flows/generate-production-plan';
import { generateAdjustedPlan, GenerateAdjustedPlanOutput } from '@/ai/flows/generate-adjusted-plan';
import { generatePlanInsights, PlanInsightsOutput } from '@/ai/flows/generate-plan-insights';
import { generateDiscrepancyReport, DiscrepancyReportOutput } from '@/ai/flows/generate-discrepancy-report';
import type { PlanConfig } from '@/lib/types';


export async function getProductionPlan(
  input: GenerateProductionPlanInput
): Promise<{ data: { plan: GenerateProductionPlanOutput, insights: PlanInsightsOutput | null, discrepancyReport: DiscrepancyReportOutput | null } | null; error: string | null }> {
  try {
    // Basic frontend validation to prevent unnecessary AI calls
    const invalidPart = input.partsData.find(p => !p.quantityToProduce || p.quantityToProduce <= 0);
    if (invalidPart) {
        return { data: null, error: `Error: Please provide a valid quantity for part "${invalidPart.partName}".`};
    }

    const planOutput = await generateProductionPlan(input);

    if (!planOutput) {
       return { data: null, error: 'Failed to generate a plan. The AI returned no output.' };
    }
    
    // If the AI returns the specific validation error, pass it to the frontend.
    if (planOutput.summary.startsWith("Error:")) {
        return { data: null, error: planOutput.summary };
    }

    // If the plan is empty but there's no error summary, it's a different issue.
    if (planOutput.productionPlan.length === 0 && !planOutput.summary.startsWith("Error:")) {
       return { data: null, error: 'The AI returned an empty plan. Please check your input data and try again.' };
    }

    const configForInsights: PlanConfig = {
      partsData: input.partsData,
      machinesData: input.machinesData,
      productionShiftDuration: input.productionShiftDuration,
      historicalProductionData: input.historicalProductionData
    };

    const insightsInput = {
      plan: planOutput,
      config: configForInsights,
    };

    const [insightsOutput, discrepancyReportOutput] = await Promise.all([
      generatePlanInsights(insightsInput),
      generateDiscrepancyReport(insightsInput)
    ]);


    if (!insightsOutput) {
        // Since insights are secondary, we can still return the plan.
        console.warn('The production plan was generated, but insights could not be created.');
    }
     if (!discrepancyReportOutput) {
        console.warn('The production plan was generated, but the discrepancy report could not be created.');
    }


    return { data: { plan: planOutput, insights: insightsOutput || null, discrepancyReport: discrepancyReportOutput || null }, error: null };
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    // Provide a more user-friendly error message
    let displayError = `An unexpected error occurred: ${errorMessage}`;
    if (errorMessage.includes('deadline')) {
        displayError = "The request to the AI timed out. This can happen with very complex plans. Please try again or simplify the request."
    } else if (errorMessage.includes('API key')) {
        displayError = "The AI service API key is not configured correctly. Please check your environment variables."
    }
    return { data: null, error: displayError };
  }
}

export async function getAdjustedProductionPlan(
  input: Parameters<typeof generateAdjustedPlan>[0]
): Promise<{ data: { plan: GenerateAdjustedPlanOutput, insights: PlanInsightsOutput, discrepancyReport: DiscrepancyReportOutput | null } | null; error: string | null }> {
  try {
    const planOutput = await generateAdjustedPlan(input);

     if (!planOutput || !planOutput.productionPlan) {
       return { data: null, error: 'Failed to generate an adjusted plan. The AI returned no output or an invalid plan structure.' };
    }

    // We need to create a GenerateProductionPlanInput object for the insights flow
    const insightsConfig: PlanConfig = {
      partsData: input.partsData,
      machinesData: input.machinesData,
      productionShiftDuration: input.productionShiftDuration,
      historicalProductionData: input.historicalProductionData,
    };

    const insightsInput = {
      plan: planOutput,
      config: insightsConfig,
    };

    const [insightsOutput, discrepancyReportOutput] = await Promise.all([
        generatePlanInsights(insightsInput),
        generateDiscrepancyReport(insightsInput)
    ]);


     if (!insightsOutput) {
        return { data: null, error: 'The adjusted plan was generated, but insights could not be created.' };
    }
    if (!discrepancyReportOutput) {
        console.warn('The adjusted plan was generated, but the discrepancy report could not be created.');
    }

    return { data: { plan: planOutput, insights: insightsOutput, discrepancyReport: discrepancyReportOutput || null }, error: null };
  } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      let displayError = `An unexpected error occurred: ${errorMessage}`;
      if (errorMessage.includes('deadline')) {
          displayError = "The request to the AI timed out. This can happen with very complex plans. Please try again or simplify the request."
      }
      return { data: null, error: displayError };
  }
}
