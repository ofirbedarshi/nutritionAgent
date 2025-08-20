/**
 * Coach service for general nutrition advice and Q&A
 */

import { logger } from '../../lib/logger';

/**
 * Provides general nutrition coaching advice
 */
export class CoachService {
  /**
   * Generate a short nutrition tip or answer based on the question
   */
  static generateAdvice(question: string): string {
    logger.info('Generating coaching advice', { question });

    // Simple rule-based advice for common questions
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('breakfast')) {
      return 'Start with protein and fiber! Try eggs with veggies or Greek yogurt with berries. 🍳';
    }
    
    if (lowerQuestion.includes('snack')) {
      return 'Great snack options: nuts, fruit, or veggie sticks with hummus. Keep it balanced! 🥜';
    }
    
    if (lowerQuestion.includes('water') || lowerQuestion.includes('hydration')) {
      return 'Aim for 8 glasses daily! Add lemon or mint for flavor. Stay hydrated! 💧';
    }
    
    if (lowerQuestion.includes('exercise') || lowerQuestion.includes('workout')) {
      return 'Fuel your workouts with protein and carbs. Post-workout protein helps recovery! 💪';
    }
    
    if (lowerQuestion.includes('weight') || lowerQuestion.includes('lose')) {
      return 'Focus on whole foods, portion control, and consistency. Small changes add up! 📈';
    }
    
    if (lowerQuestion.includes('muscle') || lowerQuestion.includes('gain')) {
      return 'Prioritize protein with each meal and strength training. Consistency is key! 🏋️';
    }
    
    // Default encouraging response
    return 'Great question! Focus on whole foods, balanced meals, and listen to your body. You\'ve got this! 🌟';
  }
} 