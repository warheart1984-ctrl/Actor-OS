import { AnthropicConnector } from './AnthropicConnector.js';
import { GeminiConnector } from './GeminiConnector.js';
import { LemonadeConnector } from './LemonadeConnector.js';
import { LocalConnector } from './LocalConnector.js';
import { MockConnector } from './MockConnector.js';
import { OpenAICompatibleConnector } from './OpenAICompatibleConnector.js';
import { OpenAIConnector } from './OpenAIConnector.js';
import type { ModelConnector } from './ModelConnector.js';

export type ConnectorRegistry = Record<string, ModelConnector>;

export const SUPPORTED_PROVIDERS = [
  'openai',
  'anthropic',
  'gemini',
  'mistral',
  'ollama',
  'lemonade',
  'mock',
] as const;

/**
 * Builds one connector per provider. When a provider has no credentials, a
 * MockConnector is registered in its place so the studio stays runnable; the
 * substitution is reported through `describeRegistry()` and the health route.
 */
export function buildConnectorRegistry(env: NodeJS.ProcessEnv = process.env): ConnectorRegistry {
  const registry: ConnectorRegistry = {
    mock: new MockConnector('mock'),
  };

  registry['openai'] = env['OPENAI_API_KEY']
    ? new OpenAIConnector(env['OPENAI_API_KEY'], env['OPENAI_BASE_URL'])
    : new MockConnector('openai');

  registry['anthropic'] = env['ANTHROPIC_API_KEY']
    ? new AnthropicConnector(env['ANTHROPIC_API_KEY'])
    : new MockConnector('anthropic');

  registry['gemini'] = env['GEMINI_API_KEY']
    ? new GeminiConnector(env['GEMINI_API_KEY'], env['GEMINI_BASE_URL'])
    : new MockConnector('gemini');

  registry['mistral'] = env['MISTRAL_API_KEY']
    ? new OpenAICompatibleConnector(
        'mistral',
        env['MISTRAL_API_KEY'],
        env['MISTRAL_BASE_URL'] ?? 'https://api.mistral.ai/v1',
      )
    : new MockConnector('mistral');

  // Ollama is local and unauthenticated; opt in explicitly so a missing daemon
  // does not turn every local task into a connection error.
  registry['ollama'] =
    env['OLLAMA_ENABLED'] === 'true'
      ? new LocalConnector(env['OLLAMA_BASE_URL'])
      : new MockConnector('ollama');

  // Lemonade — local AI server (LLM, TTS, image gen)
  registry['lemonade'] =
    env['LEMONADE_ENABLED'] === 'true'
      ? new LemonadeConnector(
          env['LEMONADE_API_KEY'] ?? 'lemonade',
          env['LEMONADE_BASE_URL'] ?? 'http://127.0.0.1:13307/v1',
        )
      : new MockConnector('lemonade');

  return registry;
}

export type ConnectorStatus = {
  provider: string;
  live: boolean;
};

export function describeRegistry(registry: ConnectorRegistry): ConnectorStatus[] {
  return Object.entries(registry)
    .filter(([provider]) => provider !== 'mock')
    .map(([provider, connector]) => ({ provider, live: !connector.isMock }));
}
