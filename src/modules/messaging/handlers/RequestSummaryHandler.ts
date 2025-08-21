/**
 * Handler for requesting daily/weekly summaries
 */
import { DailySummaryService } from '../../reports/DailySummaryService';
import { requestSummarySchema } from '../../../ai/schemas';
import { type RequestSummaryArgs, type Tone } from '../../../types';
import { logger } from '../../../lib/logger';
import { BaseMessageHandler } from './BaseMessageHandler';

export class RequestSummaryHandler extends BaseMessageHandler {
  constructor(private summaryService: DailySummaryService) {
    super();
  }

  getToolName(): string {
    return 'request_summary';
  }

  async handle(args: any, userId: string, _messageTimestamp: Date, user: any): Promise<{ text: string; type: string }> {
    try {
      const validArgs = requestSummarySchema.parse(args) as RequestSummaryArgs;
      const summaryDate = validArgs.date ? new Date(validArgs.date) : new Date();
      
      if (validArgs.period === 'daily') {
        const summary = await this.summaryService.composeDailySummary(userId, summaryDate);
        const tone = (user.preferences?.tone as Tone) || 'friendly';
        const responseText = this.summaryService.formatSummaryText(summary, tone);
        
        return {
          text: responseText,
          type: 'summary'
        };
      } else {
        // Weekly summary placeholder
        return {
          text: 'Weekly summaries coming soon! For now, try asking for your daily report.',
          type: 'summary'
        };
      }
    } catch (error) {
      logger.error('[RequestSummaryHandler] Invalid summary args', { error, args });
      return {
        text: 'Sorry, I couldn\'t generate that summary. Please try again.',
        type: 'error'
      };
    }
  }
} 