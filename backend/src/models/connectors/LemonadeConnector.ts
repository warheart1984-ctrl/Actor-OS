import { OpenAICompatibleConnector } from './OpenAICompatibleConnector.js';

/**
 * Lemonade local AI — exposes OpenAI-compatible chat completions.
 * Used for TTS (kokoro-v1), image gen (SD-Turbo), and LLM (Llama-3.2-1B).
 */
export class LemonadeConnector extends OpenAICompatibleConnector {
  constructor(apiKey: string = 'lemonade', baseUrl: string = 'http://127.0.0.1:13307/v1') {
    super('lemonade', apiKey, baseUrl);
  }
}
