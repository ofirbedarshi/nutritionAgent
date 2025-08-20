/**
 * Unit tests for DailySummaryService
 */
import { DailySummaryService } from '../../src/modules/reports/DailySummaryService';
import { testPrisma } from '../setup';

// Mock WhatsApp provider
const mockWhatsAppProvider = {
  parseIncoming: jest.fn(),
  sendText: jest.fn(),
  validateWebhook: jest.fn(),
};

describe('DailySummaryService', () => {
  let service: DailySummaryService;
  let userId: string;

  beforeEach(async () => {
    service = new DailySummaryService(testPrisma, mockWhatsAppProvider);
    
    // Create test user
    const user = await testPrisma.user.create({
      data: {
        phone: '+1234567890',
        preferences: {
          create: {
            goal: 'fat_loss',
            tone: 'friendly',
            reportTime: '21:30',
            focus: JSON.stringify(['protein', 'veggies']),
          },
        },
      },
    });
    userId = user.id;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('composeDailySummary', () => {
    test('should generate summary with no meals', async () => {
      const summary = await service.composeDailySummary(userId);
      
      expect(summary.mealsCount).toBe(0);
      expect(summary.lateMeals).toBe(0);
      expect(summary.veggiesRatio).toBe(0);
      expect(summary.proteinRatio).toBe(0);
      expect(summary.junkRatio).toBe(0);
      expect(summary.suggestions).toContain('Remember to log your meals tomorrow!');
    });

    test('should calculate meal statistics correctly', async () => {
      const testDate = new Date('2024-01-15T12:00:00Z');
      
      // Create test meals
      await testPrisma.meal.createMany({
        data: [
          {
            userId,
            rawText: 'grilled chicken with salad',
            tags: JSON.stringify({
              protein: true,
              veggies: true,
              carbs: 'low',
              junk: false,
              timeOfDay: 'noon',
            }),
            createdAt: new Date('2024-01-15T12:00:00Z'),
          },
          {
            userId,
            rawText: 'pizza',
            tags: JSON.stringify({
              protein: false,
              veggies: false,
              carbs: 'high',
              junk: true,
              timeOfDay: 'evening',
            }),
            createdAt: new Date('2024-01-15T18:00:00Z'),
          },
          {
            userId,
            rawText: 'late night snack',
            tags: JSON.stringify({
              protein: false,
              veggies: false,
              carbs: 'medium',
              junk: false,
              timeOfDay: 'late',
            }),
            createdAt: new Date('2024-01-15T21:30:00Z'), // 21:30 UTC to stay within day bounds
          },
        ],
      });

      const summary = await service.composeDailySummary(userId, testDate);
      
      expect(summary.mealsCount).toBe(3);
      expect(summary.lateMeals).toBe(1); // 1 late meal (23:00)
      expect(summary.veggiesRatio).toBe(1/3); // 1 out of 3 meals had veggies (grilled chicken with salad)
      expect(summary.proteinRatio).toBe(1/3); // 1 out of 3 meals had protein (grilled chicken)
      expect(summary.junkRatio).toBe(1/3); // 1 out of 3 meals was junk (pizza)
    });

    test('should generate appropriate suggestions', async () => {
      const testDate = new Date('2024-01-15T12:00:00Z');
      
      // Create meals with issues
      await testPrisma.meal.createMany({
        data: [
          {
            userId,
            rawText: 'pizza',
            tags: JSON.stringify({
              protein: false,
              veggies: false,
              carbs: 'high',
              junk: true,
              timeOfDay: 'late',
            }),
            createdAt: new Date('2024-01-15T21:30:00Z'), // Late but within day bounds
          },
          {
            userId,
            rawText: 'burger',
            tags: JSON.stringify({
              protein: false,
              veggies: false,
              carbs: 'high',
              junk: true,
              timeOfDay: 'evening',
            }),
            createdAt: new Date('2024-01-15T18:00:00Z'),
          },
        ],
      });

      const summary = await service.composeDailySummary(userId, testDate);
      
      expect(summary.suggestions).toContain('Try eating earlier - late meals can affect sleep quality');
      expect(summary.suggestions).toContain('Add more vegetables to your meals for better nutrition');
      expect(summary.suggestions).toContain('Include protein in more meals for better satiety');
      expect(summary.suggestions).toContain('Reduce processed foods - aim for whole foods instead');
    });

    test('should generate positive feedback for good nutrition', async () => {
      const testDate = new Date('2024-01-15T12:00:00Z');
      
      // Create healthy meals
      await testPrisma.meal.createMany({
        data: [
          {
            userId,
            rawText: 'grilled chicken with vegetables',
            tags: JSON.stringify({
              protein: true,
              veggies: true,
              carbs: 'low',
              junk: false,
              timeOfDay: 'noon',
            }),
            createdAt: new Date('2024-01-15T12:00:00Z'),
          },
          {
            userId,
            rawText: 'salmon with quinoa and broccoli',
            tags: JSON.stringify({
              protein: true,
              veggies: true,
              carbs: 'medium',
              junk: false,
              timeOfDay: 'evening',
            }),
            createdAt: new Date('2024-01-15T18:00:00Z'),
          },
        ],
      });

      const summary = await service.composeDailySummary(userId, testDate);
      
      expect(summary.suggestions).toContain('Great job maintaining balanced nutrition today!');
    });
  });

  describe('formatSummaryText', () => {
    test('should format friendly tone summary', () => {
      const summary = {
        date: '2024-01-15',
        mealsCount: 3,
        lateMeals: 1,
        veggiesRatio: 0.67,
        proteinRatio: 0.67,
        junkRatio: 0.33,
        suggestions: ['Add more vegetables to your meals for better nutrition'],
      };

      const text = service.formatSummaryText(summary, 'friendly');
      
      expect(text).toContain('🌟 Daily Summary');
      expect(text).toContain('Meals logged: 3');
      expect(text).toContain('Late meals: 1');
      expect(text).toContain('Veggie meals: 67%');
      expect(text).toContain('💡 Tips:');
    });

    test('should format clinical tone summary', () => {
      const summary = {
        date: '2024-01-15',
        mealsCount: 2,
        lateMeals: 0,
        veggiesRatio: 0.5,
        proteinRatio: 1.0,
        junkRatio: 0,
        suggestions: ['Great job maintaining balanced nutrition today!'],
      };

      const text = service.formatSummaryText(summary, 'clinical');
      
      expect(text).toContain('📊 Daily Nutrition Report');
      expect(text).toContain('💡 Recommendations:');
    });

    test('should format funny tone summary', () => {
      const summary = {
        date: '2024-01-15',
        mealsCount: 0,
        lateMeals: 0,
        veggiesRatio: 0,
        proteinRatio: 0,
        junkRatio: 0,
        suggestions: [],
      };

      const text = service.formatSummaryText(summary, 'funny');
      
      expect(text).toContain('🎭 Your Food Adventures Today!');
      expect(text).toContain('Did you forget to eat? That\'s one way to fast! 😅');
    });
  });

  describe('sendDailySummary', () => {
    test('should send summary and log message on success', async () => {
      mockWhatsAppProvider.sendText.mockResolvedValue({
        success: true,
        messageId: 'msg123',
      });

      const user = await testPrisma.user.findFirst({
        where: { id: userId },
        include: { preferences: true },
      });

      const result = await service.sendDailySummary(user!);
      
      expect(result).toBe(true);
      expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
        to: '+1234567890',
        text: expect.stringContaining('Daily Summary'),
      });

      // Check message log
      const messageLog = await testPrisma.messageLog.findFirst({
        where: { userId, direction: 'OUT' },
      });
      expect(messageLog).toBeTruthy();
      const payload = JSON.parse(messageLog!.payload);
      expect(payload.type).toBe('daily_summary');
    });

    test('should handle send failure gracefully', async () => {
      mockWhatsAppProvider.sendText.mockResolvedValue({
        success: false,
        error: 'Send failed',
      });

      const user = await testPrisma.user.findFirst({
        where: { id: userId },
        include: { preferences: true },
      });

      const result = await service.sendDailySummary(user!);
      
      expect(result).toBe(false);
    });
  });
}); 