/**
 * Zod validation schemas for AI tool arguments
 */

import { z } from 'zod';

export const setPreferencesSchema = z.object({
  goal: z.enum(['fat_loss', 'muscle_gain', 'maintenance', 'general']).optional(),
  tone: z.enum(['friendly', 'clinical', 'funny']).optional(),
  reportTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  focus: z.array(z.enum(['protein', 'veggies', 'carbs', 'late_eating', 'home_cooking'])).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  storeMedia: z.boolean().optional(),
});

export const logMealSchema = z.object({
  text: z.string().min(1),
  when: z.string().datetime().optional(),
});

export const requestSummarySchema = z.object({
  period: z.enum(['daily', 'weekly']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const askCoachSchema = z.object({
  question: z.string().min(1),
});

export type SetPreferencesArgs = z.infer<typeof setPreferencesSchema>;
export type LogMealArgs = z.infer<typeof logMealSchema>;
export type RequestSummaryArgs = z.infer<typeof requestSummarySchema>;
export type AskCoachArgs = z.infer<typeof askCoachSchema>; 