/**
 * Integration tests for media webhook functionality
 */
import request from 'supertest';
import express from 'express';
import { createWebhookRouter } from '../../src/routes/webhook';
import { testPrisma } from '../setup';

// Mock WhatsApp provider for testing
const mockWhatsAppProvider = {
  parseIncoming: jest.fn(),
  sendText: jest.fn(),
  validateWebhook: jest.fn(),
};

// Mock AI Orchestrator for integration tests
jest.mock('../../src/ai/AIOrchestrator', () => ({
  routeMessage: jest.fn(),
}));

// Mock AIMealAnalyzer to avoid real OpenAI calls
jest.mock('../../src/modules/meals/AIMealAnalyzer', () => ({
  AIMealAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeMeal: jest.fn().mockResolvedValue({
      nutrition: {
        calories: { min: 300, max: 400, confidence: 0.8 },
        protein_g: { min: 25, max: 35, confidence: 0.9 },
        carbs_g: { min: 15, max: 25, confidence: 0.7 },
        fat_g: { min: 10, max: 15, confidence: 0.6 },
        fiber_g: null,
      },
      categories: {
        veggies: { value: true, confidence: 0.9 },
        junk: { value: false, confidence: 0.8 },
        homemade: { value: true, confidence: 0.7 },
      },
      ingredients: [
        { name: 'chicken', confidence: 0.9 },
        { name: 'salad', confidence: 0.8 },
      ],
      meal_type: { value: 'lunch', confidence: 0.8 },
      portion_size: { value: 'medium', confidence: 0.7 },
      overall_confidence: 0.8,
      estimation_source: 'openai',
      classification_version: 1,
    }),
  })),
}));

// Mock MediaProcessingService to avoid real media downloads and API calls
jest.mock('../../src/modules/media/MediaProcessingService', () => ({
  MediaProcessingService: jest.fn().mockImplementation(() => ({
    processMedia: jest.fn().mockImplementation(async (_mediaUrl: string, mimeType: string, caption?: string) => {
      // Simulate different responses based on media type
      if (mimeType.startsWith('image/')) {
        return {
          success: true,
          text: caption 
            ? `Grilled chicken breast with steamed broccoli and brown rice, medium portion. User caption: ${caption}`
            : 'Grilled chicken breast with steamed broccoli and brown rice, medium portion',
        };
      } else if (mimeType.startsWith('audio/')) {
        return {
          success: true,
          text: 'I had grilled chicken with vegetables for lunch today',
        };
      } else {
        return {
          success: false,
          error: 'Unsupported media type',
        };
      }
    }),
  })),
}));

import { routeMessage } from '../../src/ai/AIOrchestrator';

