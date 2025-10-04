import { z } from 'zod';

// ElevenLabs API response schemas
const ElevenLabsVoicesResponseSchema = z.object({
  voices: z.array(
    z.object({
      voice_id: z.string(),
      name: z.string(),
      category: z.string(),
    })
  ),
});

// Configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = 'ErXwobaYiN019PkySvjV'; // Default voice ID from ElevenLabs
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface ElevenLabsConfig {
  apiKey: string;
  maxRetries?: number;
  retryDelay?: number;
  defaultVoiceId?: string;
}

export interface SpeakOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export class ElevenLabsClient {
  private config: Required<ElevenLabsConfig>;

  constructor(config: ElevenLabsConfig) {
    this.config = {
      apiKey: config.apiKey,
      maxRetries: config.maxRetries || MAX_RETRIES,
      retryDelay: config.retryDelay || RETRY_DELAY_MS,
      defaultVoiceId: config.defaultVoiceId || DEFAULT_VOICE_ID,
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit,
    attempt = 1
  ): Promise<Response> {
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}${endpoint}`, {
        ...options,
        headers: {
          'xi-api-key': this.config.apiKey,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(
          `ElevenLabs API error: ${response.status} ${response.statusText}`
        );
      }

      return response;
    } catch (error) {
      if (attempt <= this.config.maxRetries) {
        console.warn(
          `ElevenLabs request attempt ${attempt} failed, retrying...`,
          error
        );
        await this.delay(this.config.retryDelay * attempt);
        return this.makeRequest(endpoint, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Convert text to speech and return audio buffer
   */
  async textToSpeech(
    text: string,
    options: SpeakOptions = {}
  ): Promise<ArrayBuffer> {
    const voiceId = options.voiceId || this.config.defaultVoiceId;

    const requestBody = {
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: options.stability || 0.5,
        similarity_boost: options.similarityBoost || 0.8,
        style: options.style || 0.0,
        use_speaker_boost: options.useSpeakerBoost || true,
      },
    };

    const response = await this.makeRequest(`/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(requestBody),
    });

    return response.arrayBuffer();
  }

  /**
   * Stream text to speech for real-time playback
   */
  async textToSpeechStream(
    text: string,
    options: SpeakOptions = {}
  ): Promise<ReadableStream<Uint8Array>> {
    const voiceId = options.voiceId || this.config.defaultVoiceId;

    const requestBody = {
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: options.stability || 0.5,
        similarity_boost: options.similarityBoost || 0.8,
        style: options.style || 0.0,
        use_speaker_boost: options.useSpeakerBoost || true,
      },
    };

    const response = await this.makeRequest(
      `/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.body) {
      throw new Error('No response body for streaming TTS');
    }

    return response.body;
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<
    { voice_id: string; name: string; category: string }[]
  > {
    const response = await this.makeRequest('/voices', {
      method: 'GET',
    });

    const data = await response.json();
    const parsed = ElevenLabsVoicesResponseSchema.parse(data);
    return parsed.voices;
  }

  /**
   * Get usage information (character count, etc.)
   */
  async getUsage(): Promise<any> {
    const response = await this.makeRequest('/user', {
      method: 'GET',
    });

    return response.json();
  }
}

// Export convenience functions
export const createElevenLabsClient = (apiKey?: string): ElevenLabsClient => {
  const key = apiKey || process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error('ElevenLabs API key is required');
  }
  return new ElevenLabsClient({ apiKey: key });
};

// Mock client for testing
export class MockElevenLabsClient extends ElevenLabsClient {
  constructor() {
    super({ apiKey: 'mock-key' });
  }

  async textToSpeech(text: string): Promise<ArrayBuffer> {
    // Return a minimal MP3 header for testing
    const mockMp3Header = new Uint8Array([
      0xff,
      0xfb,
      0x90,
      0x00, // MP3 header
      0x00,
      0x00,
      0x00,
      0x00, // Padding
    ]);
    return mockMp3Header.buffer;
  }

  async textToSpeechStream(text: string): Promise<ReadableStream<Uint8Array>> {
    const mockData = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);

    return new ReadableStream({
      start(controller) {
        controller.enqueue(mockData);
        controller.close();
      },
    });
  }

  async getVoices() {
    return [
      {
        voice_id: 'mock-voice-1',
        name: 'Mock Voice',
        category: 'premade',
      },
    ];
  }

  async getUsage() {
    return {
      character_count: 1000,
      character_limit: 10000,
    };
  }
}

// Utility functions for common TTS operations
export const speakText = async (
  text: string,
  client?: ElevenLabsClient,
  options?: SpeakOptions
): Promise<ArrayBuffer> => {
  const ttsClient = client || createElevenLabsClient();
  return ttsClient.textToSpeech(text, options);
};

export const streamSpeech = async (
  text: string,
  client?: ElevenLabsClient,
  options?: SpeakOptions
): Promise<ReadableStream<Uint8Array>> => {
  const ttsClient = client || createElevenLabsClient();
  return ttsClient.textToSpeechStream(text, options);
};
