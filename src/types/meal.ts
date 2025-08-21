/**
 * Meal Analysis Types - AI-powered nutrition and categorization
 */

export type MealAnalysis = {
  nutrition: {
    calories: { min: number; max: number; confidence: number } | null;
    protein_g: { min: number; max: number; confidence: number } | null;
    carbs_g: { min: number; max: number; confidence: number } | null;
    fat_g: { min: number; max: number; confidence: number } | null;
    fiber_g?: { min: number; max: number; confidence: number } | null;
  };
  categories: {
    veggies: { value: boolean; confidence: number };
    junk: { value: boolean; confidence: number };
    processing_level?: { value: 1 | 2 | 3 | 4; confidence: number }; // NOVA
    homemade: { value: boolean; confidence: number };
    carbs_quality?: { value: "refined" | "whole" | "mixed" | "unknown"; confidence: number };
  };
  ingredients: Array<{ name: string; confidence: number }>;
  meal_type: { value: "breakfast" | "lunch" | "dinner" | "snack" | "post_workout" | "other"; confidence: number };
  portion_size: { value: "small" | "medium" | "large"; confidence: number };
  dietary_flags?: {
    dairy?: boolean;
    gluten?: boolean;
    nuts?: boolean;
    vegan_friendly?: boolean;
  };
  overall_confidence: number; // 0..1
  notes?: string; // <= 20 words
  estimation_source: "openai";
  model_version?: string;
  classification_version: number;
}; 