/**
 * Zod validation schemas for AI tool arguments
 */

import { z } from 'zod';
import { TIME_FORMAT_REGEX, DATE_FORMAT_REGEX } from '../constants';

export const setPreferencesSchema = z.object({
  goal: z.enum(['fat_loss', 'muscle_gain', 'maintenance', 'general']).optional(),
  tone: z.enum(['friendly', 'clinical', 'funny']).optional(),
  reportTime: z.string().regex(TIME_FORMAT_REGEX).optional(),
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
  date: z.string().regex(DATE_FORMAT_REGEX).optional(),
});

export const askCoachSchema = z.object({
  question: z.string().min(1),
}); 