describe('Media Webhook Integration Tests', () => {
  let app: express.Application;
  const testPhone = '+1999999999'; // Unique phone number for this test

  beforeAll(async () => {
    // Clean up any existing test user first
    await testPrisma.user.deleteMany({
      where: {
        phone: testPhone,
      },
    });

    // Create test user
    await testPrisma.user.create({
      data: {
        phone: testPhone,
        preferences: {
          create: {
            goal: 'fat_loss',
            tone: 'friendly',
            reportTime: '20:00:00Z',
            focus: JSON.stringify(['protein', 'veggies']),
          },
        },
      },
    });
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/webhooks', createWebhookRouter(testPrisma, mockWhatsAppProvider as any));

    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockWhatsAppProvider.validateWebhook.mockReturnValue(true);
    mockWhatsAppProvider.sendText.mockResolvedValue({
      success: true,
      messageId: 'test-msg-id',
    });
  });

  afterAll(async () => {
    // Clean up test data
    await testPrisma.user.deleteMany({
      where: {
        phone: testPhone,
      },
    });
  });

  describe('POST /whatsapp', () => {
    test('should process food image and log meal automatically', async () => {
      // Mock provider responses for image message
      mockWhatsAppProvider.parseIncoming.mockResolvedValue({
        from: testPhone,
        type: 'image',
        text: 'My healthy lunch',
        mediaUrl: 'https://api.twilio.com/test-image.jpg',
        mimeType: 'image/jpeg',
        timestamp: new Date(),
      });

      // Mock AI orchestrator to return meal logging tool
      (routeMessage as jest.Mock).mockResolvedValue({
        type: 'tool',
        toolName: 'log_meal',
        args: {
          description: 'Grilled chicken breast with steamed broccoli and brown rice, medium portion',
        },
      });

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send({
          From: `whatsapp:${testPhone}`,
          MediaUrl0: 'https://api.twilio.com/test-image.jpg',
          MediaContentType0: 'image/jpeg',
          Body: 'My healthy lunch',
          MessageSid: 'test123',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      // Verify provider methods were called
      expect(mockWhatsAppProvider.validateWebhook).toHaveBeenCalled();
      expect(mockWhatsAppProvider.parseIncoming).toHaveBeenCalled();
      expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
        to: testPhone,
        text: 'Meal logged!',
      });

      // Verify AI orchestrator was called with processed image description
      expect(routeMessage).toHaveBeenCalledWith(
        'Grilled chicken breast with steamed broccoli and brown rice, medium portion. User caption: My healthy lunch',
        expect.objectContaining({
          goal: 'fat_loss',
          tone: 'friendly',
        })
      );
    });

    test('should process voice message and log meal automatically', async () => {
      // Mock provider responses for voice message
      mockWhatsAppProvider.parseIncoming.mockResolvedValue({
        from: testPhone,
        type: 'voice',
        mediaUrl: 'https://api.twilio.com/test-audio.ogg',
        mimeType: 'audio/ogg',
        timestamp: new Date(),
      });

      // Mock AI orchestrator to return meal logging tool
      (routeMessage as jest.Mock).mockResolvedValue({
        type: 'tool',
        toolName: 'log_meal',
        args: {
          description: 'I had grilled chicken with vegetables for lunch today',
        },
      });

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send({
          From: `whatsapp:${testPhone}`,
          MediaUrl0: 'https://api.twilio.com/test-audio.ogg',
          MediaContentType0: 'audio/ogg',
          MessageSid: 'test456',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      // Verify provider methods were called
      expect(mockWhatsAppProvider.validateWebhook).toHaveBeenCalled();
      expect(mockWhatsAppProvider.parseIncoming).toHaveBeenCalled();
      expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
        to: testPhone,
        text: 'Meal logged!',
      });

      // Verify AI orchestrator was called with transcribed text
      expect(routeMessage).toHaveBeenCalledWith(
        'I had grilled chicken with vegetables for lunch today',
        expect.objectContaining({
          goal: 'fat_loss',
          tone: 'friendly',
        })
      );
    });

    test('should handle non-meal image with AI response', async () => {
      // Mock provider responses for non-food image
      mockWhatsAppProvider.parseIncoming.mockResolvedValue({
        from: testPhone,
        type: 'image',
        text: 'Check out this view',
        mediaUrl: 'https://api.twilio.com/test-landscape.jpg',
        mimeType: 'image/jpeg',
        timestamp: new Date(),
      });

      // Mock AI orchestrator to return direct response (not meal logging)
      (routeMessage as jest.Mock).mockResolvedValue({
        type: 'text',
        text: 'That\'s a beautiful landscape! I can see mountains and trees in the distance.',
      });

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send({
          From: `whatsapp:${testPhone}`,
          MediaUrl0: 'https://api.twilio.com/test-landscape.jpg',
          MediaContentType0: 'image/jpeg',
          Body: 'Check out this view',
          MessageSid: 'test789',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      // Verify AI orchestrator was called with image description
      expect(routeMessage).toHaveBeenCalledWith(
        'Grilled chicken breast with steamed broccoli and brown rice, medium portion. User caption: Check out this view',
        expect.objectContaining({
          goal: 'fat_loss',
          tone: 'friendly',
        })
      );

      // Verify response was sent
      expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
        to: testPhone,
        text: 'That\'s a beautiful landscape! I can see mountains and trees in the distance.',
      });
    });

    test('should handle media processing failure gracefully', async () => {
      // Mock provider responses for image message
      mockWhatsAppProvider.parseIncoming.mockResolvedValue({
        from: testPhone,
        type: 'image',
        mediaUrl: 'https://api.twilio.com/test-image.jpg',
        mimeType: 'image/jpeg',
        timestamp: new Date(),
      });

      // Mock MediaProcessingService to fail
      const { MediaProcessingService } = require('../../src/modules/media/MediaProcessingService');
      MediaProcessingService.mockImplementation(() => ({
        processMedia: jest.fn().mockResolvedValue({
          success: false,
          error: 'Failed to process image',
        }),
      }));

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send({
          From: `whatsapp:${testPhone}`,
          MediaUrl0: 'https://api.twilio.com/test-image.jpg',
          MediaContentType0: 'image/jpeg',
          MessageSid: 'test-fail',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      // Verify error response was sent
      expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
        to: '+1234567890',
        text: 'Sorry, I had trouble processing your media. Please try again.',
      });
    });

    test('should handle unsupported media types', async () => {
      // Mock provider responses for video message
      mockWhatsAppProvider.parseIncoming.mockResolvedValue({
        from: testPhone,
        type: 'video',
        mediaUrl: 'https://api.twilio.com/test-video.mp4',
        mimeType: 'video/mp4',
        timestamp: new Date(),
      });

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send({
          From: `whatsapp:${testPhone}`,
          MediaUrl0: 'https://api.twilio.com/test-video.mp4',
          MediaContentType0: 'video/mp4',
          MessageSid: 'test-video',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      // Verify error response was sent
      expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
        to: testPhone,
        text: 'Sorry, I had trouble processing your media. Please try again.',
      });
    });
  });
}); 