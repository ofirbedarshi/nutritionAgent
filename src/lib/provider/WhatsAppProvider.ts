/**
 * WhatsApp provider interface for message handling abstraction
 */
import { Request } from 'express';

export interface IncomingMessage {
  from: string;
  type: 'text' | 'image' | 'voice';
  text?: string;           // For text messages and transcribed voice
  mediaUrl?: string;       // For image/voice file URL
  mimeType?: string;       // image/jpeg, audio/ogg, etc.
  timestamp?: Date;
}

export interface OutgoingMessage {
  to: string;
  text: string;
}

export interface MessageDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Abstract WhatsApp provider interface
 * Allows swapping between different providers (Twilio, WhatsApp Business API, etc.)
 */
export interface WhatsAppProvider {
  /**
   * Parse incoming webhook request to extract message data
   */
  parseIncoming(req: Request): Promise<IncomingMessage>;

  /**
   * Send a text message to a WhatsApp number
   */
  sendText(message: OutgoingMessage): Promise<MessageDeliveryResult>;

  /**
   * Validate webhook signature/authenticity
   */
  validateWebhook(req: Request): boolean;
} 