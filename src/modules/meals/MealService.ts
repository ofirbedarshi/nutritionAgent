/**
 * Meal service for managing meal operations
 */
import { PrismaClient, Meal } from '@prisma/client';
import { MealTagger, MealTags } from './MealTagger';
import { UserWithPreferences } from '../users/UserRepository';
import { logger } from '../../lib/logger';

export class MealService {
  private tagger: MealTagger;

  constructor(private prisma: PrismaClient) {
    this.tagger = new MealTagger();
  }

  /**
   * Create a new meal entry with tags
   */
  async createMeal(
    userId: string,
    rawText: string,
    sourceType = 'TEXT',
    timestamp = new Date()
  ): Promise<{ meal: Meal; tags: MealTags }> {
    try {
      const tags = this.tagger.tagMealFromText(rawText, timestamp);

      const meal = await this.prisma.meal.create({
        data: {
          userId,
          rawText,
          sourceType,
          tags: JSON.stringify(tags),
          createdAt: timestamp,
        },
      });

      logger.info('Meal created successfully', {
        mealId: meal.id,
        userId,
        tags,
      });

      return { meal, tags };
    } catch (error) {
      logger.error('Failed to create meal', {
        userId,
        rawText,
        error,
      });
      throw error;
    }
  }

  /**
   * Generate a personalized hint for a meal
   */
  generateMealHint(_user: UserWithPreferences, _tags: MealTags): string {
    return 'Meal logged!';
  }

  /**
   * Get meals for a user within a date range
   */
  async getMealsInRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Meal[]> {
    try {
      return await this.prisma.meal.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      logger.error('Failed to get meals in range', {
        userId,
        startDate,
        endDate,
        error,
      });
      throw error;
    }
  }

  /**
   * Get meal statistics for a date range
   */
  async getMealStats(userId: string, startDate: Date, endDate: Date): Promise<{
    totalMeals: number;
    lateMeals: number;
    veggieRatio: number;
    proteinRatio: number;
    junkRatio: number;
  }> {
    try {
      const meals = await this.getMealsInRange(userId, startDate, endDate);
      
      if (meals.length === 0) {
        return {
          totalMeals: 0,
          lateMeals: 0,
          veggieRatio: 0,
          proteinRatio: 0,
          junkRatio: 0,
        };
      }

      const lateMeals = meals.filter(meal => {
        const tags = JSON.parse(meal.tags) as MealTags;
        return tags.timeOfDay === 'late';
      }).length;

      const veggieCount = meals.filter(meal => {
        const tags = JSON.parse(meal.tags) as MealTags;
        return tags.veggies;
      }).length;

      const proteinCount = meals.filter(meal => {
        const tags = JSON.parse(meal.tags) as MealTags;
        return tags.protein;
      }).length;

      const junkCount = meals.filter(meal => {
        const tags = JSON.parse(meal.tags) as MealTags;
        return tags.junk;
      }).length;

      return {
        totalMeals: meals.length,
        lateMeals,
        veggieRatio: veggieCount / meals.length,
        proteinRatio: proteinCount / meals.length,
        junkRatio: junkCount / meals.length,
      };
    } catch (error) {
      logger.error('Failed to calculate meal stats', {
        userId,
        startDate,
        endDate,
        error,
      });
      throw error;
    }
  }
} 