/**
 * Time-related utility functions
 */

/**
 * Get the time of day category based on hour
 */
export function getTimeOfDay(hour: number): 'morning' | 'noon' | 'evening' | 'late' {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'noon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'late';
}

/**
 * Parse time string in HH:mm format and return hour and minute
 */
export function parseTimeString(timeStr: string): { hour: number; minute: number } {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm`);
  }

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time values: ${timeStr}`);
  }

  return { hour, minute };
}

/**
 * Check if a given time is considered "late" based on threshold
 */
export function isLateHour(hour: number, lateThreshold = 21): boolean {
  return hour >= lateThreshold;
}

/**
 * Get current hour in local timezone
 */
export function getCurrentHour(): number {
  return new Date().getHours();
}

/**
 * Format date for daily report queries (YYYY-MM-DD)
 */
export function formatDateForQuery(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get start and end of day for a given date
 */
export function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
} 