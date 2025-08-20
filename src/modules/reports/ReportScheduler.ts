/**
 * Report scheduler for managing daily report cron jobs
 */
import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { DailySummaryService } from './DailySummaryService';
import { UserService } from '../users/UserService';
import { UserRepository } from '../users/UserRepository';
import { WhatsAppProvider } from '../../lib/provider/WhatsAppProvider';
import { logger } from '../../lib/logger';
import { parseTimeString } from '../../utils/time';

export class ReportScheduler {
  private dailySummaryService: DailySummaryService;
  private userService: UserService;
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    private prisma: PrismaClient,
    whatsAppProvider: WhatsAppProvider
  ) {
    this.dailySummaryService = new DailySummaryService(prisma, whatsAppProvider);
    this.userService = new UserService(new UserRepository(prisma));
  }

  /**
   * Start the report scheduler
   */
  async start(): Promise<void> {
    try {
      // Schedule a job that runs every minute to check for reports to send
      const task = cron.schedule('* * * * *', async () => {
        await this.checkAndSendReports();
      }, {
        scheduled: false,
        timezone: 'Asia/Jerusalem', // Adjust timezone as needed
      });

      task.start();
      this.scheduledJobs.set('main', task);

      logger.info('Report scheduler started');
    } catch (error) {
      logger.error('Failed to start report scheduler', { error });
      throw error;
    }
  }

  /**
   * Stop the report scheduler
   */
  stop(): void {
    this.scheduledJobs.forEach((task, name) => {
      task.stop();
      logger.info('Stopped scheduled task', { name });
    });
    this.scheduledJobs.clear();
    logger.info('Report scheduler stopped');
  }

  /**
   * Check if any users need daily reports sent now
   */
  private async checkAndSendReports(): Promise<void> {
    try {
      const users = await this.userService.getAllUsersForReports();
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      for (const user of users) {
        if (!user.preferences) continue;

        try {
          const { hour, minute } = parseTimeString(user.preferences.reportTime);
          
          // Check if it's time to send the report (within the current minute)
          if (hour === currentHour && minute === currentMinute) {
            // Check if we already sent a report today
            const today = now.toISOString().split('T')[0];
            const alreadySent = await this.wasReportSentToday(user.id, today);
            
            if (!alreadySent) {
              await this.dailySummaryService.sendDailySummary(user, now);
            }
          }
        } catch (error) {
          logger.error('Error processing user report', {
            userId: user.id,
            phone: user.phone,
            error,
          });
        }
      }
    } catch (error) {
      logger.error('Error in checkAndSendReports', { error });
    }
  }

  /**
   * Check if a daily report was already sent to a user today
   */
  private async wasReportSentToday(userId: string, date: string): Promise<boolean> {
    try {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);

      const existingReport = await this.prisma.messageLog.findFirst({
        where: {
          userId,
          direction: 'OUT',
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          payload: {
            contains: '"type":"daily_summary"',
          },
        },
      });

      return !!existingReport;
    } catch (error) {
      logger.error('Error checking if report was sent today', {
        userId,
        date,
        error,
      });
      return false;
    }
  }

  /**
   * Manually trigger daily report for a user (for testing)
   */
  async triggerDailyReport(userId: string): Promise<boolean> {
    try {
      const user = await this.userService.getUserById(userId);
      if (!user) {
        logger.warn('User not found for manual report trigger', { userId });
        return false;
      }

      return await this.dailySummaryService.sendDailySummary(user);
    } catch (error) {
      logger.error('Failed to trigger daily report manually', {
        userId,
        error,
      });
      return false;
    }
  }
} 