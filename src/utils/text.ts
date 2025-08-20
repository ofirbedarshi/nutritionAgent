/**
 * Text processing utility functions
 */

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with +, keep it as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If it starts with 0 (Israeli format), replace with +972
  if (cleaned.startsWith('0')) {
    return '+972' + cleaned.slice(1);
  }
  
  // If it doesn't start with country code, assume Israeli
  if (!cleaned.startsWith('972')) {
    return '+972' + cleaned;
  }
  
  return '+' + cleaned;
}

/**
 * Validate text message length
 */
export function validateMessageLength(text: string, maxLength = 1000): boolean {
  return text.trim().length > 0 && text.length <= maxLength;
}

/**
 * Clean and normalize text input
 */
export function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Extract command and parameters from text
 */
export function extractCommand(text: string): { command: string; params: string } | null {
  const normalized = normalizeText(text);
  const commandMatch = normalized.match(/^(set|report|tone|focus|store)\s+(.+)$/);
  
  if (!commandMatch) {
    return null;
  }
  
  return {
    command: commandMatch[1],
    params: commandMatch[2].trim(),
  };
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
} 