/**
 * Handler for logging meals
 */
import { MealService } from '../../meals/MealService';
import { logMealSchema } from '../../../ai/schemas';
import { type LogMealArgs } from '../../../types';
import { logger } from '../../../lib/logger';
import { BaseMessageHandler } from './BaseMessageHandler';

export class LogMealHandler extends BaseMessageHandler {
  constructor(private mealService: MealService) {
    super();
  }

  getToolName(): string {
    return 'log_meal';
  }

  async handle(args: any, userId: string, messageTimestamp: Date, user: any): Promise<{ text: string; type: string }> {
    try {
      const validArgs = logMealSchema.parse(args) as LogMealArgs;
      const mealTime = validArgs.when ? new Date(validArgs.when) : messageTimestamp;
      
      const { meal, tags } = await this.mealService.createMeal(
        userId,
        validArgs.text,
        'TEXT',
        mealTime
      );

      // Generate personalized hint
      const responseText = this.mealService.generateMealHint(user, tags);
      
      logger.info('[LogMealHandler] Meal logged via AI', {
        userId,
        mealId: meal.id,
        tags,
      });

      return {
        text: responseText,
        type: 'meal_logged'
      };
    } catch (error) {
      logger.error('[LogMealHandler] Invalid meal args', { error, args });
      return {
        text: 'Sorry, I couldn\'t log that meal. Please try again.',
        type: 'error'
      };
    }
  }
} 