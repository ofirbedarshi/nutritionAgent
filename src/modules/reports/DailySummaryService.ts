/**
 * Daily summary service for generating and sending daily reports
 */
import { PrismaClient } from '@prisma/client';
import { MealService } from '../meals/MealService';
import { UserWithPreferences } from '../users/UserRepository';
import { WhatsAppProvider } from '../../lib/provider/WhatsAppProvider';
import { logger } from '../../lib/logger';
import { getDayBounds } from '../../utils/time';

export interface DailySummary {
  date: string;
  mealsCount: number;
  lateMeals: number;
  veggiesRatio: number;
  proteinRatio: number;
  junkRatio: number;
  suggestions: string[];
}

export class DailySummaryService {
  private mealService: MealService;

  constructor(
    private prisma: PrismaClient,
    private whatsAppProvider: WhatsAppProvider
  ) {
    this.mealService = new MealService(prisma);
  }

  /**
   * Compose daily summary for a user
   */
  async composeDailySummary(userId: string, date = new Date()): Promise<DailySummary> {
    try {
      const { start, end } = getDayBounds(date);
      const stats = await this.mealService.getMealStats(userId, start, end);

      const summary: DailySummary = {
        date: date.toISOString().split('T')[0],
        mealsCount: stats.totalMeals,
        lateMeals: stats.lateMeals,
        veggiesRatio: stats.veggieRatio,
        proteinRatio: stats.proteinRatio,
        junkRatio: stats.junkRatio,
        suggestions: this.generateSuggestions(stats),
      };

      logger.info('Daily summary composed', {
        userId,
        date: summary.date,
        stats,
      });

      return summary;
    } catch (error) {
      logger.error('Failed to compose daily summary', {
        userId,
        date,
        error,
      });
      throw error;
    }
  }

  /**
   * Generate suggestions based on meal statistics
   */
  private generateSuggestions(stats: {
    totalMeals: number;
    lateMeals: number;
    veggieRatio: number;
    proteinRatio: number;
    junkRatio: number;
  }): string[] {
    const suggestions: string[] = [];

    if (stats.totalMeals === 0) {
      suggestions.push('Remember to log your meals tomorrow!');
      return suggestions;
    }

    if (stats.lateMeals > 0) {
      suggestions.push('Try eating earlier - late meals can affect sleep quality');
    }

    if (stats.veggieRatio < 0.5) {
      suggestions.push('Add more vegetables to your meals for better nutrition');
    }

    if (stats.proteinRatio < 0.6) {
      suggestions.push('Include protein in more meals for better satiety');
    }

    if (stats.junkRatio > 0.3) {
      suggestions.push('Reduce processed foods - aim for whole foods instead');
    }

    if (suggestions.length === 0) {
      suggestions.push('Great job maintaining balanced nutrition today!');
    }

    return suggestions;
  }

  /**
   * Format daily summary as text message
   */
  formatSummaryText(summary: DailySummary, tone: 'friendly' | 'clinical' | 'funny'): string {
    const { mealsCount, lateMeals, veggiesRatio, suggestions } = summary;

    let message = '';

    // Header
    switch (tone) {
      case 'clinical':
        message += `📊 Daily Nutrition Report - ${summary.date}\n\n`;
        break;
      case 'funny':
        message += `🎭 Your Food Adventures Today!\n\n`;
        break;
      default:
        message += `🌟 Daily Summary - ${summary.date}\n\n`;
    }

    // Stats
    if (mealsCount === 0) {
      message += tone === 'funny' 
        ? 'Did you forget to eat? That\'s one way to fast! 😅'
        : 'No meals logged today.';
    } else {
      message += `Meals logged: ${mealsCount}\n`;
      
      if (lateMeals > 0) {
        message += `Late meals: ${lateMeals}\n`;
      }

      const veggiePercentage = Math.round(veggiesRatio * 100);
      message += `Veggie meals: ${veggiePercentage}%\n`;
    }

    // Suggestions
    if (suggestions.length > 0) {
      message += `\n💡 ${tone === 'clinical' ? 'Recommendations' : 'Tips'}:\n`;
      suggestions.forEach(suggestion => {
        message += `• ${suggestion}\n`;
      });
    }

    return message.trim();
  }

  /**
   * Send daily summary to a user
   */
  async sendDailySummary(user: UserWithPreferences, date = new Date()): Promise<boolean> {
    try {
      const summary = await this.composeDailySummary(user.id, date);
      
      const tone = user.preferences?.tone as 'friendly' | 'clinical' | 'funny' || 'friendly';
      const messageText = this.formatSummaryText(summary, tone);

      const result = await this.whatsAppProvider.sendText({
        to: user.phone,
        text: messageText,
      });

      if (result.success) {
        // Log the outgoing message
        await this.prisma.messageLog.create({
          data: {
            userId: user.id,
            direction: 'OUT',
            payload: JSON.stringify({
              type: 'daily_summary',
              text: messageText,
              summary,
            }),
          },
        });

        logger.info('Daily summary sent successfully', {
          userId: user.id,
          phone: user.phone,
          messageId: result.messageId,
        });

        return true;
      } else {
        logger.error('Failed to send daily summary', {
          userId: user.id,
          phone: user.phone,
          error: result.error,
        });

        return false;
      }
    } catch (error) {
      logger.error('Error sending daily summary', {
        userId: user.id,
        error,
      });
      return false;
    }
  }
} 