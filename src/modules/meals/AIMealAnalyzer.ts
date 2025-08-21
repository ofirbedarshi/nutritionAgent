/**
 * AI-Powered Meal Analyzer - Uses OpenAI to extract nutrition and categorization data
 */
import OpenAI from 'openai';
import { MealAnalysis } from '../../types/meal';
import { logger } from '../../lib/logger';
import { mealAnalysisSchema } from '../../ai/schemas';
import { ZodError } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AIMealAnalyzer {
  private static readonly CLASSIFICATION_VERSION = 1;
  private static readonly MODEL_VERSION = 'gpt-4o-mini';

  /**
   * Analyze meal text using OpenAI to extract nutrition and categorization data
   * Returns null if analysis fails - no fallback heuristics
   */
  async analyzeMeal(mealText: string, timestamp: Date): Promise<MealAnalysis | null> {
    try {
      const timeOfDay = this.getTimeOfDay(timestamp);
      
      const prompt = this.buildAnalysisPrompt(mealText, timeOfDay);
      
      const response = await openai.chat.completions.create({
        model: AIMealAnalyzer.MODEL_VERSION,
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition expert. Analyze meals and provide structured data. If you are uncertain about any nutrition values, return null for that field rather than guessing. Be honest about confidence levels.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        functions: [
          {
            name: 'analyze_meal',
            description: 'Extract nutrition and categorization data from meal description',
            parameters: {
              type: 'object',
              properties: {
                nutrition: {
                  type: 'object',
                  properties: {
                    calories: {
                      type: 'object',
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 }
                      }
                    },
                    protein_g: {
                      type: 'object',
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 }
                      }
                    },
                    carbs_g: {
                      type: 'object',
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 }
                      }
                    },
                    fat_g: {
                      type: 'object',
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 }
                      }
                    },
                    fiber_g: {
                      type: 'object',
                      properties: {
                        min: { type: 'number' },
                        max: { type: 'number' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 }
                      }
                    }
                  }
                },
                categories: {
                  type: 'object',
                  properties: {
                    veggies: {
                      type: 'object',
                      properties: {
                        value: { type: 'boolean' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 }
                      },
                      required: ['value', 'confidence']
                    },
                    junk: {
                      type: 'object',
                      properties: {
                        value: { type: 'boolean' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 }
                      },
                      required: ['value', 'confidence']
                    },
                    processing_level: {
                      type: 'object',
                      properties: {
                        value: { type: 'number', enum: [1, 2, 3, 4] },
                        confidence: { type: 'number', minimum: 0, maximum: 1 }
                      }
                    },
                    homemade: {
                      type: 'object',
                      properties: {
                        value: { type: 'boolean' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 }
                      },
                      required: ['value', 'confidence']
                    },
                    carbs_quality: {
                      type: 'object',
                      properties: {
                        value: { type: 'string', enum: ['refined', 'whole', 'mixed', 'unknown'] },
                        confidence: { type: 'number', minimum: 0, maximum: 1 }
                      }
                    }
                  },
                  required: ['veggies', 'junk', 'homemade']
                },
                ingredients: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 }
                    },
                    required: ['name', 'confidence']
                  }
                },
                meal_type: {
                  type: 'object',
                  properties: {
                    value: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'post_workout', 'other'] },
                    confidence: { type: 'number', minimum: 0, maximum: 1 }
                  },
                  required: ['value', 'confidence']
                },
                portion_size: {
                  type: 'object',
                  properties: {
                    value: { type: 'string', enum: ['small', 'medium', 'large'] },
                    confidence: { type: 'number', minimum: 0, maximum: 1 }
                  },
                  required: ['value', 'confidence']
                },
                dietary_flags: {
                  type: 'object',
                  properties: {
                    dairy: { type: 'boolean' },
                    gluten: { type: 'boolean' },
                    nuts: { type: 'boolean' },
                    vegan_friendly: { type: 'boolean' }
                  }
                },
                overall_confidence: { type: 'number', minimum: 0, maximum: 1 },
                notes: { type: 'string', maxLength: 100 }
              },
              required: ['nutrition', 'categories', 'ingredients', 'meal_type', 'portion_size', 'overall_confidence']
            }
          }
        ],
        function_call: { name: 'analyze_meal' },
        temperature: 0.1,
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || !functionCall.arguments) {
        throw new Error('No function call returned from OpenAI');
      }

      // Parse and validate the OpenAI response
      const rawAnalysis = JSON.parse(functionCall.arguments);
      const validatedAnalysis = mealAnalysisSchema.parse(rawAnalysis);
      
      // Add metadata
      const result: MealAnalysis = {
        ...validatedAnalysis,
        estimation_source: 'openai',
        model_version: AIMealAnalyzer.MODEL_VERSION,
        classification_version: AIMealAnalyzer.CLASSIFICATION_VERSION,
      };

      logger.info('[AIMealAnalyzer] Meal analyzed successfully', {
        mealText,
        overallConfidence: result.overall_confidence,
        ingredientCount: result.ingredients.length,
      });

      return result;

    } catch (error) {
      if (error instanceof ZodError) {
        logger.error('[AIMealAnalyzer] OpenAI response validation failed', { 
          error: error.message, 
          mealText,
          validationErrors: error.errors 
        });
      } else {
        logger.error('[AIMealAnalyzer] Failed to analyze meal', { error, mealText });
      }
      return null;
    }
  }

  private buildAnalysisPrompt(mealText: string, timeOfDay: string): string {
    return `Analyze this meal: "${mealText}"

Context: This meal was consumed during ${timeOfDay}.

Instructions:
- For nutrition values (calories, protein, carbs, fat, fiber): If you're not confident about the values, return null instead of guessing
- Use realistic ranges based on typical portion sizes
- Consider the time of day for meal_type inference
- NOVA processing levels: 1=unprocessed, 2=processed culinary, 3=processed foods, 4=ultra-processed
- Be conservative with confidence scores - only use >0.8 when very certain
- Ingredients should be the main food components you can identify
- Notes should be brief observations about the meal (max 20 words)

Analyze and return structured data.`;
  }



  private getTimeOfDay(timestamp: Date): string {
    const hour = timestamp.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'late night';
  }


} 