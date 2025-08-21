/**
 * Handler for coaching questions
 */
import { CoachService } from '../../coach/CoachService';
import { askCoachSchema } from '../../../ai/schemas';
import { type AskCoachArgs } from '../../../types';
import { logger } from '../../../lib/logger';
import { BaseMessageHandler } from './BaseMessageHandler';

export class AskCoachHandler extends BaseMessageHandler {
  getToolName(): string {
    return 'ask_coach';
  }

  async handle(args: any): Promise<{ text: string; type: string }> {
    try {
      const validArgs = askCoachSchema.parse(args) as AskCoachArgs;
      const responseText = CoachService.generateAdvice(validArgs.question);
      
      return {
        text: responseText,
        type: 'coaching_advice'
      };
    } catch (error) {
      logger.error('[AskCoachHandler] Invalid coach args', { error, args });
      return {
        text: 'I\'m here to help with your nutrition goals! What would you like to know?',
        type: 'error'
      };
    }
  }
} 