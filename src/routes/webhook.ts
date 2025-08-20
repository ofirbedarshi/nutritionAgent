/**
 * WhatsApp webhook route handler with AI orchestrator
 */
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { WhatsAppProvider } from '../lib/provider/WhatsAppProvider';
import { UserService } from '../modules/users/UserService';
import { UserRepository } from '../modules/users/UserRepository';
import { PreferenceService } from '../modules/prefs/PreferenceService';
import { MealService } from '../modules/meals/MealService';
import { DailySummaryService } from '../modules/reports/DailySummaryService';
import { CoachService } from '../modules/coach/CoachService';
import { routeMessage, type UserContext } from '../ai/AIOrchestrator';
import { 
  setPreferencesSchema, 
  logMealSchema, 
  requestSummarySchema, 
  askCoachSchema,
  type SetPreferencesArgs,
  type LogMealArgs,
  type RequestSummaryArgs,
  type AskCoachArgs
} from '../ai/schemas';
import { logger } from '../lib/logger';
import { validateMessageLength } from '../utils/text';

export function createWebhookRouter(
  prisma: PrismaClient,
  whatsAppProvider: WhatsAppProvider
): Router {
  const router = Router();
  
  // Services
  const userService = new UserService(new UserRepository(prisma));
  const preferenceService = new PreferenceService(prisma);
  const mealService = new MealService(prisma);
  const summaryService = new DailySummaryService(prisma, whatsAppProvider);

  /**
   * Main WhatsApp webhook handler with AI orchestrator
   */
  router.post('/whatsapp', async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate webhook
      if (!whatsAppProvider.validateWebhook(req)) {
        logger.warn('Invalid webhook request', { body: req.body });
        res.status(400).json({ error: 'Invalid webhook' });
        return;
      }

      // Parse incoming message
      const incomingMessage = await whatsAppProvider.parseIncoming(req);
      
      // Validate message length
      if (!validateMessageLength(incomingMessage.text)) {
        logger.warn('Invalid message length', { 
          from: incomingMessage.from,
          length: incomingMessage.text.length 
        });
        
        await whatsAppProvider.sendText({
          to: incomingMessage.from,
          text: 'Message too long. Please keep it under 1000 characters.',
        });
        
        res.json({ status: 'error', message: 'Message too long' });
        return;
      }

      // Get or create user and load preferences for context
      const user = await userService.getOrCreateUser(incomingMessage.from);
      const preferences = user.preferences;
      
      // Log incoming message
      await prisma.messageLog.create({
        data: {
          userId: user.id,
          direction: 'IN',
          payload: JSON.stringify({
            type: 'text',
            text: incomingMessage.text,
            from: incomingMessage.from,
            timestamp: incomingMessage.timestamp,
          }),
        },
      });

      logger.info('Incoming message processed', {
        userId: user.id,
        from: incomingMessage.from,
        textLength: incomingMessage.text.length,
      });

      // Build user context for AI
      const context: UserContext = {
        goal: preferences?.goal,
        tone: preferences?.tone,
        reportTime: preferences?.reportTime,
        focus: preferences?.focus ? JSON.parse(preferences.focus) : undefined,
      };

      // Route message using AI orchestrator
      const orchestratorResult = await routeMessage(incomingMessage.text, context);
      
      let responseText: string;
      let responseType: string;

      if (orchestratorResult.type === 'tool' && orchestratorResult.toolName && orchestratorResult.args) {
        // Handle tool execution
        const { toolName, args } = orchestratorResult;
        
        logger.info('Executing tool', { toolName, args });

        switch (toolName) {
          case 'set_preferences':
            try {
              const validArgs = setPreferencesSchema.parse(args) as SetPreferencesArgs;
              await preferenceService.applyPreferences(user.id, validArgs);
              
              const updates = [];
              if (validArgs.goal) updates.push(`goal: ${validArgs.goal}`);
              if (validArgs.tone) updates.push(`tone: ${validArgs.tone}`);
              if (validArgs.reportTime) updates.push(`report time: ${validArgs.reportTime}`);
              if (validArgs.focus) updates.push(`focus: ${validArgs.focus.join(', ')}`);
              if (validArgs.dietaryRestrictions) updates.push(`dietary restrictions: ${validArgs.dietaryRestrictions.join(', ')}`);
              
              responseText = `✅ Updated: ${updates.join(', ')}`;
              responseType = 'preference_update';
            } catch (error) {
              logger.error('Invalid preference args', { error, args });
              responseText = 'Sorry, I couldn\'t understand your preference update. Please try again.';
              responseType = 'error';
            }
            break;

          case 'log_meal':
            try {
              const validArgs = logMealSchema.parse(args) as LogMealArgs;
              const mealTime = validArgs.when ? new Date(validArgs.when) : incomingMessage.timestamp;
              
              const { meal, tags } = await mealService.createMeal(
                user.id,
                validArgs.text,
                'TEXT',
                mealTime
              );

              // Generate personalized hint
              responseText = mealService.generateMealHint(user, tags);
              responseType = 'meal_logged';
              
              logger.info('Meal logged via AI', {
                userId: user.id,
                mealId: meal.id,
                tags,
              });
            } catch (error) {
              logger.error('Invalid meal args', { error, args });
              responseText = 'Sorry, I couldn\'t log that meal. Please try again.';
              responseType = 'error';
            }
            break;

          case 'request_summary':
            try {
              const validArgs = requestSummarySchema.parse(args) as RequestSummaryArgs;
              const summaryDate = validArgs.date ? new Date(validArgs.date) : new Date();
              
              if (validArgs.period === 'daily') {
                const summary = await summaryService.composeDailySummary(user.id, summaryDate);
                const tone = (user.preferences?.tone as 'friendly' | 'clinical' | 'funny') || 'friendly';
                responseText = summaryService.formatSummaryText(summary, tone);
              } else {
                // Weekly summary placeholder
                responseText = 'Weekly summaries coming soon! For now, try asking for your daily report.';
              }
              responseType = 'summary';
            } catch (error) {
              logger.error('Invalid summary args', { error, args });
              responseText = 'Sorry, I couldn\'t generate that summary. Please try again.';
              responseType = 'error';
            }
            break;

          case 'ask_coach':
            try {
              const validArgs = askCoachSchema.parse(args) as AskCoachArgs;
              responseText = CoachService.generateAdvice(validArgs.question);
              responseType = 'coaching_advice';
            } catch (error) {
              logger.error('Invalid coach args', { error, args });
              responseText = 'I\'m here to help with your nutrition goals! What would you like to know?';
              responseType = 'error';
            }
            break;

          default:
            logger.warn('Unknown tool', { toolName });
            responseText = 'I\'m not sure how to help with that. Try asking about meals, goals, or nutrition advice!';
            responseType = 'unknown_tool';
        }
      } else {
        // Direct text response from AI
        responseText = orchestratorResult.text || 'I\'m here to help with your nutrition goals!';
        responseType = 'ai_response';
      }

      // Send response to user
      await whatsAppProvider.sendText({
        to: incomingMessage.from,
        text: responseText,
      });

      // Log outgoing message
      await prisma.messageLog.create({
        data: {
          userId: user.id,
          direction: 'OUT',
          payload: JSON.stringify({
            type: responseType,
            text: responseText,
            tool: orchestratorResult.toolName,
            args: orchestratorResult.args,
          }),
        },
      });

      logger.info('AI orchestrated response sent', {
        userId: user.id,
        responseType,
        tool: orchestratorResult.toolName,
      });

      res.json({ status: 'success', type: responseType });

    } catch (error) {
      logger.error('Error processing webhook', { error, body: req.body });
      
      // Send a friendly error message to the user if possible
      try {
        if (req.body?.From) {
          const phone = req.body.From.replace('whatsapp:', '');
          await whatsAppProvider.sendText({
            to: phone,
            text: 'Sorry, something went wrong. Please try again later.',
          });
        }
      } catch (sendError) {
        logger.error('Failed to send error message to user', { sendError });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Health check endpoint
   */
  router.get('/health', (_req: Request, res: Response): void => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  return router;
} 