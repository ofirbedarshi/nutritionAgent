/**
 * Unit tests for HintGenerator
 */
import { HintGenerator, HintContext } from '../../src/modules/meals/HintGenerator';
import { MealTags } from '../../src/modules/meals/MealTagger';

// Mock the time utility to make tests deterministic
jest.mock('../../src/utils/time', () => ({
  getCurrentHour: jest.fn(() => 14), // Mock to 2 PM (not late)
  formatTimeString: jest.fn(),
  parseTimeString: jest.fn(),
  formatDateForQuery: jest.fn(),
}));

describe('HintGenerator', () => {
  let generator: HintGenerator;

  beforeEach(() => {
    generator = new HintGenerator();
  });

  describe('generateHint', () => {
    test('should generate junk food hints for different goals and tones', () => {
      const junkTags: MealTags = {
        protein: false,
        veggies: false,
        carbs: 'high',
        junk: true,
        timeOfDay: 'evening',
      };

      // Fat loss + friendly
      const fatLossContext: HintContext = {
        goal: 'fat_loss',
        tone: 'friendly',
        focus: [],
        tags: junkTags,
      };
      const fatLossHint = generator.generateHint(fatLossContext);
      expect(fatLossHint).toContain('balance');

      // Muscle gain + clinical
      const muscleGainContext: HintContext = {
        goal: 'muscle_gain',
        tone: 'clinical',
        focus: [],
        tags: junkTags,
      };
      const muscleGainHint = generator.generateHint(muscleGainContext);
      expect(muscleGainHint).toContain('Processed foods');

      // General + funny
      const generalContext: HintContext = {
        goal: 'general',
        tone: 'funny',
        focus: [],
        tags: junkTags,
      };
      const generalHint = generator.generateHint(generalContext);
      expect(generalHint).toContain('body called');
    });

    test('should generate fat loss specific hints', () => {
      const perfectFatLossTags: MealTags = {
        protein: true,
        veggies: true,
        carbs: 'low',
        junk: false,
        timeOfDay: 'noon',
      };

      const context: HintContext = {
        goal: 'fat_loss',
        tone: 'friendly',
        focus: [],
        tags: perfectFatLossTags,
      };

      const hint = generator.generateHint(context);
      expect(hint).toContain('Perfect fat loss combo');
    });

    test('should generate muscle gain specific hints', () => {
      const proteinTags: MealTags = {
        protein: true,
        veggies: false,
        carbs: 'medium',
        junk: false,
        timeOfDay: 'noon',
      };

      const context: HintContext = {
        goal: 'muscle_gain',
        tone: 'friendly',
        focus: [],
        tags: proteinTags,
      };

      const hint = generator.generateHint(context);
      expect(hint).toContain('protein');
      expect(hint).toContain('muscles');
    });

    test('should generate hints based on focus areas', () => {
      const noProteinTags: MealTags = {
        protein: false,
        veggies: true,
        carbs: 'medium',
        junk: false,
        timeOfDay: 'noon',
      };

      const context: HintContext = {
        goal: 'general',
        tone: 'friendly',
        focus: ['protein'],
        tags: noProteinTags,
      };

      const hint = generator.generateHint(context);
      expect(hint).toContain('protein goal');
    });

    test('should generate positive hints for good veggie choices', () => {
      const veggieTags: MealTags = {
        protein: false,
        veggies: true,
        carbs: 'low',
        junk: false,
        timeOfDay: 'noon',
      };

      const context: HintContext = {
        goal: 'general',
        tone: 'friendly',
        focus: ['veggies'],
        tags: veggieTags,
      };

      const hint = generator.generateHint(context);
      expect(hint).toContain('veggies');
    });

    test('should generate different tones correctly', () => {
      const balancedTags: MealTags = {
        protein: true,
        veggies: true,
        carbs: 'medium',
        junk: false,
        timeOfDay: 'noon',
      };

      // Friendly tone
      const friendlyContext: HintContext = {
        goal: 'general',
        tone: 'friendly',
        focus: [],
        tags: balancedTags,
      };
      const friendlyHint = generator.generateHint(friendlyContext);
      expect(friendlyHint).toContain('👍');

      // Clinical tone
      const clinicalContext: HintContext = {
        goal: 'general',
        tone: 'clinical',
        focus: [],
        tags: balancedTags,
      };
      const clinicalHint = generator.generateHint(clinicalContext);
      expect(clinicalHint).toContain('nutritional profile');

      // Funny tone
      const funnyContext: HintContext = {
        goal: 'general',
        tone: 'funny',
        focus: [],
        tags: balancedTags,
      };
      const funnyHint = generator.generateHint(funnyContext);
      expect(funnyHint).toContain('ninja');
    });

    test('should generate generic hints when no specific rules match', () => {
      const basicTags: MealTags = {
        protein: false,
        veggies: false,
        carbs: 'medium',
        junk: false,
        timeOfDay: 'noon',
      };

      const context: HintContext = {
        goal: 'maintenance',
        tone: 'friendly',
        focus: [],
        tags: basicTags,
      };

      const hint = generator.generateHint(context);
      expect(hint).toContain('logged');
    });

    test('should handle high carb warnings for fat loss', () => {
      const highCarbTags: MealTags = {
        protein: false,
        veggies: false,
        carbs: 'high',
        junk: false,
        timeOfDay: 'noon',
      };

      const context: HintContext = {
        goal: 'fat_loss',
        tone: 'friendly',
        focus: [],
        tags: highCarbTags,
      };

      const hint = generator.generateHint(context);
      expect(hint).toContain('High carbs');
    });

    test('should warn about missing protein for muscle gain', () => {
      const noProteinTags: MealTags = {
        protein: false,
        veggies: true,
        carbs: 'medium',
        junk: false,
        timeOfDay: 'noon',
      };

      const context: HintContext = {
        goal: 'muscle_gain',
        tone: 'friendly',
        focus: [],
        tags: noProteinTags,
      };

      const hint = generator.generateHint(context);
      expect(hint).toContain('Add some protein');
    });
  });
}); 