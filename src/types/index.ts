/**
 * Central type definitions for the WhatsApp Food Coach system
 */

// User Domain Types
export type Goal = 'fat_loss' | 'muscle_gain' | 'maintenance' | 'general';
export type Tone = 'friendly' | 'clinical' | 'funny';
export type FocusArea = 'protein' | 'veggies' | 'carbs' | 'late_eating' | 'home_cooking';
export type CarbLevel = 'low' | 'medium' | 'high';
export type TimeOfDay = 'morning' | 'noon' | 'evening' | 'late';
export type MessageDirection = 'IN' | 'OUT';
export type SourceType = 'TEXT' | 'IMAGE' | 'VOICE';

// User Context for AI
export type UserContext = {
  readonly goal?: Goal;
  readonly tone?: Tone;
  readonly reportTime?: string;
  readonly focus?: readonly FocusArea[];
};

// AI Tool Types
export type ToolName = 'set_preferences' | 'log_meal' | 'request_summary' | 'ask_coach';

export type SetPreferencesArgs = {
  readonly goal?: Goal;
  readonly tone?: Tone;
  readonly reportTime?: string;
  readonly focus?: readonly FocusArea[];
  readonly dietaryRestrictions?: readonly string[];
  readonly storeMedia?: boolean;
};

export type LogMealArgs = {
  readonly text: string;
  readonly when?: string;
};

export type RequestSummaryArgs = {
  readonly period: 'daily' | 'weekly';
  readonly date?: string;
};

export type AskCoachArgs = {
  readonly question: string;
};

// Legacy types for backward compatibility with existing services
export type PreferenceUpdate = {
  goal?: Goal;
  reportTime?: string;
  tone?: Tone;
  focus?: string[]; // Mutable array for existing service compatibility
  storeMedia?: boolean;
};

// AI Orchestrator Types
export type OrchestratorResult = {
  readonly type: 'tool' | 'reply';
  readonly toolName?: ToolName;
  readonly args?: Record<string, unknown>;
  readonly text?: string;
};

// Meal Analysis Types
export type MealTags = {
  readonly protein: boolean;
  readonly veggies: boolean;
  readonly carbs: CarbLevel;
  readonly junk: boolean;
  readonly timeOfDay: TimeOfDay;
};

// WhatsApp Provider Types
export type IncomingMessage = {
  readonly from: string;
  readonly type: 'text';
  readonly text: string;
  readonly timestamp: Date;
};

export type OutgoingMessage = {
  readonly to: string;
  readonly text: string;
};

export type MessageDeliveryResult = {
  readonly success: boolean;
  readonly messageId?: string;
  readonly error?: string;
};

// Daily Summary Types
export type DailySummary = {
  readonly date: string;
  readonly mealsCount: number;
  readonly lateMeals: number;
  readonly veggiesRatio: number;
  readonly proteinRatio: number;
  readonly junkRatio: number;
  readonly suggestions: readonly string[];
};

// Meal Analysis Types
export { MealAnalysis } from './meal';

// Database Entity Extensions
export type UserWithPreferences = {
  readonly id: string;
  readonly phone: string;
  readonly language: string;
  readonly createdAt: Date;
  readonly storeMedia: boolean;
  readonly preferences: {
    readonly userId: string;
    readonly goal: string;
    readonly tone: string;
    readonly reportTime: string;
    readonly reportFormat: string;
    readonly focus: string;
    readonly thresholds: string;
    readonly updatedAt: Date;
  } | null;
};

// Meal Statistics Types
export type MealStats = {
  readonly totalMeals: number;
  readonly lateMeals: number;
  readonly proteinRatio: number;
  readonly veggieRatio: number;
  readonly junkRatio: number;
}; 