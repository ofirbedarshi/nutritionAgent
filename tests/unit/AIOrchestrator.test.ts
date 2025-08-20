/**
 * Unit tests for AI Orchestrator
 */

import { routeMessage } from '../../src/ai/AIOrchestrator';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

// Mock config
jest.mock('../../src/config', () => ({
  config: {
    openai: {
      apiKey: 'test-key',
    },
    logLevel: 'error',
  },
}));

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import OpenAI from 'openai';

const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockCreate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockOpenAI.mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  } as any));
});

describe('AIOrchestrator', () => {
  describe('routeMessage', () => {
    it('should route preference commands to set_preferences tool', async () => {
      // Mock OpenAI response for preference setting
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            tool_calls: [{
              type: 'function',
              function: {
                name: 'set_preferences',
                arguments: JSON.stringify({
                  goal: 'fat_loss',
                  tone: 'friendly'
                }),
              },
            }],
          },
        }],
      });

      const result = await routeMessage('set my goal to lose weight and make it friendly', {});

      expect(result.type).toBe('tool');
      expect(result.toolName).toBe('set_preferences');
      expect(result.args).toEqual({
        goal: 'fat_loss',
        tone: 'friendly'
      });
    });

    it('should route meal descriptions to log_meal tool', async () => {
      // Mock OpenAI response for meal logging
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            tool_calls: [{
              type: 'function',
              function: {
                name: 'log_meal',
                arguments: JSON.stringify({
                  text: 'chicken and rice for lunch'
                }),
              },
            }],
          },
        }],
      });

      const result = await routeMessage('I had chicken and rice for lunch', {});

      expect(result.type).toBe('tool');
      expect(result.toolName).toBe('log_meal');
      expect(result.args).toEqual({
        text: 'chicken and rice for lunch'
      });
    });

    it('should route summary requests to request_summary tool', async () => {
      // Mock OpenAI response for summary request
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            tool_calls: [{
              type: 'function',
              function: {
                name: 'request_summary',
                arguments: JSON.stringify({
                  period: 'daily'
                }),
              },
            }],
          },
        }],
      });

      const result = await routeMessage('send me my daily report', {});

      expect(result.type).toBe('tool');
      expect(result.toolName).toBe('request_summary');
      expect(result.args).toEqual({
        period: 'daily'
      });
    });

    it('should route general questions to ask_coach tool', async () => {
      // Mock OpenAI response for coaching question
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            tool_calls: [{
              type: 'function',
              function: {
                name: 'ask_coach',
                arguments: JSON.stringify({
                  question: 'what should I eat for breakfast?'
                }),
              },
            }],
          },
        }],
      });

      const result = await routeMessage('what should I eat for breakfast?', {});

      expect(result.type).toBe('tool');
      expect(result.toolName).toBe('ask_coach');
      expect(result.args).toEqual({
        question: 'what should I eat for breakfast?'
      });
    });

    it('should return text response when no tool is called', async () => {
      // Mock OpenAI response with direct text
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'I\'m here to help with your nutrition goals!',
            tool_calls: null,
          },
        }],
      });

      const result = await routeMessage('hello', {});

      expect(result.type).toBe('reply');
      expect(result.text).toBe('I\'m here to help with your nutrition goals!');
    });

    it('should fallback to ask_coach on OpenAI error', async () => {
      // Mock OpenAI error
      mockCreate.mockRejectedValue(new Error('API error'));

      const result = await routeMessage('test message', {});

      expect(result.type).toBe('tool');
      expect(result.toolName).toBe('ask_coach');
      expect(result.args).toEqual({
        question: 'test message'
      });
    });

    it('should include user context in the request', async () => {
      // Mock OpenAI response
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            tool_calls: [{
              type: 'function',
              function: {
                name: 'log_meal',
                arguments: JSON.stringify({
                  text: 'salad'
                }),
              },
            }],
          },
        }],
      });

      const context = {
        goal: 'muscle_gain',
        tone: 'funny',
        reportTime: '21:30',
        focus: ['protein', 'veggies']
      };

      await routeMessage('had a salad', context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'assistant',
              content: 'current_prefs: goal=muscle_gain, tone=funny, reportTime=21:30, focus=[protein,veggies]'
            })
          ])
        })
      );
    });
  });
}); 