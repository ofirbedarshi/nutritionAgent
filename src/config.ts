/**
 * Application configuration with environment variable validation using Zod
 */
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const configSchema = z.object({
  // Server Configuration
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  databaseUrl: z.string().min(1, 'DATABASE_URL is required'),

  // Twilio Configuration
  twilio: z.object({
    accountSid: z.string().min(1, 'TWILIO_ACCOUNT_SID is required'),
    authToken: z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
    phoneNumber: z.string().min(1, 'TWILIO_PHONE_NUMBER is required'),
  }),

  // OpenAI Configuration
  openai: z.object({
    apiKey: z.string().min(1, 'OPENAI_API_KEY is required'),
  }),

  // Logging
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Webhook Configuration
  webhookBaseUrl: z.string().url().optional(),
});

export type Config = z.infer<typeof configSchema>;

function validateConfig(): Config {
  const result = configSchema.safeParse({
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    logLevel: process.env.LOG_LEVEL,
    webhookBaseUrl: process.env.WEBHOOK_BASE_URL,
  });

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = validateConfig(); 