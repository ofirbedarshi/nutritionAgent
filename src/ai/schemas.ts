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

// Schema for validating OpenAI meal analysis response
export const mealAnalysisSchema = z.object({
  nutrition: z.object({
    calories: z.object({
      min: z.number(),
      max: z.number(),
      confidence: z.number().min(0).max(1),
    }).nullable(),
    protein_g: z.object({
      min: z.number(),
      max: z.number(),
      confidence: z.number().min(0).max(1),
    }).nullable(),
    carbs_g: z.object({
      min: z.number(),
      max: z.number(),
      confidence: z.number().min(0).max(1),
    }).nullable(),
    fat_g: z.object({
      min: z.number(),
      max: z.number(),
      confidence: z.number().min(0).max(1),
    }).nullable(),
    fiber_g: z.object({
      min: z.number(),
      max: z.number(),
      confidence: z.number().min(0).max(1),
    }).nullable().optional(),
  }),
  categories: z.object({
    veggies: z.object({
      value: z.boolean(),
      confidence: z.number().min(0).max(1),
    }),
    junk: z.object({
      value: z.boolean(),
      confidence: z.number().min(0).max(1),
    }),
    processing_level: z.object({
      value: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      confidence: z.number().min(0).max(1),
    }).optional(),
    homemade: z.object({
      value: z.boolean(),
      confidence: z.number().min(0).max(1),
    }),
    carbs_quality: z.object({
      value: z.enum(['refined', 'whole', 'mixed', 'unknown']),
      confidence: z.number().min(0).max(1),
    }).optional(),
  }),
  ingredients: z.array(z.object({
    name: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  meal_type: z.object({
    value: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'post_workout', 'other']),
    confidence: z.number().min(0).max(1),
  }),
  portion_size: z.object({
    value: z.enum(['small', 'medium', 'large']),
    confidence: z.number().min(0).max(1),
  }),
  dietary_flags: z.object({
    dairy: z.boolean().optional(),
    gluten: z.boolean().optional(),
    nuts: z.boolean().optional(),
    vegan_friendly: z.boolean().optional(),
  }).optional(),
  overall_confidence: z.number().min(0).max(1),
  notes: z.string().max(100).optional(),
}); 