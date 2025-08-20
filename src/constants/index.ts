/**
 * Application constants and configuration values
 */

// Message Limits
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_HINT_LENGTH = 160; // Keep hints concise for WhatsApp

// Time Constants
export const LATE_EATING_HOUR = 21; // 9 PM
export const CUSTOMER_SERVICE_WINDOW_HOURS = 24;
export const REPORT_SCHEDULER_CHECK_INTERVAL = '0 */5 * * * *'; // Every 5 minutes

// Default Values
export const DEFAULT_LANGUAGE = 'he';
export const DEFAULT_GOAL = 'general';
export const DEFAULT_TONE = 'friendly';
export const DEFAULT_REPORT_TIME = '21:30';
export const DEFAULT_REPORT_FORMAT = 'text';

// OpenAI Configuration
export const OPENAI_MODEL = 'gpt-4o-mini';
export const OPENAI_TEMPERATURE = 0.1;
export const OPENAI_MAX_TOKENS = 500;

// Database Constants
export const MEAL_STATS_DEFAULT_DAYS = 1;
export const CRON_REPORT_BATCH_SIZE = 10;

// Validation Constants
export const PHONE_NUMBER_REGEX = /^\+[1-9]\d{1,14}$/;
export const TIME_FORMAT_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Error Messages
export const ERROR_MESSAGES = {
  MESSAGE_TOO_LONG: 'Message too long. Please keep it under 1000 characters.',
  INVALID_WEBHOOK: 'Invalid webhook request',
  INTERNAL_ERROR: 'Sorry, something went wrong. Please try again later.',
  PREFERENCE_UPDATE_FAILED: 'Sorry, I couldn\'t understand your preference update. Please try again.',
  MEAL_LOG_FAILED: 'Sorry, I couldn\'t log that meal. Please try again.',
  SUMMARY_FAILED: 'Sorry, I couldn\'t generate that summary. Please try again.',
  COACH_FALLBACK: 'I\'m here to help with your nutrition goals! What would you like to know?',
  UNKNOWN_TOOL: 'I\'m not sure how to help with that. Try asking about meals, goals, or nutrition advice!',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  MEAL_LOGGED: 'Meal logged successfully',
  PREFERENCES_UPDATED: 'Preferences updated',
  DAILY_REPORT_SENT: 'Daily report sent',
} as const;

// Log Context Tags
export const LOG_TAGS = {
  INCOMING_MESSAGE: '[INCOMING]',
  OUTGOING_MESSAGE: '[OUTGOING]',
  AI_ROUTING: '[AI_ROUTING]',
  TOOL_EXECUTION: '[TOOL_EXEC]',
  DATABASE_OPERATION: '[DB_OP]',
  WEBHOOK_VALIDATION: '[WEBHOOK]',
  DAILY_REPORT: '[DAILY_REPORT]',
} as const; 