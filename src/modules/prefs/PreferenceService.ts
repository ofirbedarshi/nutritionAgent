/**
 * Preference service for managing user preferences
 */
import { PrismaClient, Preferences } from '@prisma/client';
import { PreferenceUpdate } from './PreferenceParser';
import { logger } from '../../lib/logger';

export class PreferenceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Apply preference updates to a user
   */
  async applyPreferences(userId: string, updates: PreferenceUpdate): Promise<Preferences> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.goal) {
        updateData.goal = updates.goal;
      }

      if (updates.reportTime) {
        updateData.reportTime = updates.reportTime;
      }

      if (updates.tone) {
        updateData.tone = updates.tone;
      }

      if (updates.focus) {
        updateData.focus = JSON.stringify(updates.focus);
      }

      if (updates.storeMedia !== undefined) {
        // Update user's storeMedia field
        await this.prisma.user.update({
          where: { id: userId },
          data: { storeMedia: updates.storeMedia },
        });
      }

      const updatedPreferences = await this.prisma.preferences.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          goal: updates.goal || 'general',
          tone: updates.tone || 'friendly',
          reportTime: updates.reportTime || '21:30',
          reportFormat: 'text',
          focus: JSON.stringify(updates.focus || []),
          thresholds: JSON.stringify({ lateHour: 21 }),
        },
      });

      logger.info('Preferences updated successfully', {
        userId,
        updates,
      });

      return updatedPreferences;
    } catch (error) {
      logger.error('Failed to apply preferences', {
        userId,
        updates,
        error,
      });
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<Preferences | null> {
    try {
      return await this.prisma.preferences.findUnique({
        where: { userId },
      });
    } catch (error) {
      logger.error('Failed to get user preferences', { userId, error });
      throw error;
    }
  }
} 