import { useEffect, useState } from 'react';
import type { Artifact, Profile, Task } from '../types';
import { statusStyles } from '../ui';

export type PanelResult = {
  label: string;
  output: string;
  model_type: string;
  is_mock: boolean;
};

type Props = {
  profiles: Profile[];
  activeProfileId: string;
  task: Task | undefined;
  artifacts: Artifact[];
  result: PanelResult | null;
  busy: boolean;
  error: string | null;
  onSaveInput: (input: string) => Promise<void>;
  onRun: () => Promise<void>;
  onSendToAgent: (toProfileId: string, intent: string, content: string) => Promise<void>;
};

const INTENTS = ['refine', 'review', 'fact_check', 'summarize', 'critique'];

export function ActiveContextPanel({
  profiles,
  activeProfileId,
  task,
  artifacts,
  result,
  busy,
  error,
  onSaveInput,
  onRun,
  onSendToAgent,
}: Props) {
  const [draft, setDraft] = useState(task?.input_text ?? '');
  const [target, setTarget] = useState('');
  const [intent, setIntent] = useState(INTENTS[0] as string);

  useEffect(() => {
    setDraft(task?.input_text ?? '');
  }, [task?.id, task?.input_text]);

  useEffect(() => {
    const fallback = profiles.find((profile) => profile.id !== activeProfileId);
    setTarget((current) => (current && current !== activeProfileId ? current : (fallback?.id ?? '')));
  }, [profiles, activeProfileId]);

  if (!task) {
    return (
      <div className="p-6 text-xs leading-relaxed text-zinc-600">
        Select a task, or create one, to see its active context.
      </div>
    );
  }

  const dirty = draft !== task.input_text;
  const sendContent = result?.output ?? draft;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-100">{task.title}</h3>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${statusStyles[task.status]}`}
          >
            {task.status}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{task.id}</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
          Input
        </label>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={6}
          className="w-full resize-y rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm leading-relaxed text-zinc-100 focus:border-amber-500/60 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void onRun()}
            disabled={busy}
            className="flex-1 rounded bg-amber-500 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {busy ? 'Working...' : 'Run with model'}
          </button>
          <button
            type="button"
            onClick={() => void onSaveInput(draft)}
            disabled={!dirty || busy}
            className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded border border-rose-900 bg-rose-950/50 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
              {result.label}
            </span>
            <span className="font-mono text-[10px] text-zinc-600">
              {result.model_type}
              {result.is_mock ? ' (mock)' : ''}
            </span>
          </div>
          <pre className="max-h-64 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-300">
            {result.output}
          </pre>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-zinc-800 pt-4">
        <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
          Send to another agent
        </span>
        <div className="flex gap-2">
          <select
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 focus:border-amber-500/60 focus:outline-none"
          >
            {profiles
              .filter((profile) => profile.id !== activeProfileId)
              .map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
          </select>
          <select
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 focus:border-amber-500/60 focus:outline-none"
          >
            {INTENTS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void onSendToAgent(target, intent, sendContent)}
          disabled={busy || !target || sendContent.trim().length === 0}
          className="w-full rounded border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200 transition hover:bg-amber-900/40 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-transparent disabled:text-zinc-600"
        >
          Hand off {result ? 'latest output' : 'task input'}
        </button>
      </div>

      {artifacts.length > 0 ? (
        <div className="space-y-1.5 border-t border-zinc-800 pt-4">
          <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
            Artifacts ({artifacts.length})
          </span>
          <ul className="space-y-1">
            {artifacts.map((artifact) => (
              <li
                key={artifact.id}
                className="rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1.5 text-[11px] text-zinc-400"
              >
                <span className="text-emerald-300">{artifact.kind}</span>{' '}
                <span className="text-zinc-600">
                  {artifact.content_text.slice(0, 90).replace(/\s+/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
