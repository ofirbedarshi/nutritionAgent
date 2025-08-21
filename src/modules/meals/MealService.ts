/**
 * Meal service for managing meal operations
 */
import { PrismaClient, Meal } from '@prisma/client';
import { AIMealAnalyzer } from './AIMealAnalyzer';
import { MealAnalysis } from '../../types/meal';
import { UserWithPreferences } from '../users/UserRepository';
import { logger } from '../../lib/logger';

export class MealService {
  private analyzer: AIMealAnalyzer;

  constructor(private prisma: PrismaClient) {
    this.analyzer = new AIMealAnalyzer();
  }

  /**
   * Create a new meal entry with tags
   */
  async createMeal(
    userId: string,
    rawText: string,
    sourceType = 'TEXT',
    timestamp = new Date()
  ): Promise<{ meal: Meal; analysis: MealAnalysis | null }> {
    try {
      const analysis = await this.analyzer.analyzeMeal(rawText, timestamp);
      
      const meal = await this.prisma.meal.create({
        data: {
          userId,
          rawText,
          sourceType,
          tags: analysis ? JSON.stringify(analysis) : '{}',
          createdAt: timestamp,
        },
      });

      if (analysis) {
        logger.info('Meal created successfully with AI analysis', {
          mealId: meal.id,
          userId,
          overallConfidence: analysis.overall_confidence,
          ingredientCount: analysis.ingredients.length,
        });
      } else {
        logger.warn('Meal created without analysis - AI failed', {
          mealId: meal.id,
          userId,
          rawText,
        });
      }

      return { meal, analysis };
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
  generateMealHint(_user: UserWithPreferences, _analysis: MealAnalysis): string {
    return JSON.stringify(_analysis);
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
   * Get meal statistics for a date range using AI analysis
   */
  async getMealStats(userId: string, startDate: Date, endDate: Date): Promise<{
    totalMeals: number;
    lateMeals: number;
    veggieRatio: number;
    proteinRatio: number;
    junkRatio: number;
    averageConfidence: number;
    estimatedCalories: { min: number; max: number } | null;
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
          averageConfidence: 0,
          estimatedCalories: null,
        };
      }

      let totalConfidence = 0;
      let veggieCount = 0;
      let proteinCount = 0;
      let junkCount = 0;
      let lateMeals = 0;
      let totalCaloriesMin = 0;
      let totalCaloriesMax = 0;
      let calorieCount = 0;
      let analyzedMealCount = 0;

      for (const meal of meals) {
        try {
          const tags = JSON.parse(meal.tags);
          
          // Skip meals without analysis (empty tags)
          if (!tags || Object.keys(tags).length === 0) {
            continue;
          }
          
          const analysis = tags as MealAnalysis;
          analyzedMealCount++;
          
          totalConfidence += analysis.overall_confidence;
          
          // Count categories with confidence weighting
          if (analysis.categories.veggies.value && analysis.categories.veggies.confidence > 0.5) {
            veggieCount++;
          }
          
          if (analysis.categories.junk.value && analysis.categories.junk.confidence > 0.5) {
            junkCount++;
          }
          
          // Count protein-rich meals (we'll infer from nutrition data)
          if (analysis.nutrition.protein_g && analysis.nutrition.protein_g.confidence > 0.5) {
            if (analysis.nutrition.protein_g.min > 15) { // Significant protein
              proteinCount++;
            }
          }
          
          // Count late meals (dinner after 9 PM or snacks after 10 PM)
          const mealHour = meal.createdAt.getHours();
          if ((analysis.meal_type.value === 'dinner' && mealHour >= 21) || 
              (analysis.meal_type.value === 'snack' && mealHour >= 22)) {
            lateMeals++;
          }
          
          // Sum calories if available
          if (analysis.nutrition.calories && analysis.nutrition.calories.confidence > 0.3) {
            totalCaloriesMin += analysis.nutrition.calories.min;
            totalCaloriesMax += analysis.nutrition.calories.max;
            calorieCount++;
          }
          
        } catch (parseError) {
          logger.warn('Failed to parse meal analysis', { mealId: meal.id, parseError });
        }
      }

      return {
        totalMeals: meals.length,
        lateMeals,
        veggieRatio: analyzedMealCount > 0 ? veggieCount / analyzedMealCount : 0,
        proteinRatio: analyzedMealCount > 0 ? proteinCount / analyzedMealCount : 0,
        junkRatio: analyzedMealCount > 0 ? junkCount / analyzedMealCount : 0,
        averageConfidence: analyzedMealCount > 0 ? totalConfidence / analyzedMealCount : 0,
        estimatedCalories: calorieCount > 0 ? {
          min: Math.round(totalCaloriesMin),
          max: Math.round(totalCaloriesMax)
        } : null,
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