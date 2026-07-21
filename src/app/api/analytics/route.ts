export const maxDuration = 60; // Prevents Vercel from timing out the AI's thought process

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { supabase } from '../../supabaseClient'; 

export async function POST(req: Request) {
  try {
    // 1. Fetch the last 30 days of data from your Vault ledger
    const { data: ledger } = await supabase
      .from('daily_ledger')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    if (!ledger || ledger.length === 0) {
      return Response.json({ error: 'Not enough data yet to analyze.' }, { status: 400 });
    }

    // 2. Condense the data into a clean string for the AI prompt
    const dataString = ledger.map(day => (
      `Date: ${day.date} | Gross: ₹${day.gross_total} | Gaming: ₹${day.gaming_revenue} | F&B: ₹${day.fnb_revenue} | Cash: ₹${day.cash_collected} | UPI: ₹${day.upi_collected}`
    )).join('\n');

    // 3. Force the AI to output structured JSON data using the Flash model
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: z.object({
        weeklyTrend: z.string().describe('A short, insightful summary of the overall revenue trend.'),
        slowDayStrategy: z.string().describe('Identify the historically slowest day of the week from the data and provide a specific promo idea to fix it.'),
        peakDayOptimization: z.string().describe('Identify the strongest day and give one tip on how to maximize F&B sales on that day.'),
        actionItems: z.array(z.string()).describe('Three actionable bullet points for the cafe owner.')
      }),
      prompt: `You are the lead data analyst for Gamerarena, a premium gaming cafe. Analyze this 30-day ledger data and provide actionable business predictions and marketing advice.\n\nData:\n${dataString}`
    });

    return Response.json(object);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'AI Analysis failed. Check server logs.' }, { status: 500 });
  }
}