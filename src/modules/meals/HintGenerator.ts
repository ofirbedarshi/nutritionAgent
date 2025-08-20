/**
 * Hint generator - creates personalized meal feedback based on user goals and meal tags
 */
import { MealTags } from './MealTagger';
import { getCurrentHour } from '../../utils/time';

export interface HintContext {
  goal: 'fat_loss' | 'muscle_gain' | 'maintenance' | 'general';
  tone: 'friendly' | 'clinical' | 'funny';
  focus: string[];
  tags: MealTags;
  timeOfDay?: 'morning' | 'noon' | 'evening' | 'late';
}

export class HintGenerator {
  /**
   * Generate a personalized hint based on user context and meal tags
   */
  generateHint(context: HintContext): string {
    const { goal, tone, focus, tags } = context;
    const currentHour = getCurrentHour();
    const isLate = currentHour >= 21;

    // Handle junk food
    if (tags.junk) {
      return this.generateJunkHint(goal, tone, isLate);
    }

    // Handle late meals
    if (isLate && tags.timeOfDay === 'late') {
      return this.generateLateHint(goal, tone);
    }

    // Generate positive hints based on goal
    const hints = this.generateGoalBasedHints(goal, tone, tags, focus);
    
    if (hints.length === 0) {
      return this.generateGenericHint(tone, tags);
    }

    // Return first matching hint
    return hints[0];
  }

  private generateJunkHint(goal: string, tone: string, isLate: boolean): string {
    const junkHints = {
      friendly: {
        fat_loss: isLate ? "Late night treats can slow progress. Try herbal tea next time! 🌙" : "Treat yourself occasionally, but balance with veggies tomorrow! 🥗",
        muscle_gain: "Junk food won't fuel your gains. Add some protein next time! 💪",
        maintenance: "Balance is key - make your next meal nutrient-dense! ⚖️",
        general: "We all slip sometimes. Tomorrow's a fresh start! 🌟"
      },
      clinical: {
        fat_loss: "High-calorie processed foods impede weight loss goals.",
        muscle_gain: "Processed foods lack essential nutrients for muscle synthesis.",
        maintenance: "Maintain balance by compensating with nutrient-dense foods.",
        general: "Consider healthier alternatives for better nutritional outcomes."
      },
      funny: {
        fat_loss: isLate ? "Your metabolism went to bed already! 😴" : "That pizza won't chase itself off your hips! 🍕➡️🏃‍♀️",
        muscle_gain: "Muscles grow on protein, not pizza! 🍕❌💪",
        maintenance: "Balance is like a seesaw - tip it back with veggies! ⚖️🥬",
        general: "Your body called - it wants real food! 📞🥗"
      }
    };

    return junkHints[tone as keyof typeof junkHints][goal as keyof typeof junkHints.friendly] || 
           junkHints[tone as keyof typeof junkHints].general;
  }

  private generateLateHint(_goal: string, tone: string): string {
    const lateHints = {
      friendly: "Late meals can affect sleep. Try lighter options after 9 PM! 🌙",
      clinical: "Late eating may disrupt circadian rhythm and metabolism.",
      funny: "Your digestive system wants to clock out too! ⏰😴"
    };

    return lateHints[tone as keyof typeof lateHints];
  }

  private generateGoalBasedHints(
    goal: string, 
    tone: string, 
    tags: MealTags, 
    focus: string[]
  ): string[] {
    const hints: string[] = [];

    // Fat loss specific hints
    if (goal === 'fat_loss') {
      if (tags.protein && tags.veggies && tags.carbs === 'low') {
        hints.push(this.formatHint(tone, "Perfect fat loss combo! Protein + veggies = success! ✨", "Optimal macronutrient profile for fat loss.", "Nailed it! Fat doesn't stand a chance! 🔥"));
      }
      if (tags.carbs === 'high' && !tags.junk) {
        hints.push(this.formatHint(tone, "High carbs - balance with extra activity today! 🏃‍♀️", "Consider reducing carbohydrate portion sizes.", "Carb loading? Time to earn those carbs! 💪"));
      }
    }

    // Muscle gain specific hints
    if (goal === 'muscle_gain') {
      if (tags.protein && tags.carbs !== 'low') {
        hints.push(this.formatHint(tone, "Great protein choice! Your muscles will thank you! 💪", "Adequate protein supports muscle protein synthesis.", "Gains incoming! 🚀💪"));
      }
      if (!tags.protein) {
        hints.push(this.formatHint(tone, "Add some protein to fuel those gains! 🥩", "Insufficient protein may limit muscle development.", "Where's the protein? Muscles need building blocks! 🧱"));
      }
    }

    // Focus area hints
    if (focus.includes('protein') && !tags.protein) {
      hints.push(this.formatHint(tone, "Don't forget your protein goal! 🥩", "Protein intake below target focus area.", "Protein called - it feels left out! 📞"));
    }

    if (focus.includes('veggies') && tags.veggies) {
      hints.push(this.formatHint(tone, "Love the veggies! Keep it up! 🥬", "Excellent vegetable inclusion.", "Veggie victory! 🏆🥗"));
    }

    return hints;
  }

  private generateGenericHint(tone: string, tags: MealTags): string {
    if (tags.protein && tags.veggies) {
      return this.formatHint(tone, "Balanced meal! Great job! 👍", "Well-balanced nutritional profile.", "Balance achieved! You're a nutrition ninja! 🥷");
    }

    if (tags.veggies) {
      return this.formatHint(tone, "Good veggie choice! 🥗", "Adequate vegetable intake noted.", "Veggie power activated! 🦸‍♀️🥬");
    }

    return this.formatHint(tone, "Meal logged! Stay consistent! 📝", "Meal recorded successfully.", "Another meal in the books! 📚");
  }

  private formatHint(tone: string, friendly: string, clinical: string, funny: string): string {
    switch (tone) {
      case 'clinical': return clinical;
      case 'funny': return funny;
      default: return friendly;
    }
  }
} 