"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for MealTagger
 */
const MealTagger_1 = require("../../src/modules/meals/MealTagger");
describe('MealTagger', () => {
    let tagger;
    beforeEach(() => {
        tagger = new MealTagger_1.MealTagger();
    });
    describe('tagMealFromText', () => {
        test('should detect protein in meals', () => {
            const tags1 = tagger.tagMealFromText('grilled chicken breast');
            expect(tags1.protein).toBe(true);
            const tags2 = tagger.tagMealFromText('scrambled eggs with toast');
            expect(tags2.protein).toBe(true);
            const tags3 = tagger.tagMealFromText('salmon with vegetables');
            expect(tags3.protein).toBe(true);
            const tags4 = tagger.tagMealFromText('greek yogurt with berries');
            expect(tags4.protein).toBe(true);
        });
        test('should detect vegetables in meals', () => {
            const tags1 = tagger.tagMealFromText('mixed green salad');
            expect(tags1.veggies).toBe(true);
            const tags2 = tagger.tagMealFromText('chicken with broccoli');
            expect(tags2.veggies).toBe(true);
            const tags3 = tagger.tagMealFromText('tomato and cucumber');
            expect(tags3.veggies).toBe(true);
            const tags4 = tagger.tagMealFromText('stir-fried vegetables');
            expect(tags4.veggies).toBe(true);
        });
        test('should categorize carbs correctly', () => {
            // High carbs
            const highCarbTags1 = tagger.tagMealFromText('pasta with marinara sauce');
            expect(highCarbTags1.carbs).toBe('high');
            const highCarbTags2 = tagger.tagMealFromText('pizza margherita');
            expect(highCarbTags2.carbs).toBe('high');
            const highCarbTags3 = tagger.tagMealFromText('rice and beans');
            expect(highCarbTags3.carbs).toBe('high');
            // Medium carbs
            const mediumCarbTags1 = tagger.tagMealFromText('quinoa bowl');
            expect(mediumCarbTags1.carbs).toBe('medium');
            const mediumCarbTags2 = tagger.tagMealFromText('oatmeal with fruit');
            expect(mediumCarbTags2.carbs).toBe('medium');
            // Low carbs
            const lowCarbTags1 = tagger.tagMealFromText('grilled chicken with salad');
            expect(lowCarbTags1.carbs).toBe('low');
            const lowCarbTags2 = tagger.tagMealFromText('cheese and nuts');
            expect(lowCarbTags2.carbs).toBe('low');
        });
        test('should detect junk food', () => {
            const tags1 = tagger.tagMealFromText('pizza and coke');
            expect(tags1.junk).toBe(true);
            const tags2 = tagger.tagMealFromText('burger and fries');
            expect(tags2.junk).toBe(true);
            const tags3 = tagger.tagMealFromText('chocolate cake');
            expect(tags3.junk).toBe(true);
            const tags4 = tagger.tagMealFromText('mcdonalds big mac');
            expect(tags4.junk).toBe(true);
            const tags5 = tagger.tagMealFromText('energy drink');
            expect(tags5.junk).toBe(true);
        });
        test('should not flag healthy foods as junk', () => {
            const tags1 = tagger.tagMealFromText('grilled chicken with vegetables');
            expect(tags1.junk).toBe(false);
            const tags2 = tagger.tagMealFromText('quinoa salad');
            expect(tags2.junk).toBe(false);
            const tags3 = tagger.tagMealFromText('greek yogurt with berries');
            expect(tags3.junk).toBe(false);
        });
        test('should determine time of day based on timestamp', () => {
            // Morning (7 AM)
            const morningTime = new Date();
            morningTime.setHours(7, 0, 0, 0);
            const morningTags = tagger.tagMealFromText('breakfast', morningTime);
            expect(morningTags.timeOfDay).toBe('morning');
            // Noon (1 PM)
            const noonTime = new Date();
            noonTime.setHours(13, 0, 0, 0);
            const noonTags = tagger.tagMealFromText('lunch', noonTime);
            expect(noonTags.timeOfDay).toBe('noon');
            // Evening (7 PM)
            const eveningTime = new Date();
            eveningTime.setHours(19, 0, 0, 0);
            const eveningTags = tagger.tagMealFromText('dinner', eveningTime);
            expect(eveningTags.timeOfDay).toBe('evening');
            // Late (11 PM)
            const lateTime = new Date();
            lateTime.setHours(23, 0, 0, 0);
            const lateTags = tagger.tagMealFromText('snack', lateTime);
            expect(lateTags.timeOfDay).toBe('late');
        });
        test('should handle complex meals with multiple components', () => {
            const tags = tagger.tagMealFromText('grilled salmon with quinoa and steamed broccoli');
            expect(tags.protein).toBe(true); // salmon
            expect(tags.veggies).toBe(true); // broccoli
            expect(tags.carbs).toBe('medium'); // quinoa
            expect(tags.junk).toBe(false);
        });
        test('should handle case-insensitive input', () => {
            const tags1 = tagger.tagMealFromText('GRILLED CHICKEN');
            expect(tags1.protein).toBe(true);
            const tags2 = tagger.tagMealFromText('Mixed Green SALAD');
            expect(tags2.veggies).toBe(true);
            const tags3 = tagger.tagMealFromText('PIZZA');
            expect(tags3.junk).toBe(true);
        });
    });
});
//# sourceMappingURL=MealTagger.test.js.map