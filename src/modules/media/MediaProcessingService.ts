/**
 * Media processing service for handling images and voice messages
 */
import { logger } from '../../lib/logger';
import { config } from '../../config';
import { VisionAnalyzer } from './VisionAnalyzer';
import { WhisperTranscriber } from './WhisperTranscriber';

export interface MediaProcessingResult {
  success: boolean;
  text?: string;        // Extracted text (description or transcription)
  error?: string;
}

export class MediaProcessingService {
  private visionAnalyzer: VisionAnalyzer;
  private whisperTranscriber: WhisperTranscriber;

  constructor() {
    this.visionAnalyzer = new VisionAnalyzer();
    this.whisperTranscriber = new WhisperTranscriber();
  }

  /**
   * Download media file from Twilio URL
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      logger.info('[MediaProcessingService] Downloading media', { mediaUrl });

      // Twilio media URLs require authentication
      const auth = Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString('base64');
      
      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download media: ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      
      logger.info('[MediaProcessingService] Media downloaded successfully', {
        mediaUrl,
        size: buffer.length,
      });

      return buffer;
    } catch (error) {
      logger.error('[MediaProcessingService] Failed to download media', {
        error,
        mediaUrl,
      });
      throw error;
    }
  }

  /**
   * Process image using OpenAI Vision
   */
  async processImage(imageBuffer: Buffer, caption?: string): Promise<MediaProcessingResult> {
    try {
      logger.info('[MediaProcessingService] Processing image with Vision API', {
        size: imageBuffer.length,
        hasCaption: !!caption,
      });

      // Use OpenAI Vision to analyze the food image
      const visionResult = await this.visionAnalyzer.analyzeFood(imageBuffer, caption);

      if (!visionResult.success) {
        logger.warn('[MediaProcessingService] Vision analysis failed, falling back to basic response', {
          error: visionResult.error,
        });

        return {
          success: true,
          text: caption 
            ? `Image received with caption: "${caption}"`
            : 'Image received - analysis temporarily unavailable',
        };
      }

      logger.info('[MediaProcessingService] Image processed successfully with Vision API', {
        descriptionLength: visionResult.description?.length,
      });

      return {
        success: true,
        text: visionResult.description,
      };
    } catch (error) {
      logger.error('[MediaProcessingService] Failed to process image', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process voice message using OpenAI Whisper
   */
  async processVoice(audioBuffer: Buffer, userId?: string): Promise<MediaProcessingResult> {
    try {
      logger.info('[MediaProcessingService] Processing voice message with Whisper API', {
        size: audioBuffer.length,
        userId,
      });

      // Use OpenAI Whisper to transcribe the voice message
      const whisperResult = await this.whisperTranscriber.transcribeVoice(audioBuffer, {
        userId,
        mime: 'audio/ogg', // Default for WhatsApp voice messages
      });

      if (!whisperResult.success) {
        logger.warn('[MediaProcessingService] Whisper transcription failed, falling back to basic response', {
          error: whisperResult.error,
          userId,
        });

        return {
          success: true,
          text: 'Voice message received - transcription temporarily unavailable',
        };
      }

      logger.info('[MediaProcessingService] Voice message processed successfully with Whisper API', {
        rawTextLength: whisperResult.rawText?.length,
        cleanTextLength: whisperResult.cleanText?.length,
        language: whisperResult.language,
        userId,
      });

      return {
        success: true,
        text: whisperResult.cleanText || whisperResult.rawText,
      };
    } catch (error) {
      logger.error('[MediaProcessingService] Failed to process voice', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process media based on type
   */
  async processMedia(mediaUrl: string, mimeType: string, caption?: string, userId?: string): Promise<MediaProcessingResult> {
    try {
      const buffer = await this.downloadMedia(mediaUrl);

      if (mimeType.startsWith('image/')) {
        return await this.processImage(buffer, caption);
      } else if (mimeType.startsWith('audio/')) {
        return await this.processVoice(buffer, userId);
      } else {
        return {
          success: false,
          error: `Unsupported media type: ${mimeType}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
} 