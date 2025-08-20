/**
 * Meal tagger - analyzes meal text and generates structured tags
 */
import { getTimeOfDay } from '../../utils/time';

export interface MealTags {
  protein: boolean;
  veggies: boolean;
  carbs: 'low' | 'medium' | 'high';
  junk: boolean;
  timeOfDay: 'morning' | 'noon' | 'evening' | 'late';
}

export class MealTagger {
  private proteinKeywords = [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'egg', 'eggs',
    'protein', 'meat', 'turkey', 'lamb', 'tofu', 'beans', 'lentils',
    'cheese', 'yogurt', 'milk', 'nuts', 'almonds', 'peanuts',
    'quinoa', 'cottage cheese', 'greek yogurt', 'protein shake'
  ];

  private veggieKeywords = [
    'salad', 'vegetables', 'veggies', 'broccoli', 'spinach', 'lettuce',
    'tomato', 'cucumber', 'carrot', 'peppers', 'onion', 'garlic',
    'mushroom', 'zucchini', 'eggplant', 'cabbage', 'kale', 'arugula',
    'avocado', 'asparagus', 'celery', 'radish', 'beets', 'green'
  ];

  private lowCarbKeywords = [
    'salad', 'vegetables', 'veggies', 'protein', 'meat', 'fish',
    'eggs', 'cheese', 'nuts', 'avocado', 'leafy greens'
  ];

  private mediumCarbKeywords = [
    'quinoa', 'sweet potato', 'fruit', 'apple', 'banana', 'berries',
    'oats', 'oatmeal', 'yogurt', 'milk', 'beans', 'lentils'
  ];

  private highCarbKeywords = [
    'bread', 'pasta', 'rice', 'pizza', 'sandwich', 'bagel', 'cereal',
    'pancakes', 'waffles', 'muffin', 'cake', 'cookies', 'potatoes',
    'fries', 'chips', 'crackers', 'noodles', 'spaghetti'
  ];

  private junkKeywords = [
    'pizza', 'burger', 'fries', 'chips', 'soda', 'coke', 'candy',
    'chocolate', 'ice cream', 'cookies', 'cake', 'donut', 'fast food',
    'mcdonalds', 'kfc', 'dominos', 'fried', 'deep fried', 'energy drink'
  ];

  /**
   * Tag a meal from text description
   */
  tagMealFromText(text: string, timestamp = new Date()): MealTags {
    const normalizedText = text.toLowerCase().trim();
    const words = normalizedText.split(/\s+/);

    return {
      protein: this.detectProtein(normalizedText, words),
      veggies: this.detectVeggies(normalizedText, words),
      carbs: this.detectCarbs(normalizedText, words),
      junk: this.detectJunk(normalizedText, words),
      timeOfDay: getTimeOfDay(timestamp.getHours()),
    };
  }

  private detectProtein(text: string, words: string[]): boolean {
    return this.proteinKeywords.some(keyword => 
      text.includes(keyword) || words.some(word => word === keyword)
    );
  }

  private detectVeggies(text: string, words: string[]): boolean {
    return this.veggieKeywords.some(keyword => 
      text.includes(keyword) || words.some(word => word === keyword)
    );
  }

  private detectCarbs(text: string, words: string[]): 'low' | 'medium' | 'high' {
    const hasHigh = this.highCarbKeywords.some(keyword => 
      text.includes(keyword) || words.some(word => word === keyword)
    );
    
    if (hasHigh) return 'high';

    const hasMedium = this.mediumCarbKeywords.some(keyword => 
      text.includes(keyword) || words.some(word => word === keyword)
    );
    
    if (hasMedium) return 'medium';

    const hasLow = this.lowCarbKeywords.some(keyword => 
      text.includes(keyword) || words.some(word => word === keyword)
    );
    
    return hasLow ? 'low' : 'medium'; // Default to medium if unclear
  }

  private detectJunk(text: string, words: string[]): boolean {
    return this.junkKeywords.some(keyword => 
      text.includes(keyword) || words.some(word => word === keyword)
    );
  }
} 