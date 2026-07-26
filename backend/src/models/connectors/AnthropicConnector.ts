import Anthropic from '@anthropic-ai/sdk';
import {
  composePrompt,
  type ModelConnector,
  type ModelInvokeRequest,
  type ModelInvokeResult,
} from './ModelConnector.js';

export class AnthropicConnector implements ModelConnector {
  readonly provider = 'anthropic';
  readonly isMock = false;
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async invoke(request: ModelInvokeRequest): Promise<ModelInvokeResult> {
    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.settings.max_tokens ?? 1024,
      temperature: request.settings.temperature ?? 0.7,
      ...(request.settings.system ? { system: request.settings.system } : {}),
      messages: [{ role: 'user', content: composePrompt(request) }],
    });

    const text = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    return {
      text,
      raw: response,
      usage: {
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
      },
    };
  }
}
