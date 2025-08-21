/**
 * OpenAI Whisper transcriber for voice message transcription
 */
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { logger } from '../../lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionOpts {
  filename?: string;
  mime?: string;
  language?: string; // default from env
  timeoutMs?: number;
  userId?: string; // for logging
}

export interface TranscriptionResult {
  success: boolean;
  rawText?: string;
  cleanText?: string;
  language?: string;
  error?: string;
}

export class WhisperTranscriber {
  static readonly MODEL = 'whisper-1';
  static readonly DEFAULT_LANG = process.env.DEFAULT_WHISPER_LANG || 'he';
  static readonly DEFAULT_TIMEOUT = Number(process.env.WHISPER_TIMEOUT_MS || 10000);
  static readonly MAX_AUDIO_BYTES = Number(process.env.MAX_AUDIO_BYTES || 8000000);
  static readonly MIN_AUDIO_BYTES = 2048; // 2KB minimum

  private static readonly SUPPORTED_MIME_TYPES = [
    'audio/ogg',
    'audio/opus', 
    'audio/m4a',
    'audio/mp4',
    'audio/wav',
    'audio/mpeg',
    'audio/mp3'
  ];

  /**
   * Transcribe voice message to text
   */
  async transcribeVoice(audioBuffer: Buffer, opts?: TranscriptionOpts): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const filename = opts?.filename || 'voice-message.ogg';
    const mimeType = opts?.mime || 'audio/ogg';
    const language = opts?.language || WhisperTranscriber.DEFAULT_LANG;
    const timeoutMs = opts?.timeoutMs || WhisperTranscriber.DEFAULT_TIMEOUT;
    const userId = opts?.userId;

    try {
      // Log transcription attempt with metadata
      logger.info('[WhisperTranscriber] Starting voice transcription', {
        audioSize: audioBuffer.length,
        filename,
        mimeType,
        language,
        userId,
        timeoutMs,
      });

      // Size validation
      if (audioBuffer.length < WhisperTranscriber.MIN_AUDIO_BYTES) {
        const error = `Audio file too small (${audioBuffer.length} bytes). Minimum size is ${WhisperTranscriber.MIN_AUDIO_BYTES} bytes.`;
        logger.warn('[WhisperTranscriber] Audio file too small', {
          audioSize: audioBuffer.length,
          minSize: WhisperTranscriber.MIN_AUDIO_BYTES,
          userId,
        });
        return {
          success: false,
          error,
        };
      }

      if (audioBuffer.length > WhisperTranscriber.MAX_AUDIO_BYTES) {
        const error = `Audio file too large (${audioBuffer.length} bytes). Maximum size is ${WhisperTranscriber.MAX_AUDIO_BYTES} bytes.`;
        logger.warn('[WhisperTranscriber] Audio file too large', {
          audioSize: audioBuffer.length,
          maxSize: WhisperTranscriber.MAX_AUDIO_BYTES,
          userId,
        });
        return {
          success: false,
          error,
        };
      }

      // MIME type validation
      if (!WhisperTranscriber.SUPPORTED_MIME_TYPES.includes(mimeType)) {
        const error = `Unsupported audio format: ${mimeType}. Supported formats: ${WhisperTranscriber.SUPPORTED_MIME_TYPES.join(', ')}`;
        logger.warn('[WhisperTranscriber] Unsupported MIME type', {
          mimeType,
          supportedTypes: WhisperTranscriber.SUPPORTED_MIME_TYPES,
          userId,
        });
        return {
          success: false,
          error,
        };
      }

      // Create file using OpenAI's toFile helper
      const file = await toFile(audioBuffer, filename, { type: mimeType });

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await openai.audio.transcriptions.create({
          file,
          model: WhisperTranscriber.MODEL,
          language,
          response_format: 'text',
        }, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const rawText = response.trim();
        const cleanText = rawText; // For now, set cleanText = rawText (we'll add a cleaner later)

        if (!rawText) {
          const error = 'Empty transcription returned from OpenAI Whisper';
          logger.warn('[WhisperTranscriber] Empty transcription', {
            audioSize: audioBuffer.length,
            language,
            userId,
          });
          return {
            success: false,
            error,
          };
        }

        // Language sanity check for Hebrew
        if (language === 'he' && !this.hasHebrewContent(rawText)) {
          const error = 'Empty/invalid transcription';
          logger.warn('[WhisperTranscriber] Non-Hebrew content detected for Hebrew language setting', {
            audioSize: audioBuffer.length,
            language,
            rawText: rawText.substring(0, 100), // Log first 100 chars
            userId,
          });
          return {
            success: false,
            error,
          };
        }

        const duration = Date.now() - startTime;

        logger.info('[WhisperTranscriber] Voice message transcribed successfully', {
          audioSize: audioBuffer.length,
          rawTextLength: rawText.length,
          cleanTextLength: cleanText.length,
          language,
          duration,
          userId,
        });

        return {
          success: true,
          rawText,
          cleanText,
          language,
        };

      } catch (apiError) {
        clearTimeout(timeoutId);
        
        if (apiError instanceof Error && apiError.name === 'AbortError') {
          const error = `Transcription timeout after ${timeoutMs}ms`;
          logger.error('[WhisperTranscriber] Transcription timeout', {
            audioSize: audioBuffer.length,
            timeoutMs,
            userId,
          });
          return {
            success: false,
            error,
          };
        }
        
        throw apiError; // Re-throw to be caught by outer catch
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('[WhisperTranscriber] Failed to transcribe voice message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        audioSize: audioBuffer.length,
        filename,
        mimeType,
        language,
        duration,
        userId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if transcript contains meaningful speech (lightweight heuristic only)
   */
  hasMeaningfulSpeech(transcript?: string): boolean {
    if (!transcript || transcript.trim().length === 0) {
      return false;
    }

    const text = transcript.toLowerCase().trim();
    
    // Hebrew speech indicators
    const hebrewIndicators = [
      'אני', 'אתה', 'את', 'הוא', 'היא', 'אנחנו', 'אתם', 'אתן', 'הם', 'הן',
      'אכלתי', 'אכל', 'אכלה', 'אכלנו', 'אכלתם', 'אכלתן', 'אכלו',
      'אוכל', 'אוכלת', 'אוכלים', 'אוכלות',
      'סלט', 'עוף', 'בשר', 'דג', 'אורז', 'לחם', 'ירקות', 'פירות',
      'בוקר', 'צהריים', 'ערב', 'לילה',
      'ארוחת', 'ארוחה', 'אוכל', 'מזון'
    ];

    // English speech indicators (fallback)
    const englishIndicators = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'is', 'are', 'was', 'were', 'am', 'been',
      'food', 'meal', 'eat', 'hungry', 'lunch', 'dinner', 'breakfast'
    ];

    const words = text.split(/\s+/);
    const meaningfulWords = words.filter(word => 
      word.length > 2 && (
        hebrewIndicators.includes(word) || 
        englishIndicators.includes(word)
      )
    );

    return meaningfulWords.length >= 2; // At least 2 meaningful words
  }

  /**
   * Check if text contains Hebrew content
   */
  private hasHebrewContent(text: string): boolean {
    // Hebrew Unicode range: \u0590-\u05FF
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  }
} 