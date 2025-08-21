/**
 * WhatsApp webhook route handler with AI orchestrator
 */
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { WhatsAppProvider } from '../lib/provider/WhatsAppProvider';
import { MessageProcessingService, type IncomingMessage } from '../modules/messaging/MessageProcessingService';
import { 
  ERROR_MESSAGES,
  LOG_TAGS
} from '../constants';
import { logger } from '../lib/logger';
import { validateMessageLength } from '../utils/text';

export function createWebhookRouter(
  prisma: PrismaClient,
  whatsAppProvider: WhatsAppProvider
): Router {
  const router = Router();
  
  // Message processing service
  const messageProcessingService = new MessageProcessingService(prisma, whatsAppProvider);

  /**
   * Main WhatsApp webhook handler with AI orchestrator
   */
  router.post('/whatsapp', async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate webhook
      if (!whatsAppProvider.validateWebhook(req)) {
        logger.warn(`${LOG_TAGS.WEBHOOK_VALIDATION} Invalid webhook request`, { body: req.body });
        res.status(400).json({ error: ERROR_MESSAGES.INVALID_WEBHOOK });
        return;
      }

      // Parse incoming message
      const incomingMessage = await whatsAppProvider.parseIncoming(req);
      
      // Validate message length
      if (!validateMessageLength(incomingMessage.text)) {
        logger.warn('Invalid message length', { 
          from: incomingMessage.from,
          length: incomingMessage.text.length 
        });
        
        await whatsAppProvider.sendText({
          to: incomingMessage.from,
          text: ERROR_MESSAGES.MESSAGE_TOO_LONG,
        });
        
        res.json({ status: 'error', message: 'Message too long' });
        return;
      }

      // Process message using the service
      const message: IncomingMessage = {
        from: incomingMessage.from,
        text: incomingMessage.text,
        timestamp: incomingMessage.timestamp || new Date(),
      };

      const response = await messageProcessingService.processMessage(message);
      const { text: responseText, type: responseType } = response;

      // Send response to user
      await whatsAppProvider.sendText({
        to: incomingMessage.from,
        text: responseText,
      });

      logger.info('WhatsApp response sent', {
        from: incomingMessage.from,
        responseType,
        tool: response.toolName,
      });

      res.json({ status: 'success', type: responseType });

    } catch (error) {
      logger.error('Error processing webhook', { error, body: req.body });
      
      // Send a friendly error message to the user if possible
      try {
        if (req.body?.From) {
          const phone = req.body.From.replace('whatsapp:', '');
          await whatsAppProvider.sendText({
            to: phone,
            text: 'Sorry, something went wrong. Please try again later.',
          });
        }
      } catch (sendError) {
        logger.error('Failed to send error message to user', { sendError });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Health check endpoint
   */
  router.get('/health', (_req: Request, res: Response): void => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  return router;
} 