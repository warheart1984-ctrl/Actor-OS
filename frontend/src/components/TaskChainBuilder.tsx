import { useState } from 'react';
import type { Profile } from '../types';

type ChainStep = { key: string; agentId: string };

type Props = {
  profiles: Profile[];
  disabled: boolean;
  onRunChain: (steps: Array<{ agentId: string }>) => Promise<void>;
};

/**
 * Builds an ordered multi-agent pipeline. Steps can be appended, reordered, and
 * removed; the first step receives the TaskSpec prompt and each later step receives
 * the previous step's output.
 */
export function TaskChainBuilder({ profiles, disabled, onRunChain }: Props) {
  const [steps, setSteps] = useState<ChainStep[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function addStep(agentId: string): void {
    setSteps((previous) => [...previous, { key: crypto.randomUUID(), agentId }]);
  }

  function removeStep(key: string): void {
    setSteps((previous) => previous.filter((step) => step.key !== key));
  }

  function moveStep(from: number, to: number): void {
    setSteps((previous) => {
      if (to < 0 || to >= previous.length) return previous;
      const next = [...previous];
      const [moved] = next.splice(from, 1);
      if (!moved) return previous;
      next.splice(to, 0, moved);
      return next;
    });
  }

  const nameOf = (id: string): string => profiles.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="space-y-3 border-b border-zinc-800 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
          Chain builder
        </h3>
        <span className="text-[10px] text-zinc-600">{steps.length} steps</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => addStep(profile.id)}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-sky-700 hover:text-sky-200"
          >
            + {profile.name}
          </button>
        ))}
      </div>

      {steps.length > 0 ? (
        <ol className="space-y-1.5">
          {steps.map((step, index) => (
            <li
              key={step.key}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) moveStep(dragIndex, index);
                setDragIndex(null);
              }}
              className="flex items-center gap-2 rounded border border-sky-900/60 bg-sky-950/40 px-2 py-1.5"
            >
              <span className="font-mono text-[10px] text-sky-400">#{index}</span>
              <span className="flex-1 truncate text-xs text-zinc-200">{nameOf(step.agentId)}</span>
              <button
                type="button"
                onClick={() => moveStep(index, index - 1)}
                disabled={index === 0}
                className="text-xs text-zinc-500 transition hover:text-zinc-200 disabled:opacity-30"
                aria-label="Move step up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveStep(index, index + 1)}
                disabled={index === steps.length - 1}
                className="text-xs text-zinc-500 transition hover:text-zinc-200 disabled:opacity-30"
                aria-label="Move step down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeStep(step.key)}
                className="text-xs text-rose-500 transition hover:text-rose-300"
                aria-label="Remove step"
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Add agents to build a pipeline, for example draft, then review, then summarize. Drag to
          reorder.
        </p>
      )}

      <button
        type="button"
        onClick={() => void onRunChain(steps.map((step) => ({ agentId: step.agentId })))}
        disabled={disabled || steps.length === 0}
        className="w-full rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        Run chain
      </button>
    </div>
  );
}
