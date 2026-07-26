import OpenAI from 'openai';
import {
  composePrompt,
  type ModelConnector,
  type ModelInvokeRequest,
  type ModelInvokeResult,
} from './ModelConnector.js';

export class OpenAIConnector implements ModelConnector {
  readonly provider = 'openai';
  readonly isMock = false;
  private readonly client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI(baseURL ? { apiKey, baseURL } : { apiKey });
  }

  async invoke(request: ModelInvokeRequest): Promise<ModelInvokeResult> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (request.settings.system) {
      messages.push({ role: 'system', content: request.settings.system });
    }
    messages.push({ role: 'user', content: composePrompt(request) });

    const response = await this.client.chat.completions.create({
      model: request.model,
      messages,
      temperature: request.settings.temperature ?? 0.7,
      max_tokens: request.settings.max_tokens ?? 1024,
    });

    return {
      text: response.choices[0]?.message?.content ?? '',
      raw: response,
      usage: {
        input_tokens: response.usage?.prompt_tokens,
        output_tokens: response.usage?.completion_tokens,
      },
    };
  }
}
