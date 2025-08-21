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
      
      const { meal, analysis } = await this.mealService.createMeal(
        userId,
        validArgs.text,
        'TEXT',
        mealTime
      );

      if (analysis) {
        // AI analysis succeeded
        const responseText = this.mealService.generateMealHint(user, analysis);
        
        logger.info('[LogMealHandler] Meal logged with AI analysis', {
          userId,
          mealId: meal.id,
          overallConfidence: analysis.overall_confidence,
          ingredientCount: analysis.ingredients.length,
        });

        return {
          text: responseText,
          type: 'meal_logged'
        };
      } else {
        // AI analysis failed but meal was still saved
        logger.info('[LogMealHandler] Meal logged without analysis', {
          userId,
          mealId: meal.id,
          rawText: validArgs.text,
        });

        return {
          text: 'Meal logged! (Analysis temporarily unavailable, but your meal is saved)',
          type: 'meal_logged_no_analysis'
        };
      }
    } catch (error) {
      logger.error('[LogMealHandler] Invalid meal args', { error, args });
      return {
        text: 'Sorry, I couldn\'t log that meal. Please try again.',
        type: 'error'
      };
    }
  }
} 