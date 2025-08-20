/**
 * Preference command parser using regex patterns
 */
import { logger } from '../../lib/logger';
import { parseTimeString } from '../../utils/time';

export interface PreferenceUpdate {
  goal?: 'fat_loss' | 'muscle_gain' | 'maintenance' | 'general';
  reportTime?: string;
  tone?: 'friendly' | 'clinical' | 'funny';
  focus?: string[];
  storeMedia?: boolean;
}

export class PreferenceParser {
  /**
   * Parse preference command from text input
   */
  parsePreferenceCommand(text: string): PreferenceUpdate | null {
    const normalized = text.trim().toLowerCase();

    // Set goal command: "set goal: fat_loss|muscle_gain|maintenance|general"
    const goalMatch = normalized.match(/^set\s+goal:?\s*(fat_loss|muscle_gain|maintenance|general)$/);
    if (goalMatch) {
      return { goal: goalMatch[1] as PreferenceUpdate['goal'] };
    }

    // Report time command: "report 21:30"
    const reportMatch = normalized.match(/^report\s+(\d{1,2}:\d{2})$/);
    if (reportMatch) {
      try {
        // Validate time format
        parseTimeString(reportMatch[1]);
        return { reportTime: reportMatch[1] };
      } catch (error) {
        logger.warn('Invalid time format in report command', { 
          input: text, 
          time: reportMatch[1] 
        });
        return null;
      }
    }

    // Tone command: "tone friendly|clinical|funny"
    const toneMatch = normalized.match(/^tone\s+(friendly|clinical|funny)$/);
    if (toneMatch) {
      return { tone: toneMatch[1] as PreferenceUpdate['tone'] };
    }

    // Focus command: "focus protein, veggies" (comma-separated)
    const focusMatch = normalized.match(/^focus\s+(.+)$/);
    if (focusMatch) {
      const focusItems = focusMatch[1]
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      return { focus: focusItems };
    }

    // Store photos command: "store photos on/off"
    const storeMatch = normalized.match(/^store\s+photos?\s+(on|off)$/);
    if (storeMatch) {
      return { storeMedia: storeMatch[1] === 'on' };
    }

    return null;
  }

  /**
   * Generate confirmation message for preference update
   */
  generateConfirmationMessage(update: PreferenceUpdate): string {
    if (update.goal) {
      const goalLabels = {
        fat_loss: 'Fat Loss',
        muscle_gain: 'Muscle Gain', 
        maintenance: 'Maintenance',
        general: 'General Health'
      };
      return `✅ Goal set to: ${goalLabels[update.goal]}`;
    }

    if (update.reportTime) {
      return `✅ Daily report time set to: ${update.reportTime}`;
    }

    if (update.tone) {
      const toneLabels = {
        friendly: 'Friendly',
        clinical: 'Clinical',
        funny: 'Funny'
      };
      return `✅ Tone set to: ${toneLabels[update.tone]}`;
    }

    if (update.focus) {
      return `✅ Focus areas set to: ${update.focus.join(', ')}`;
    }

    if (update.storeMedia !== undefined) {
      return `✅ Photo storage ${update.storeMedia ? 'enabled' : 'disabled'}`;
    }

    return '✅ Preferences updated';
  }
} 