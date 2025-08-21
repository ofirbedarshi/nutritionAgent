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
import { MediaProcessingService } from '../media/MediaProcessingService';

export type IncomingMessage = {
  from: string;
  type: 'text' | 'image' | 'voice';
  text?: string;           // For text messages and transcribed voice
  mediaUrl?: string;       // For image/voice file URL
  mimeType?: string;       // image/jpeg, audio/ogg, etc.
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
  private mediaProcessingService: MediaProcessingService;

  constructor(
    private prisma: PrismaClient,
    whatsAppProvider: any // TODO: Create proper interface for messaging providers
  ) {
    this.userService = new UserService(new UserRepository(prisma));
    this.toolOrchestrator = new ToolOrchestrator(prisma, whatsAppProvider);
    this.mediaProcessingService = new MediaProcessingService();
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
          type: message.type,
          text: message.text,
          mediaUrl: message.mediaUrl,
          mimeType: message.mimeType,
          from: message.from,
          timestamp: message.timestamp,
        }),
      },
    });

    logger.info('Incoming message processed', {
      userId: user.id,
      from: message.from,
      messageType: message.type,
      textLength: message.text?.length || 0,
      hasMedia: !!message.mediaUrl,
    });

    // Handle media messages
    if (message.type !== 'text') {
      if (!message.mediaUrl || !message.mimeType) {
        return {
          text: 'Invalid media message received. Please try again.',
          type: 'invalid_media',
          toolName: undefined,
          args: undefined,
        };
      }

      logger.info('Processing media message', {
        userId: user.id,
        type: message.type,
        mimeType: message.mimeType,
      });

      const mediaResult = await this.mediaProcessingService.processMedia(
        message.mediaUrl,
        message.mimeType,
        message.text, // Caption text if any
        user.id // Pass userId for logging
      );

      if (!mediaResult.success || !mediaResult.text) {
        return {
          text: mediaResult.error || 'Failed to process media. Please try again.',
          type: 'media_processing_error',
          toolName: undefined,
          args: undefined,
        };
      }

      // Route the processed text through AI orchestrator for automatic meal logging
      logger.info('Routing processed media text through AI orchestrator', {
        userId: user.id,
        messageType: message.type,
        processedTextLength: mediaResult.text.length,
      });

      // Build user context for AI
      const context: UserContext = {
        goal: preferences?.goal as Goal | undefined,
        tone: preferences?.tone as Tone | undefined,
        reportTime: preferences?.reportTime,
        focus: preferences?.focus ? JSON.parse(preferences.focus) : undefined,
      };

      // Route processed text using AI orchestrator
      const orchestratorResult = await routeMessage(mediaResult.text, context);
      
      let responseText: string;
      let responseType: string;

      if (orchestratorResult.type === 'tool' && orchestratorResult.toolName && orchestratorResult.args) {
        // Handle tool execution
        const { toolName, args } = orchestratorResult;
        
        logger.info('Executing tool for media text', { toolName, args });

        const toolResult = await this.toolOrchestrator.executeTool(toolName, args, user.id, message.timestamp, user);
        responseText = toolResult.text;
        responseType = toolResult.type;
      } else {
        // Direct text response from AI
        responseText = orchestratorResult.text || `Thanks! I received your ${message.type} message: ${mediaResult.text}`;
        responseType = 'media_processed';
      }

      return {
        text: responseText,
        type: responseType,
        toolName: orchestratorResult.toolName,
        args: orchestratorResult.args,
      };
    }

    // Handle text messages
    if (!message.text) {
      return {
        text: 'Empty message received. Please send a text message.',
        type: 'empty_message',
        toolName: undefined,
        args: undefined,
      };
    }

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