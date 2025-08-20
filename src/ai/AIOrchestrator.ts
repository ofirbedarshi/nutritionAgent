/**
 * AI Orchestrator using OpenAI function calling for message routing
 */

import OpenAI from 'openai';
import { logger } from '../lib/logger';
import { config } from '../config';
import { tools } from './tools';
import { SYSTEM_PROMPT } from './systemPrompt';
import { 
  type UserContext, 
  type OrchestratorResult, 
  type ToolName 
} from '../types';
import { 
  OPENAI_MODEL, 
  OPENAI_TEMPERATURE, 
  OPENAI_MAX_TOKENS,
  LOG_TAGS 
} from '../constants';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Routes incoming messages using OpenAI function calling
 */
export async function routeMessage(
  text: string,
  context: UserContext
): Promise<OrchestratorResult> {
  try {
    // Build context summary for the assistant
    const contextParts = [];
    if (context.goal) contextParts.push(`goal=${context.goal}`);
    if (context.tone) contextParts.push(`tone=${context.tone}`);
    if (context.reportTime) contextParts.push(`reportTime=${context.reportTime}`);
    if (context.focus?.length) contextParts.push(`focus=[${context.focus.join(',')}]`);
    
    const contextSummary = contextParts.length > 0 
      ? `current_prefs: ${contextParts.join(', ')}`
      : 'current_prefs: none set';

    logger.info(`${LOG_TAGS.AI_ROUTING} Routing message with OpenAI`, {
      text: text.substring(0, 100),
      contextSummary,
    });

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'assistant',
          content: contextSummary,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      tools,
      tool_choice: 'auto',
      temperature: OPENAI_TEMPERATURE,
      max_tokens: OPENAI_MAX_TOKENS,
    });

    const message = completion.choices[0]?.message;
    
    if (!message) {
      throw new Error('No response from OpenAI');
    }

    // Check if OpenAI chose to call a tool
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.type === 'function') {
        const toolName = toolCall.function.name as ToolName;
        const args = JSON.parse(toolCall.function.arguments);

        logger.info('OpenAI chose tool', {
          toolName,
          args,
        });

        return {
          type: 'tool',
          toolName,
          args,
        };
      }
    }

    // If no tool was called, return the text response
    const responseText = message.content?.trim() || 'I\'m here to help with your nutrition goals!';
    
    logger.info('OpenAI returned text response', {
      text: responseText,
    });

    return {
      type: 'reply',
      text: responseText,
    };

  } catch (error) {
    logger.error('Error in AI orchestrator', {
      error: error instanceof Error ? error.message : 'Unknown error',
      text: text.substring(0, 100),
    });

    // Fallback to ask_coach for any errors
    return {
      type: 'tool',
      toolName: 'ask_coach',
      args: { question: text },
    };
  }
} 