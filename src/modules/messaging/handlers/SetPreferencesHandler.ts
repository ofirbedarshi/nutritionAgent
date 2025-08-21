/**
 * Handler for setting user preferences
 */
import { PreferenceService } from '../../prefs/PreferenceService';
import { setPreferencesSchema } from '../../../ai/schemas';
import { type SetPreferencesArgs } from '../../../types';
import { logger } from '../../../lib/logger';
import { BaseMessageHandler } from './BaseMessageHandler';

export class SetPreferencesHandler extends BaseMessageHandler {
  constructor(private preferenceService: PreferenceService) {
    super();
  }

  getToolName(): string {
    return 'set_preferences';
  }

  async handle(args: any, userId: string): Promise<{ text: string; type: string }> {
    try {
      const validArgs = setPreferencesSchema.parse(args) as SetPreferencesArgs;
      
      // Convert readonly arrays to mutable for PreferenceService compatibility
      const preferenceUpdate = {
        ...validArgs,
        focus: validArgs.focus ? [...validArgs.focus] : undefined,
      };
      
      await this.preferenceService.applyPreferences(userId, preferenceUpdate);
      
      const updates = [];
      if (validArgs.goal) updates.push(`goal: ${validArgs.goal}`);
      if (validArgs.tone) updates.push(`tone: ${validArgs.tone}`);
      if (validArgs.reportTime) updates.push(`report time: ${validArgs.reportTime}`);
      if (validArgs.focus) updates.push(`focus: ${validArgs.focus.join(', ')}`);
      if (validArgs.dietaryRestrictions) updates.push(`dietary restrictions: ${validArgs.dietaryRestrictions.join(', ')}`);
      
      return {
        text: `✅ Updated: ${updates.join(', ')}`,
        type: 'preference_update'
      };
    } catch (error) {
      logger.error('[SetPreferencesHandler] Invalid preference args', { error, args });
      return {
        text: 'Sorry, I couldn\'t understand your preference update. Please try again.',
        type: 'error'
      };
    }
  }
} 