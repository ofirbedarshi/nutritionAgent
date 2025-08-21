import { MediaProcessingService } from '../../src/modules/media/MediaProcessingService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock config
jest.mock('../../src/config', () => ({
  config: {
    twilio: {
      accountSid: 'test-account-sid',
      authToken: 'test-auth-token',
    },
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

describe('MediaProcessingService', () => {
  let service: MediaProcessingService;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new MediaProcessingService();
    mockFetch.mockClear();
  });

  describe('downloadMedia', () => {
    it('should download media successfully', async () => {
      const testData = 'test-image-data';
      const testBuffer = Buffer.from(testData);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(testBuffer.buffer),
      } as Response);

      const result = await service.downloadMedia('https://api.twilio.com/test-media-url');

      expect(mockFetch).toHaveBeenCalledWith('https://api.twilio.com/test-media-url', {
        headers: {
          'Authorization': 'Basic dGVzdC1hY2NvdW50LXNpZDp0ZXN0LWF1dGgtdG9rZW4=',
        },
      });
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle download failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(service.downloadMedia('https://api.twilio.com/invalid-url'))
        .rejects.toThrow('Failed to download media: 404 Not Found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.downloadMedia('https://api.twilio.com/test-url'))
        .rejects.toThrow('Network error');
    });
  });

  describe('processImage', () => {
    it('should process image with caption using Vision API', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const caption = 'This is my lunch';
      const expectedDescription = 'Detailed meal description: 1 medium grilled chicken breast (skinless, seasoned), 3/4 cup steamed broccoli florets, 1/2 cup brown rice, 1 tablespoon olive oil drizzle, fresh herbs garnish. Appears home-cooked, healthy preparation.';

      // Mock the VisionAnalyzer
      const mockVisionAnalyzer = {
        analyzeFood: jest.fn().mockResolvedValue({
          success: true,
          description: expectedDescription,
        }),
      };

      // Replace the visionAnalyzer with our mock
      (service as any).visionAnalyzer = mockVisionAnalyzer;

      const result = await service.processImage(imageBuffer, caption);

      expect(mockVisionAnalyzer.analyzeFood).toHaveBeenCalledWith(imageBuffer, caption);
      expect(result.success).toBe(true);
      expect(result.text).toBe(expectedDescription);
    });

    it('should handle Vision API failure gracefully', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const caption = 'This is my lunch';

      // Mock the VisionAnalyzer to fail
      const mockVisionAnalyzer = {
        analyzeFood: jest.fn().mockResolvedValue({
          success: false,
          error: 'Vision API error',
        }),
      };

      (service as any).visionAnalyzer = mockVisionAnalyzer;

      const result = await service.processImage(imageBuffer, caption);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Image received with caption: "This is my lunch"');
    });
  });

  describe('processVoice', () => {
    it('should process voice message using Whisper API', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      const expectedTranscription = 'אכלתי עוף עם ירקות לארוחת צהריים';
      const userId = 'test-user-123';

      // Mock the WhisperTranscriber
      const mockWhisperTranscriber = {
        transcribeVoice: jest.fn().mockResolvedValue({
          success: true,
          rawText: expectedTranscription,
          cleanText: expectedTranscription,
          language: 'he',
        }),
      };

      // Replace the whisperTranscriber with our mock
      (service as any).whisperTranscriber = mockWhisperTranscriber;

      const result = await service.processVoice(audioBuffer, userId);

      expect(mockWhisperTranscriber.transcribeVoice).toHaveBeenCalledWith(audioBuffer, {
        userId,
        mime: 'audio/ogg',
      });
      expect(result.success).toBe(true);
      expect(result.text).toBe(expectedTranscription);
    });

    it('should handle Whisper API failure gracefully', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      const userId = 'test-user-123';

      // Mock the WhisperTranscriber to fail
      const mockWhisperTranscriber = {
        transcribeVoice: jest.fn().mockResolvedValue({
          success: false,
          error: 'Whisper API error',
        }),
      };

      (service as any).whisperTranscriber = mockWhisperTranscriber;

      const result = await service.processVoice(audioBuffer, userId);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Voice message received - transcription temporarily unavailable');
    });

    it('should use cleanText when available', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      const rawText = 'אכלתי עוף עם ירקות לארוחת צהריים';
      const cleanText = 'אכלתי עוף עם ירקות';
      const userId = 'test-user-123';

      // Mock the WhisperTranscriber
      const mockWhisperTranscriber = {
        transcribeVoice: jest.fn().mockResolvedValue({
          success: true,
          rawText,
          cleanText,
          language: 'he',
        }),
      };

      (service as any).whisperTranscriber = mockWhisperTranscriber;

      const result = await service.processVoice(audioBuffer, userId);

      expect(result.success).toBe(true);
      expect(result.text).toBe(cleanText);
    });
  });

  describe('processMedia', () => {
    beforeEach(() => {
      const testBuffer = Buffer.from('test-data');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(testBuffer.buffer),
      } as Response);
    });

    it('should process image media', async () => {
      const result = await service.processMedia(
        'https://api.twilio.com/image.jpg',
        'image/jpeg',
        'My food photo'
      );

      expect(result.success).toBe(true);
      expect(result.text).toBe('Image received with caption: "My food photo"');
    });

    it('should process voice media', async () => {
      const userId = 'test-user-123';
      const result = await service.processMedia(
        'https://api.twilio.com/audio.ogg',
        'audio/ogg',
        undefined, // caption
        userId
      );

      expect(result.success).toBe(true);
      expect(result.text).toBe('Voice message received - transcription temporarily unavailable');
    });

    it('should handle unsupported media types', async () => {
      const result = await service.processMedia(
        'https://api.twilio.com/video.mp4',
        'video/mp4'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported media type: video/mp4');
    });

    it('should handle download errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      } as Response);

      const result = await service.processMedia(
        'https://api.twilio.com/error.jpg',
        'image/jpeg'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to download media: 500 Server Error');
    });
  });
}); 