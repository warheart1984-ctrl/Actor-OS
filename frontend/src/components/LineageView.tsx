import { useMemo, useState } from 'react';
import type { LineageEvent, LineageEventType, Profile } from '../types';
import { eventStyles, formatTime, shortId, summarizePayload } from '../ui';

type Props = {
  events: LineageEvent[];
  profiles: Profile[];
  title?: string;
  subtitle?: string;
  live?: boolean;
};

const ALL_TYPES: LineageEventType[] = [
  'task',
  'decision',
  'chain_step',
  'interaction',
  'artifact',
  'evidence',
];

export function LineageView({ events, profiles, title = 'Lineage', subtitle, live }: Props) {
  const [activeTypes, setActiveTypes] = useState<Set<LineageEventType>>(new Set(ALL_TYPES));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const profileNames = useMemo(
    () => Object.fromEntries(profiles.map((profile) => [profile.id, profile.name])),
    [profiles],
  );

  const visible = events.filter((event) => activeTypes.has(event.event_type));

  function toggleType(type: LineageEventType): void {
    setActiveTypes((previous) => {
      const next = new Set(previous);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleExpanded(id: string): void {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-zinc-950">
      <header className="border-b border-zinc-800 px-5 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
            {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {live !== undefined ? (
              <span className="flex items-center gap-1.5">
                <span
                  className={`size-1.5 rounded-full ${live ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                />
                {live ? 'streaming' : 'offline'}
              </span>
            ) : null}
            <span>
              {visible.length}/{events.length}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {ALL_TYPES.map((type) => {
            const active = activeTypes.has(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium tracking-wide ring-1 transition ${
                  active ? eventStyles[type].className : 'bg-transparent text-zinc-600 ring-zinc-800'
                }`}
              >
                {eventStyles[type].label}
              </button>
            );
          })}
        </div>
      </header>

      <ol className="flex-1 space-y-2 overflow-y-auto p-4">
        {visible.map((event) => {
          const style = eventStyles[event.event_type];
          const isOpen = expanded.has(event.id);
          const step = event.payload_json['step'];
          const summary = summarizePayload(event.payload_json);
          return (
            <li
              key={event.id}
              className="rounded border border-zinc-800 bg-zinc-900/50 transition hover:border-zinc-700"
            >
              <button
                type="button"
                onClick={() => toggleExpanded(event.id)}
                className="w-full px-3 py-2 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${style.className}`}
                  >
                    {style.label}
                  </span>
                  {typeof step === 'number' ? (
                    <span className="rounded bg-sky-950 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-800">
                      #{step}
                    </span>
                  ) : null}
                  {event.profile_id ? (
                    <span className="text-xs text-zinc-300">
                      {profileNames[event.profile_id] ?? shortId(event.profile_id)}
                    </span>
                  ) : null}
                  <span className="ml-auto font-mono text-[10px] text-zinc-600">
                    {formatTime(event.created_at)}
                  </span>
                </div>
                {summary ? (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                    {summary}
                  </p>
                ) : null}
              </button>
              {isOpen ? (
                <pre className="mx-3 mb-3 max-h-72 overflow-auto rounded bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-400 ring-1 ring-zinc-800">
                  {JSON.stringify(event.payload_json, null, 2)}
                </pre>
              ) : null}
            </li>
          );
        })}

        {visible.length === 0 ? (
          <li className="rounded border border-dashed border-zinc-800 px-4 py-10 text-center text-xs text-zinc-600">
            No lineage events match the current filters.
          </li>
        ) : null}
      </ol>
    </section>
  );
}
