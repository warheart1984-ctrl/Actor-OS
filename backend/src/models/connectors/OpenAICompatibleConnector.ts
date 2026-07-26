import {
  composePrompt,
  type ModelConnector,
  type ModelInvokeRequest,
  type ModelInvokeResult,
} from './ModelConnector.js';

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

/**
 * Any provider exposing the OpenAI chat-completions shape - Mistral, Together,
 * vLLM, LM Studio. The provider name and base URL are supplied at construction.
 */
export class OpenAICompatibleConnector implements ModelConnector {
  readonly isMock = false;

  constructor(
    readonly provider: string,
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  async invoke(request: ModelInvokeRequest): Promise<ModelInvokeResult> {
    const base = request.settings.base_url ?? this.baseUrl;
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (request.settings.system) {
      messages.push({ role: 'system', content: request.settings.system });
    }
    messages.push({ role: 'user', content: composePrompt(request) });

    const response = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages,
        temperature: request.settings.temperature ?? 0.7,
        max_tokens: request.settings.max_tokens ?? 1024,
      }),
    });

    const payload = (await response.json()) as ChatCompletionResponse;
    if (!response.ok) {
      throw new Error(
        `${this.provider} request failed (${response.status}): ${payload.error?.message ?? 'unknown error'}`,
      );
    }

    return {
      text: payload.choices?.[0]?.message?.content ?? '',
      raw: payload,
      usage: {
        input_tokens: payload.usage?.prompt_tokens,
        output_tokens: payload.usage?.completion_tokens,
      },
    };
  }
}
