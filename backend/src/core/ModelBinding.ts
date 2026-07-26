/**
 * Connector ↔ model binding for an agent profile.
 *
 * The agent identity (id, name, role, lineage) is independent of which
 * connector executes it. `model_type` in storage remains the serialized form
 * `connector:model` for schema compatibility.
 */

export type ModelBinding = {
  /** Execution provider / connector id, e.g. "openai", "anthropic". */
  connector: string;
  /** Provider-specific model id, e.g. "gpt-4.1". */
  model: string;
};

export function parseBinding(modelType: string): ModelBinding {
  const separator = modelType.indexOf(':');
  if (separator === -1) {
    return { connector: modelType, model: modelType };
  }
  return {
    connector: modelType.slice(0, separator),
    model: modelType.slice(separator + 1),
  };
}

export function serializeBinding(binding: ModelBinding): string {
  return `${binding.connector}:${binding.model}`;
}

export function bindingEquals(a: ModelBinding, b: ModelBinding): boolean {
  return a.connector === b.connector && a.model === b.model;
}
