import {
  composePrompt,
  type ModelConnector,
  type ModelInvokeRequest,
  type ModelInvokeResult,
} from './ModelConnector.js';

type OllamaResponse = {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
};

/** Local models served by Ollama (`/api/chat`). No API key required. */
export class LocalConnector implements ModelConnector {
  readonly provider = 'ollama';
  readonly isMock = false;

  constructor(private readonly baseUrl = 'http://localhost:11434') {}

  async invoke(request: ModelInvokeRequest): Promise<ModelInvokeResult> {
    const base = (request.settings.base_url ?? this.baseUrl).replace(/\/$/, '');
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (request.settings.system) {
      messages.push({ role: 'system', content: request.settings.system });
    }
    messages.push({ role: 'user', content: composePrompt(request) });

    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages,
        stream: false,
        options: {
          temperature: request.settings.temperature ?? 0.7,
          num_predict: request.settings.max_tokens ?? 1024,
        },
      }),
    });

    const payload = (await response.json()) as OllamaResponse;
    if (!response.ok) {
      throw new Error(`Ollama request failed (${response.status}): ${payload.error ?? 'unknown error'}`);
    }

    return {
      text: payload.message?.content ?? '',
      raw: payload,
      usage: {
        input_tokens: payload.prompt_eval_count,
        output_tokens: payload.eval_count,
      },
    };
  }
}
