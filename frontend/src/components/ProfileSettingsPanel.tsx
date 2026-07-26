import { useEffect, useState } from 'react';
import type { ModelBinding, Profile, ProfileSettings } from '../types';

type Props = {
  profile: Profile;
  onSave: (input: {
    role?: string;
    binding?: ModelBinding;
    settings_json?: ProfileSettings;
  }) => Promise<void>;
};

const CONNECTORS = ['openai', 'anthropic', 'gemini', 'mistral', 'ollama', 'mock'];

export function ProfileSettingsPanel({ profile, onSave }: Props) {
  const [role, setRole] = useState(profile.role ?? '');
  const [connector, setConnector] = useState(profile.binding?.connector ?? 'openai');
  const [model, setModel] = useState(profile.binding?.model ?? '');
  const [temperature, setTemperature] = useState(String(profile.settings_json.temperature ?? 0.7));
  const [maxTokens, setMaxTokens] = useState(String(profile.settings_json.max_tokens ?? 1024));
  const [system, setSystem] = useState(profile.settings_json.system ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRole(profile.role ?? '');
    setConnector(profile.binding?.connector ?? 'openai');
    setModel(profile.binding?.model ?? profile.model_type.split(':')[1] ?? '');
    setTemperature(String(profile.settings_json.temperature ?? 0.7));
    setMaxTokens(String(profile.settings_json.max_tokens ?? 1024));
    setSystem(profile.settings_json.system ?? '');
    setSaved(false);
  }, [profile]);

  async function save(): Promise<void> {
    const parsedTemperature = Number(temperature);
    const parsedMaxTokens = Number(maxTokens);
    await onSave({
      role,
      binding: { connector, model },
      settings_json: {
        ...profile.settings_json,
        ...(Number.isFinite(parsedTemperature) ? { temperature: parsedTemperature } : {}),
        ...(Number.isFinite(parsedMaxTokens) ? { max_tokens: parsedMaxTokens } : {}),
        system,
      },
    });
    setSaved(true);
  }

  const field =
    'w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 focus:border-amber-500/60 focus:outline-none';
  const label = 'text-[10px] font-semibold tracking-widest text-zinc-500 uppercase';

  return (
    <div className="space-y-3 border-t border-zinc-800 p-4">
      <h3 className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
        Agent settings
      </h3>

      <div className="space-y-1">
        <label className={label}>Role</label>
        <input value={role} onChange={(event) => setRole(event.target.value)} className={field} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={label}>Connector</label>
          <select
            value={connector}
            onChange={(event) => setConnector(event.target.value)}
            className={field}
          >
            {CONNECTORS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={label}>Model</label>
          <input
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className={`${field} font-mono`}
            placeholder="gpt-4.1"
          />
        </div>
      </div>
      <p className="text-[10px] leading-relaxed text-zinc-600">
        Swap connector or model without changing this agent&apos;s identity or lineage.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={label}>Temperature</label>
          <input
            value={temperature}
            onChange={(event) => setTemperature(event.target.value)}
            className={field}
          />
        </div>
        <div className="space-y-1">
          <label className={label}>Max tokens</label>
          <input
            value={maxTokens}
            onChange={(event) => setMaxTokens(event.target.value)}
            className={field}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className={label}>System prompt</label>
        <textarea
          value={system}
          onChange={(event) => setSystem(event.target.value)}
          rows={3}
          className={`${field} resize-y leading-relaxed`}
        />
      </div>

      <button
        type="button"
        onClick={() => void save()}
        className="w-full rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500"
      >
        {saved ? 'Saved' : 'Save settings'}
      </button>
    </div>
  );
}
