import {
  composePrompt,
  type ModelConnector,
  type ModelInvokeRequest,
  type ModelInvokeResult,
} from './ModelConnector.js';

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
};

/** Google Gemini via the Generative Language REST API. */
export class GeminiConnector implements ModelConnector {
  readonly provider = 'gemini';
  readonly isMock = false;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
  ) {}

  async invoke(request: ModelInvokeRequest): Promise<ModelInvokeResult> {
    const url = `${request.settings.base_url ?? this.baseUrl}/models/${request.model}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: composePrompt(request) }] }],
        ...(request.settings.system
          ? { systemInstruction: { parts: [{ text: request.settings.system }] } }
          : {}),
        generationConfig: {
          temperature: request.settings.temperature ?? 0.7,
          maxOutputTokens: request.settings.max_tokens ?? 1024,
        },
      }),
    });

    const payload = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      throw new Error(`Gemini request failed (${response.status}): ${payload.error?.message ?? 'unknown error'}`);
    }

    const text =
      payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';

    return {
      text,
      raw: payload,
      usage: {
        input_tokens: payload.usageMetadata?.promptTokenCount,
        output_tokens: payload.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}
