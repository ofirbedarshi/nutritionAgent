// Mock OpenAI and toFile
const mockCreate = jest.fn();
const mockToFile = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: mockCreate,
        },
      },
    })),
  };
});

jest.mock('openai/uploads', () => ({
  toFile: mockToFile,
}));

import { WhisperTranscriber } from '../../src/modules/media/WhisperTranscriber';

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('WhisperTranscriber', () => {
  let transcriber: WhisperTranscriber;

  beforeEach(() => {
    transcriber = new WhisperTranscriber();
    mockCreate.mockClear();
    mockToFile.mockClear();
    
    // Mock toFile to return a file-like object
    mockToFile.mockResolvedValue({
      name: 'voice-message.ogg',
      type: 'audio/ogg',
      size: 1024,
    });
  });

  describe('transcribeVoice', () => {
    it('should transcribe voice message successfully with Hebrew default', async () => {
      const audioBuffer = Buffer.alloc(4096, 'fake-audio-data'); // 4KB buffer
      const expectedTranscription = 'אכלתי סלט עם עוף לארוחת צהריים';

      mockCreate.mockResolvedValue(expectedTranscription);

      const result = await transcriber.transcribeVoice(audioBuffer);

      expect(mockToFile).toHaveBeenCalledWith(audioBuffer, 'voice-message.ogg', { type: 'audio/ogg' });
      expect(mockCreate).toHaveBeenCalledWith({
        file: expect.any(Object),
        model: 'whisper-1',
        language: 'he',
        response_format: 'text',
      }, {
        signal: expect.any(AbortSignal),
      });

      expect(result.success).toBe(true);
      expect(result.rawText).toBe(expectedTranscription);
      expect(result.cleanText).toBe(expectedTranscription);
      expect(result.language).toBe('he');
    });

    it('should use custom options when provided', async () => {
      const audioBuffer = Buffer.alloc(4096, 'fake-audio-data'); // 4KB buffer
      const expectedTranscription = 'I had grilled chicken with vegetables for lunch';

      mockCreate.mockResolvedValue(expectedTranscription);

      const result = await transcriber.transcribeVoice(audioBuffer, {
        filename: 'custom.ogg',
        mime: 'audio/opus',
        language: 'en',
        timeoutMs: 5000,
        userId: 'test-user-123',
      });

      expect(mockToFile).toHaveBeenCalledWith(audioBuffer, 'custom.ogg', { type: 'audio/opus' });
      expect(mockCreate).toHaveBeenCalledWith({
        file: expect.any(Object),
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
      }, {
        signal: expect.any(AbortSignal),
      });

      expect(result.success).toBe(true);
      expect(result.rawText).toBe(expectedTranscription);
      expect(result.language).toBe('en');
    });

    it('should handle OpenAI API errors', async () => {
      const audioBuffer = Buffer.alloc(4096, 'fake-audio-data'); // 4KB buffer
      const apiError = new Error('OpenAI API error');

      mockCreate.mockRejectedValue(apiError);

      const result = await transcriber.transcribeVoice(audioBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI API error');
    });

    it('should handle empty response from OpenAI', async () => {
      const audioBuffer = Buffer.alloc(4096, 'fake-audio-data'); // 4KB buffer

      mockCreate.mockResolvedValue('');

      const result = await transcriber.transcribeVoice(audioBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty transcription returned from OpenAI Whisper');
    });

    it('should reject audio file that is too small', async () => {
      const audioBuffer = Buffer.from('x'); // Very small buffer

      const result = await transcriber.transcribeVoice(audioBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Audio file too small');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should reject audio file that is too large', async () => {
      const audioBuffer = Buffer.alloc(10000000); // 10MB buffer

      const result = await transcriber.transcribeVoice(audioBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Audio file too large');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should reject unsupported MIME types', async () => {
      const audioBuffer = Buffer.alloc(4096, 'fake-audio-data'); // 4KB buffer

      const result = await transcriber.transcribeVoice(audioBuffer, {
        mime: 'video/mp4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported audio format');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should handle timeout', async () => {
      const audioBuffer = Buffer.alloc(4096, 'fake-audio-data'); // 4KB buffer

      // Mock a timeout by making the API call hang
      mockCreate.mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => {
          const abortError = new Error('AbortError');
          abortError.name = 'AbortError';
          reject(abortError);
        }, 100);
      }));

      const result = await transcriber.transcribeVoice(audioBuffer, {
        timeoutMs: 50, // Short timeout
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transcription timeout');
    });

    it('should reject non-Hebrew content when language is Hebrew', async () => {
      const audioBuffer = Buffer.alloc(4096, 'fake-audio-data'); // 4KB buffer

      mockCreate.mockResolvedValue('This is English text');

      const result = await transcriber.transcribeVoice(audioBuffer, {
        language: 'he',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty/invalid transcription');
    });

    it('should accept Hebrew content when language is Hebrew', async () => {
      const audioBuffer = Buffer.alloc(4096, 'fake-audio-data'); // 4KB buffer
      const hebrewText = 'אכלתי סלט עם עוף';

      mockCreate.mockResolvedValue(hebrewText);

      const result = await transcriber.transcribeVoice(audioBuffer, {
        language: 'he',
      });

      expect(result.success).toBe(true);
      expect(result.rawText).toBe(hebrewText);
    });
  });

  describe('hasMeaningfulSpeech', () => {
    it('should return true for Hebrew speech with meaningful words', () => {
      const transcript = 'אכלתי סלט עם עוף לארוחת צהריים';
      const result = transcriber.hasMeaningfulSpeech(transcript);
      expect(result).toBe(true);
    });

    it('should return true for English speech with meaningful words', () => {
      const transcript = 'I had food for lunch today';
      const result = transcriber.hasMeaningfulSpeech(transcript);
      expect(result).toBe(true);
    });

    it('should return false for empty transcript', () => {
      const result = transcriber.hasMeaningfulSpeech('');
      expect(result).toBe(false);
    });

    it('should return false for undefined transcript', () => {
      const result = transcriber.hasMeaningfulSpeech(undefined);
      expect(result).toBe(false);
    });

    it('should return false for transcript with insufficient meaningful words', () => {
      const transcript = '... ... ...';
      const result = transcriber.hasMeaningfulSpeech(transcript);
      expect(result).toBe(false);
    });

    it('should return true for nutrition-related Hebrew words', () => {
      const transcript = 'אכלתי ארוחת בוקר עם לחם';
      const result = transcriber.hasMeaningfulSpeech(transcript);
      expect(result).toBe(true);
    });

    it('should return true for nutrition-related English words', () => {
      const transcript = 'I ate lunch and dinner';
      const result = transcriber.hasMeaningfulSpeech(transcript);
      expect(result).toBe(true);
    });
  });

  describe('static properties', () => {
    it('should have correct default values', () => {
      expect(WhisperTranscriber.MODEL).toBe('whisper-1');
      expect(WhisperTranscriber.DEFAULT_LANG).toBe('he');
      expect(WhisperTranscriber.DEFAULT_TIMEOUT).toBe(10000);
      expect(WhisperTranscriber.MAX_AUDIO_BYTES).toBe(8000000);
      expect(WhisperTranscriber.MIN_AUDIO_BYTES).toBe(2048);
    });
  });
}); 