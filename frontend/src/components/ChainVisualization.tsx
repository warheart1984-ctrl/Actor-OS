import type { LineageEvent, Profile } from '../types';

type Props = {
  events: LineageEvent[];
  profiles: Profile[];
};

/** Renders the ordered model pipeline recorded as `chain_step` lineage events. */
export function ChainVisualization({ events, profiles }: Props) {
  const steps = events
    .filter((event) => event.event_type === 'chain_step')
    .map((event) => ({
      index: typeof event.payload_json['step'] === 'number' ? (event.payload_json['step'] as number) : 0,
      profileId: event.profile_id ?? '',
      modelType: String(event.payload_json['model_type'] ?? ''),
    }))
    .sort((a, b) => a.index - b.index);

  if (steps.length === 0) return null;

  const nameOf = (id: string): string => profiles.find((profile) => profile.id === id)?.name ?? id;

  return (
    <div className="border-b border-zinc-800 px-5 py-3">
      <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
        Model chain
      </span>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {steps.map((step, position) => (
          <div key={`${step.profileId}-${step.index}-${position}`} className="flex items-center gap-1.5">
            <span
              title={step.modelType}
              className="rounded border border-sky-900/70 bg-sky-950/50 px-2 py-1 text-[11px] text-sky-100"
            >
              <span className="mr-1 font-mono text-sky-500">#{step.index}</span>
              {nameOf(step.profileId)}
            </span>
            {position < steps.length - 1 ? <span className="text-zinc-600">→</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
