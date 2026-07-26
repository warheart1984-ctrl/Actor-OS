import { createHash } from 'node:crypto';
import {
  composePrompt,
  type ModelConnector,
  type ModelInvokeRequest,
  type ModelInvokeResult,
} from './ModelConnector.js';

/**
 * Deterministic stand-in used when a provider has no API key configured.
 * It produces synthetic text so the studio, lineage, and chains stay runnable
 * without credentials. Output is clearly labelled as mock.
 */
export class MockConnector implements ModelConnector {
  readonly isMock = true;

  constructor(readonly provider: string) {}

  async invoke(request: ModelInvokeRequest): Promise<ModelInvokeResult> {
    const prompt = composePrompt(request);
    const fingerprint = createHash('sha256').update(prompt).digest('hex').slice(0, 8);
    const excerpt = prompt.length > 240 ? `${prompt.slice(0, 240)}...` : prompt;
    const text = [
      `[mock:${this.provider}/${request.model}] no API key configured, returning synthetic output.`,
      '',
      `Prompt fingerprint: ${fingerprint}`,
      `Prompt received (${prompt.length} chars):`,
      excerpt,
    ].join('\n');

    return {
      text,
      raw: { mock: true, provider: this.provider, model: request.model, fingerprint },
      usage: { input_tokens: prompt.length, output_tokens: text.length },
    };
  }
}
