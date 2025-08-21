/**
 * Twilio WhatsApp provider implementation
 */
import { Request } from 'express';
import twilio from 'twilio';
import { config } from '../../config';
import { logger } from '../logger';
import { normalizePhoneNumber } from '../../utils/text';
import {
  WhatsAppProvider,
  IncomingMessage,
  OutgoingMessage,
  MessageDeliveryResult,
} from './WhatsAppProvider';

export class TwilioProvider implements WhatsAppProvider {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }

  async parseIncoming(req: Request): Promise<IncomingMessage> {
    const body = req.body as Record<string, string>;

    // Validate required fields
    if (!body.From) {
      throw new Error('Missing required fields in Twilio webhook');
    }

    // Extract phone number (remove whatsapp: prefix)
    const from = normalizePhoneNumber(body.From.replace('whatsapp:', ''));

    // Check if this is a media message
    const mediaUrl = body.MediaUrl0;
    const mediaContentType = body.MediaContentType0;
    const messageBody = body.Body?.trim() || '';

    if (mediaUrl && mediaContentType) {
      // Determine message type based on media content type
      let messageType: 'image' | 'voice';
      
      if (mediaContentType.startsWith('image/')) {
        messageType = 'image';
      } else if (mediaContentType.startsWith('audio/')) {
        messageType = 'voice';
      } else {
        throw new Error(`Unsupported media type: ${mediaContentType}`);
      }

      logger.info('Received media message', {
        from,
        type: messageType,
        mediaContentType,
        hasCaption: !!messageBody,
      });

      return {
        from,
        type: messageType,
        text: messageBody || undefined, // Caption text if any
        mediaUrl,
        mimeType: mediaContentType,
        timestamp: new Date(),
      };
    }

    // Handle text message
    if (!messageBody) {
      throw new Error('Empty message body and no media');
    }

    return {
      from,
      type: 'text',
      text: messageBody,
      timestamp: new Date(),
    };
  }

  async sendText(message: OutgoingMessage): Promise<MessageDeliveryResult> {
    try {
      const fromNumber = config.twilio.phoneNumber;
      const toNumber = `whatsapp:${message.to}`;
      
      logger.info('Sending WhatsApp message', {
        from: fromNumber,
        to: toNumber,
        bodyLength: message.text.length,
      });
      
      const result = await this.client.messages.create({
        body: message.text,
        from: fromNumber,
        to: toNumber,
      });

      logger.info('Message sent successfully', {
        messageId: result.sid,
        to: message.to,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to send message', {
        error: errorMessage,
        to: message.to,
        fullError: error,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  validateWebhook(req: Request): boolean {
    try {
      // In production, you should validate the webhook signature
      // For now, we'll do basic validation
      const body = req.body as Record<string, string>;
      
      // Must have From and MessageSid, and either Body or MediaUrl0
      return !!(body.From && body.MessageSid && (body.Body || body.MediaUrl0));
    } catch (error) {
      logger.warn('Webhook validation failed', { error });
      return false;
    }
  }
} 