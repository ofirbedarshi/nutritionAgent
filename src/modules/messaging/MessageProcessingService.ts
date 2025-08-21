/**
 * Message Processing Service - Platform-agnostic message handling
 */
import { PrismaClient } from '@prisma/client';
import { UserService } from '../users/UserService';
import { UserRepository } from '../users/UserRepository';
import { ToolOrchestrator } from './ToolOrchestrator';
import { routeMessage } from '../../ai/AIOrchestrator';
import { 
  type UserContext,
  type Goal,
  type Tone
} from '../../types';
import { logger } from '../../lib/logger';

export type IncomingMessage = {
  from: string;
  text: string;
  timestamp: Date;
};

export type ProcessedResponse = {
  text: string;
  type: string;
  toolName?: string;
  args?: any;
};

export class MessageProcessingService {
  private userService: UserService;
  private toolOrchestrator: ToolOrchestrator;

  constructor(
    private prisma: PrismaClient,
    whatsAppProvider: any // TODO: Create proper interface for messaging providers
  ) {
    this.userService = new UserService(new UserRepository(prisma));
    this.toolOrchestrator = new ToolOrchestrator(prisma, whatsAppProvider);
  }

  /**
   * Process incoming message and return response
   */
  async processMessage(message: IncomingMessage): Promise<ProcessedResponse> {
    // Get or create user and load preferences for context
    const user = await this.userService.getOrCreateUser(message.from);
    const preferences = user.preferences;
    
    // Log incoming message
    await this.prisma.messageLog.create({
      data: {
        userId: user.id,
        direction: 'IN',
        payload: JSON.stringify({
          type: 'text',
          text: message.text,
          from: message.from,
          timestamp: message.timestamp,
        }),
      },
    });

    logger.info('Incoming message processed', {
      userId: user.id,
      from: message.from,
      textLength: message.text.length,
    });

    // Build user context for AI
    const context: UserContext = {
      goal: preferences?.goal as Goal | undefined,
      tone: preferences?.tone as Tone | undefined,
      reportTime: preferences?.reportTime,
      focus: preferences?.focus ? JSON.parse(preferences.focus) : undefined,
    };

    // Route message using AI orchestrator
    const orchestratorResult = await routeMessage(message.text, context);
    
    let responseText: string;
    let responseType: string;

    if (orchestratorResult.type === 'tool' && orchestratorResult.toolName && orchestratorResult.args) {
      // Handle tool execution
      const { toolName, args } = orchestratorResult;
      
      logger.info('Executing tool', { toolName, args });

      const toolResult = await this.toolOrchestrator.executeTool(toolName, args, user.id, message.timestamp, user);
      responseText = toolResult.text;
      responseType = toolResult.type;
    } else {
      // Direct text response from AI
      responseText = orchestratorResult.text || 'I\'m here to help with your nutrition goals!';
      responseType = 'ai_response';
    }

    // Log outgoing message
    await this.prisma.messageLog.create({
      data: {
        userId: user.id,
        direction: 'OUT',
        payload: JSON.stringify({
          type: responseType,
          text: responseText,
          tool: orchestratorResult.toolName,
          args: orchestratorResult.args,
        }),
      },
    });

    logger.info('Message processed successfully', {
      userId: user.id,
      responseType,
      tool: orchestratorResult.toolName,
    });

    return {
      text: responseText,
      type: responseType,
      toolName: orchestratorResult.toolName,
      args: orchestratorResult.args,
    };
  }


} 