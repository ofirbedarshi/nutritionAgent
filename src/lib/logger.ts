/**
 * Centralized logging configuration using Pino
 */
import pino from 'pino';
import { config } from '../config';

const isDevelopment = config.nodeEnv === 'development';

export const logger = pino({
  level: config.logLevel,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss',
        },
      }
    : undefined,
  base: {
    env: config.nodeEnv,
  },
});

export type Logger = typeof logger; 