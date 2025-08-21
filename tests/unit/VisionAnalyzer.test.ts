// Mock OpenAI - create a simple mock that we can control
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

import { VisionAnalyzer } from '../../src/modules/media/VisionAnalyzer';

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('VisionAnalyzer', () => {
  let analyzer: VisionAnalyzer;

  beforeEach(() => {
    analyzer = new VisionAnalyzer();
    mockCreate.mockClear();
  });

  describe('analyzeFood', () => {
    it('should analyze food image successfully', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const expectedDescription = 'Detailed meal description: 1 medium grilled chicken breast (skinless, seasoned), 3/4 cup steamed broccoli florets, 1/2 cup brown rice, 1 tablespoon olive oil drizzle, fresh herbs garnish. Appears home-cooked, healthy preparation.';

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: expectedDescription,
          },
        }],
      } as any);

      const result = await analyzer.analyzeFood(imageBuffer, 'My lunch');

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          {
            role: 'system',
            content: expect.stringContaining('nutrition expert'),
          },
          {
            role: 'user',
            content: expect.arrayContaining([
              {
                type: 'text',
                text: expect.stringContaining('My lunch'),
              },
              {
                type: 'image_url',
                image_url: {
                  url: expect.stringContaining('data:image/jpeg;base64,'),
                  detail: 'low',
                },
              },
            ]),
          },
        ]),
        max_tokens: 500,
        temperature: 0.1,
      });

      expect(result.success).toBe(true);
      expect(result.description).toBe(expectedDescription);
    });

    it('should handle OpenAI API errors', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const apiError = new Error('OpenAI API error');

      mockCreate.mockRejectedValue(apiError);

      const result = await analyzer.analyzeFood(imageBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI API error');
    });

    it('should handle empty response from OpenAI', async () => {
      const imageBuffer = Buffer.from('fake-image-data');

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: '',
          },
        }],
      } as any);

      const result = await analyzer.analyzeFood(imageBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No description returned from OpenAI Vision');
    });

    it('should build prompt with caption when provided', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const caption = 'My healthy lunch';

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Detailed meal description: Test description',
          },
        }],
      } as any);

      await analyzer.analyzeFood(imageBuffer, caption);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            {
              role: 'user',
              content: expect.arrayContaining([
                {
                  type: 'text',
                  text: expect.stringContaining('My healthy lunch'),
                },
              ]),
            },
          ]),
        })
      );
    });
  });

  describe('validateFoodImage', () => {
    it('should validate food image with food keywords', async () => {
      const imageBuffer = Buffer.from('fake-image-data');

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Detailed meal description: Grilled chicken with vegetables and rice',
          },
        }],
      } as any);

      const result = await analyzer.validateFoodImage(imageBuffer);

      expect(result).toBe(true);
    });

    it('should reject non-food images', async () => {
      const imageBuffer = Buffer.from('fake-image-data');

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'A beautiful landscape with mountains and trees',
          },
        }],
      } as any);

      const result = await analyzer.validateFoodImage(imageBuffer);

      expect(result).toBe(false);
    });

    it('should handle validation errors gracefully', async () => {
      const imageBuffer = Buffer.from('fake-image-data');

      mockCreate.mockRejectedValue(new Error('API error'));

      const result = await analyzer.validateFoodImage(imageBuffer);

      expect(result).toBe(false);
    });
  });
}); 