/**
 * Integration tests for webhook endpoint
 */
import request from 'supertest';
import express from 'express';
// PrismaClient is used via prisma instance imported from setup
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

import { routeMessage } from '../../src/ai/AIOrchestrator';
const mockRouteMessage = routeMessage as jest.MockedFunction<typeof routeMessage>;

describe('Webhook Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create Express app with webhook routes
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/', createWebhookRouter(testPrisma, mockWhatsAppProvider));

    // Reset mocks
    jest.clearAllMocks();
    
    // Reset AI orchestrator mock
    mockRouteMessage.mockReset();
  });

  describe('POST /whatsapp', () => {
    test('should process meal entry and return hint', async () => {
      // Mock provider responses
      mockWhatsAppProvider.validateWebhook.mockReturnValue(true);
      mockWhatsAppProvider.parseIncoming.mockResolvedValue({
        from: '+1234567890',
        type: 'text',
        text: 'grilled chicken and salad',
        timestamp: new Date(),
      });
      mockWhatsAppProvider.sendText.mockResolvedValue({
        success: true,
        messageId: 'msg123',
      });
      
      // Mock AI orchestrator to return log_meal tool
      mockRouteMessage.mockResolvedValue({
        type: 'tool',
        toolName: 'log_meal',
        args: { text: 'grilled chicken and salad' },
      });

      const response = await request(app)
        .post('/whatsapp')
        .send({
          From: 'whatsapp:+1234567890',
          Body: 'grilled chicken and salad',
          MessageSid: 'test123',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.type).toBe('meal_logged');

      // Verify provider methods were called
      expect(mockWhatsAppProvider.validateWebhook).toHaveBeenCalled();
      expect(mockWhatsAppProvider.parseIncoming).toHaveBeenCalled();
      expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
        to: '+1234567890',
        text: 'Meal logged!',
      });

      // Check that meal was created in database
      const meal = await testPrisma.meal.findFirst({
        where: { rawText: 'grilled chicken and salad' },
      });
      expect(meal).toBeTruthy();
      const analysis = JSON.parse(meal!.tags);
      expect(analysis.categories.veggies.value).toBe(true);
      expect(analysis.overall_confidence).toBeGreaterThan(0);

      // Check that user was created
      const user = await testPrisma.user.findFirst({
        where: { phone: '+1234567890' },
      });
      expect(user).toBeTruthy();

      // Check message logs
      const incomingLog = await testPrisma.messageLog.findFirst({
        where: { direction: 'IN' },
      });
      expect(incomingLog).toBeTruthy();

      const outgoingLog = await testPrisma.messageLog.findFirst({
        where: { direction: 'OUT' },
      });
      expect(outgoingLog).toBeTruthy();
    });

    test('should process preference command and return confirmation', async () => {
      // Mock provider responses
      mockWhatsAppProvider.validateWebhook.mockReturnValue(true);
      mockWhatsAppProvider.parseIncoming.mockResolvedValue({
        from: '+1234567890',
        type: 'text',
        text: 'set goal: fat_loss',
        timestamp: new Date(),
      });
      mockWhatsAppProvider.sendText.mockResolvedValue({
        success: true,
        messageId: 'msg456',
      });
      
      // Mock AI orchestrator to return set_preferences tool
      mockRouteMessage.mockResolvedValue({
        type: 'tool',
        toolName: 'set_preferences',
        args: { goal: 'fat_loss' },
      });

      const response = await request(app)
        .post('/whatsapp')
        .send({
          From: 'whatsapp:+1234567890',
          Body: 'set goal: fat_loss',
          MessageSid: 'test456',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.type).toBe('preference_update');

      // Check that preferences were updated
      const user = await testPrisma.user.findFirst({
        where: { phone: '+1234567890' },
        include: { preferences: true },
      });
      expect(user?.preferences?.goal).toBe('fat_loss');

      // Verify confirmation message was sent (new AI format)
      expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
        to: '+1234567890',
        text: expect.stringContaining('✅ Updated: goal: fat_loss'),
      });
    });

    test('should handle invalid webhook gracefully', async () => {
      mockWhatsAppProvider.validateWebhook.mockReturnValue(false);

      const response = await request(app)
        .post('/whatsapp')
        .send({
          invalid: 'data',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid webhook request');
    });

    test('should handle message too long error', async () => {
      const longMessage = 'a'.repeat(1001); // Exceeds 1000 character limit

      mockWhatsAppProvider.validateWebhook.mockReturnValue(true);
      mockWhatsAppProvider.parseIncoming.mockResolvedValue({
        from: '+1234567890',
        type: 'text',
        text: longMessage,
        timestamp: new Date(),
      });
      mockWhatsAppProvider.sendText.mockResolvedValue({
        success: true,
        messageId: 'msg789',
      });

      const response = await request(app)
        .post('/whatsapp')
        .send({
          From: 'whatsapp:+1234567890',
          Body: longMessage,
          MessageSid: 'test789',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Message too long');

      // Verify error message was sent to user
      expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
        to: '+1234567890',
        text: 'Message too long. Please keep it under 1000 characters.',
      });
    });

    test('should handle processing errors gracefully', async () => {
      mockWhatsAppProvider.validateWebhook.mockReturnValue(true);
      mockWhatsAppProvider.parseIncoming.mockRejectedValue(new Error('Parse error'));
      mockWhatsAppProvider.sendText.mockResolvedValue({
        success: true,
        messageId: 'error123',
      });

      const response = await request(app)
        .post('/whatsapp')
        .send({
          From: 'whatsapp:+1234567890',
          Body: 'test message',
          MessageSid: 'error123',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });
}); 