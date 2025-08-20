"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for HintGenerator
 */
const HintGenerator_1 = require("../../src/modules/meals/HintGenerator");
describe('HintGenerator', () => {
    let generator;
    beforeEach(() => {
        generator = new HintGenerator_1.HintGenerator();
    });
    describe('generateHint', () => {
        test('should generate junk food hints for different goals and tones', () => {
            const junkTags = {
                protein: false,
                veggies: false,
                carbs: 'high',
                junk: true,
                timeOfDay: 'evening',
            };
            // Fat loss + friendly
            const fatLossContext = {
                goal: 'fat_loss',
                tone: 'friendly',
                focus: [],
                tags: junkTags,
            };
            const fatLossHint = generator.generateHint(fatLossContext);
            expect(fatLossHint).toContain('balance');
            // Muscle gain + clinical
            const muscleGainContext = {
                goal: 'muscle_gain',
                tone: 'clinical',
                focus: [],
                tags: junkTags,
            };
            const muscleGainHint = generator.generateHint(muscleGainContext);
            expect(muscleGainHint).toContain('Processed foods');
            // General + funny
            const generalContext = {
                goal: 'general',
                tone: 'funny',
                focus: [],
                tags: junkTags,
            };
            const generalHint = generator.generateHint(generalContext);
            expect(generalHint).toContain('body called');
        });
        test('should generate fat loss specific hints', () => {
            const perfectFatLossTags = {
                protein: true,
                veggies: true,
                carbs: 'low',
                junk: false,
                timeOfDay: 'noon',
            };
            const context = {
                goal: 'fat_loss',
                tone: 'friendly',
                focus: [],
                tags: perfectFatLossTags,
            };
            const hint = generator.generateHint(context);
            expect(hint).toContain('Perfect fat loss combo');
        });
        test('should generate muscle gain specific hints', () => {
            const proteinTags = {
                protein: true,
                veggies: false,
                carbs: 'medium',
                junk: false,
                timeOfDay: 'noon',
            };
            const context = {
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
            const noProteinTags = {
                protein: false,
                veggies: true,
                carbs: 'medium',
                junk: false,
                timeOfDay: 'noon',
            };
            const context = {
                goal: 'general',
                tone: 'friendly',
                focus: ['protein'],
                tags: noProteinTags,
            };
            const hint = generator.generateHint(context);
            expect(hint).toContain('protein goal');
        });
        test('should generate positive hints for good veggie choices', () => {
            const veggieTags = {
                protein: false,
                veggies: true,
                carbs: 'low',
                junk: false,
                timeOfDay: 'noon',
            };
            const context = {
                goal: 'general',
                tone: 'friendly',
                focus: ['veggies'],
                tags: veggieTags,
            };
            const hint = generator.generateHint(context);
            expect(hint).toContain('veggies');
        });
        test('should generate different tones correctly', () => {
            const balancedTags = {
                protein: true,
                veggies: true,
                carbs: 'medium',
                junk: false,
                timeOfDay: 'noon',
            };
            // Friendly tone
            const friendlyContext = {
                goal: 'general',
                tone: 'friendly',
                focus: [],
                tags: balancedTags,
            };
            const friendlyHint = generator.generateHint(friendlyContext);
            expect(friendlyHint).toContain('👍');
            // Clinical tone
            const clinicalContext = {
                goal: 'general',
                tone: 'clinical',
                focus: [],
                tags: balancedTags,
            };
            const clinicalHint = generator.generateHint(clinicalContext);
            expect(clinicalHint).toContain('nutritional profile');
            // Funny tone
            const funnyContext = {
                goal: 'general',
                tone: 'funny',
                focus: [],
                tags: balancedTags,
            };
            const funnyHint = generator.generateHint(funnyContext);
            expect(funnyHint).toContain('ninja');
        });
        test('should generate generic hints when no specific rules match', () => {
            const basicTags = {
                protein: false,
                veggies: false,
                carbs: 'medium',
                junk: false,
                timeOfDay: 'noon',
            };
            const context = {
                goal: 'maintenance',
                tone: 'friendly',
                focus: [],
                tags: basicTags,
            };
            const hint = generator.generateHint(context);
            expect(hint).toContain('logged');
        });
        test('should handle high carb warnings for fat loss', () => {
            const highCarbTags = {
                protein: false,
                veggies: false,
                carbs: 'high',
                junk: false,
                timeOfDay: 'noon',
            };
            const context = {
                goal: 'fat_loss',
                tone: 'friendly',
                focus: [],
                tags: highCarbTags,
            };
            const hint = generator.generateHint(context);
            expect(hint).toContain('High carbs');
        });
        test('should warn about missing protein for muscle gain', () => {
            const noProteinTags = {
                protein: false,
                veggies: true,
                carbs: 'medium',
                junk: false,
                timeOfDay: 'noon',
            };
            const context = {
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
//# sourceMappingURL=HintGenerator.test.js.map