/**
 * Debug routes for development and testing
 */
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReportScheduler } from '../modules/reports/ReportScheduler';
import { logger } from '../lib/logger';
import { config } from '../config';

export function createDebugRouter(
  prisma: PrismaClient,
  reportScheduler: ReportScheduler
): Router {
  const router = Router();

  // Only enable debug routes in development
  if (config.nodeEnv !== 'development') {
    return router;
  }

  /**
   * Manually trigger daily report for a user
   */
  router.post('/run-daily-report', async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.body as { userId?: string };
      
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      logger.info('Manual daily report trigger requested', { userId });
      
      const success = await reportScheduler.triggerDailyReport(userId);
      
      if (success) {
        res.json({ 
          status: 'success', 
          message: 'Daily report sent successfully',
          userId 
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to send daily report',
          userId 
        });
      }
    } catch (error) {
      logger.error('Error in manual daily report trigger', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Get user information
   */
  router.get('/user/:phone', async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { phone },
        include: { 
          preferences: true,
          meals: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      logger.error('Error getting user info', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Get meal statistics for a user
   */
  router.get('/stats/:userId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { days = '7' } = req.query as { days?: string };
      
      const daysNum = parseInt(days, 10);
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - daysNum);

      const meals = await prisma.meal.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate basic stats
      const totalMeals = meals.length;
      const lateMeals = meals.filter(meal => {
        const tags = JSON.parse(meal.tags);
        return tags.timeOfDay === 'late';
      }).length;

      const veggieCount = meals.filter(meal => {
        const tags = JSON.parse(meal.tags);
        return tags.veggies === true;
      }).length;

      const proteinCount = meals.filter(meal => {
        const tags = JSON.parse(meal.tags);
        return tags.protein === true;
      }).length;

      const junkCount = meals.filter(meal => {
        const tags = JSON.parse(meal.tags);
        return tags.junk === true;
      }).length;

      res.json({
        period: { startDate, endDate, days: daysNum },
        stats: {
          totalMeals,
          lateMeals,
          veggieRatio: totalMeals > 0 ? veggieCount / totalMeals : 0,
          proteinRatio: totalMeals > 0 ? proteinCount / totalMeals : 0,
          junkRatio: totalMeals > 0 ? junkCount / totalMeals : 0,
        },
        recentMeals: meals.slice(0, 10),
      });
    } catch (error) {
      logger.error('Error getting user stats', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
} 