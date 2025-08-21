/**
 * Unit tests for MealService
 */
import { MealService } from '../../src/modules/meals/MealService';
import { MealAnalysis } from '../../src/types/meal';
import { testPrisma } from '../setup';

// Mock the AIMealAnalyzer
jest.mock('../../src/modules/meals/AIMealAnalyzer', () => ({
  AIMealAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeMeal: jest.fn().mockResolvedValue({
      nutrition: {
        calories: { min: 300, max: 400, confidence: 0.8 },
        protein_g: { min: 25, max: 35, confidence: 0.9 },
        carbs_g: { min: 15, max: 25, confidence: 0.7 },
        fat_g: { min: 10, max: 15, confidence: 0.6 },
        fiber_g: null,
      },
      categories: {
        veggies: { value: true, confidence: 0.9 },
        junk: { value: false, confidence: 0.8 },
        homemade: { value: true, confidence: 0.7 },
      },
      ingredients: [
        { name: 'chicken breast', confidence: 0.9 },
        { name: 'mixed vegetables', confidence: 0.8 },
      ],
      meal_type: { value: 'lunch', confidence: 0.8 },
      portion_size: { value: 'medium', confidence: 0.7 },
      overall_confidence: 0.8,
      estimation_source: 'openai' as const,
      classification_version: 1,
    } as MealAnalysis),
  })),
}));

describe('MealService', () => {
  let mealService: MealService;

  beforeEach(() => {
    mealService = new MealService(testPrisma);
  });

  describe('generateMealHint', () => {
    test('should return hardcoded message', () => {
      const mockUser = {
        id: 'user-1',
        phone: '+1234567890',
        language: 'he',
        createdAt: new Date(),
        storeMedia: false,
        preferences: {
          id: 'pref-1',
          userId: 'user-1',
          goal: 'fat_loss',
          tone: 'friendly',
          reportTime: '18:00',
          reportFormat: 'text',
          focus: '["protein", "veggies"]',
          thresholds: '{}',
          dietaryRestrictions: null,
          storeMedia: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockAnalysis: MealAnalysis = {
        nutrition: {
          calories: { min: 300, max: 400, confidence: 0.8 },
          protein_g: { min: 25, max: 35, confidence: 0.9 },
          carbs_g: { min: 15, max: 25, confidence: 0.7 },
          fat_g: { min: 10, max: 15, confidence: 0.6 },
          fiber_g: null,
        },
        categories: {
          veggies: { value: true, confidence: 0.9 },
          junk: { value: false, confidence: 0.8 },
          homemade: { value: true, confidence: 0.7 },
        },
        ingredients: [{ name: 'chicken salad', confidence: 0.8 }],
        meal_type: { value: 'lunch', confidence: 0.8 },
        portion_size: { value: 'medium', confidence: 0.7 },
        overall_confidence: 0.8,
        estimation_source: 'openai',
        classification_version: 1,
      };

      const result = mealService.generateMealHint(mockUser, mockAnalysis);
      expect(result).toBe('Meal logged!');
    });

    test('should return hardcoded message even with no preferences', () => {
      const mockUser = {
        id: 'user-1',
        phone: '+1234567890',
        language: 'he',
        createdAt: new Date(),
        storeMedia: false,
        preferences: null,
      };

      const mockAnalysis: MealAnalysis = {
        nutrition: {
          calories: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          fiber_g: null,
        },
        categories: {
          veggies: { value: false, confidence: 0.3 },
          junk: { value: true, confidence: 0.9 },
          homemade: { value: false, confidence: 0.8 },
        },
        ingredients: [{ name: 'junk food', confidence: 0.5 }],
        meal_type: { value: 'snack', confidence: 0.6 },
        portion_size: { value: 'small', confidence: 0.4 },
        overall_confidence: 0.5,
        estimation_source: 'openai',
        classification_version: 1,
      };

      const result = mealService.generateMealHint(mockUser, mockAnalysis);
      expect(result).toBe('Meal logged!');
    });
  });

  describe('createMeal', () => {
    test('should create meal with tags', async () => {
      // First create a user
      const user = await testPrisma.user.create({
        data: {
          phone: '+1234567890',
          language: 'he',
          storeMedia: false,
        },
      });

      const result = await mealService.createMeal(
        user.id,
        'grilled chicken with vegetables',
        'TEXT',
        new Date()
      );

      expect(result.meal).toBeDefined();
      expect(result.meal.rawText).toBe('grilled chicken with vegetables');
      expect(result.analysis).toBeDefined();
      expect(result.analysis!.categories.veggies.value).toBe(true);
      expect(result.analysis!.overall_confidence).toBe(0.8);
    });

    it('should create meal even when AI analysis fails', async () => {
      // Create test user
      const testUser = await testPrisma.user.create({
        data: {
          phone: '+1234567891',
          language: 'en',
          storeMedia: false,
        },
      });

      // Mock analyzer to return null (analysis failed)
      const mockAnalyzer = {
        analyzeMeal: jest.fn().mockResolvedValue(null),
      };
      (mealService as any).analyzer = mockAnalyzer;

      const result = await mealService.createMeal(
        testUser.id,
        'some meal text',
        'TEXT',
        new Date()
      );

      expect(result.meal).toBeDefined();
      expect(result.meal.rawText).toBe('some meal text');
      expect(result.meal.tags).toBe('{}'); // Empty tags when analysis fails
      expect(result.analysis).toBeNull();
    });


  });
}); 