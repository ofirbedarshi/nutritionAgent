/**
 * Tool Orchestrator - Manages and routes tool execution to appropriate handlers
 */
import { PrismaClient } from '@prisma/client';
import { BaseMessageHandler } from './handlers/BaseMessageHandler';
import { SetPreferencesHandler } from './handlers/SetPreferencesHandler';
import { LogMealHandler } from './handlers/LogMealHandler';
import { RequestSummaryHandler } from './handlers/RequestSummaryHandler';
import { AskCoachHandler } from './handlers/AskCoachHandler';
import { PreferenceService } from '../prefs/PreferenceService';
import { MealService } from '../meals/MealService';
import { DailySummaryService } from '../reports/DailySummaryService';
import { logger } from '../../lib/logger';

export class ToolOrchestrator {
  private handlers: Map<string, BaseMessageHandler> = new Map();

  constructor(
    prisma: PrismaClient,
    whatsAppProvider: any // TODO: Create proper interface for messaging providers
  ) {
    // Initialize services
    const preferenceService = new PreferenceService(prisma);
    const mealService = new MealService(prisma);
    const summaryService = new DailySummaryService(prisma, whatsAppProvider);

    // Register handlers
    this.registerHandler(new SetPreferencesHandler(preferenceService));
    this.registerHandler(new LogMealHandler(mealService));
    this.registerHandler(new RequestSummaryHandler(summaryService));
    this.registerHandler(new AskCoachHandler());
  }

  /**
   * Register a new handler
   */
  private registerHandler(handler: BaseMessageHandler): void {
    this.handlers.set(handler.getToolName(), handler);
  }

  /**
   * Execute a tool using the appropriate handler
   */
  async executeTool(
    toolName: string, 
    args: any, 
    userId: string, 
    messageTimestamp: Date, 
    user?: any
  ): Promise<{ text: string; type: string }> {
    const handler = this.handlers.get(toolName);
    
    if (!handler) {
      logger.warn('[ToolOrchestrator] Unknown tool', { toolName });
      return {
        text: 'I\'m not sure how to help with that. Try asking about meals, goals, or nutrition advice!',
        type: 'unknown_tool'
      };
    }

    return await handler.handle(args, userId, messageTimestamp, user);
  }

  /**
   * Get all registered tool names
   */
  getRegisteredTools(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a tool is registered
   */
  hasHandler(toolName: string): boolean {
    return this.handlers.has(toolName);
  }
} 