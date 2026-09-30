import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { LineageView } from '../components/LineageView';
import type { GateCheck, LineageEvent, PipelineDefinition, PipelineRunResult, Profile } from '../types';

type Props = {
  profiles: Profile[];
  streamEvents: LineageEvent[];
  streamConnected: boolean;
};

const checkStyles: Record<GateCheck['status'], string> = {
  passed: 'text-emerald-300',
  failed: 'text-rose-300',
  skipped: 'text-zinc-500',
};

const checkIcons: Record<GateCheck['status'], string> = {
  passed: '✓',
  failed: '✗',
  skipped: '–',
};

/**
 * Runs a crew pipeline (draft → review → fact-check → summarize → standards
 * gate) and shows its lineage trail filling in live, then the gate's verdict.
 */
export function PipelineConsole({ profiles, streamEvents, streamConnected }: Props) {
  const [pipelines, setPipelines] = useState<PipelineDefinition[]>([]);
  const [title, setTitle] = useState('Launch announcement');
  const [input, setInput] = useState(
    'Write a short announcement for the v1 launch of LineageStudio: agents with durable identity, swappable models, and a replayable lineage trail.',
  );
  const [mustInclude, setMustInclude] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [history, setHistory] = useState<LineageEvent[]>([]);
  const preRunIds = useRef<Set<string>>(new Set());
  const runTitle = useRef('');

  const pipeline = pipelines[0];
  const profileNames = useMemo(
    () => Object.fromEntries(profiles.map((profile) => [profile.id, profile.name])),
    [profiles],
  );

  useEffect(() => {
    void api.listPipelines().then(setPipelines).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  // While a run is in flight, find its task from the first new `task` event.
  useEffect(() => {
    if (!running || taskId) return;
    const created = streamEvents.find(
      (event) =>
        event.event_type === 'task' &&
        !preRunIds.current.has(event.id) &&
        event.payload_json['title'] === runTitle.current,
    );
    if (created?.task_id) setTaskId(created.task_id);
  }, [running, taskId, streamEvents]);

  const trail = useMemo(() => {
    if (!taskId) return [];
    const byId = new Map<string, LineageEvent>();
    for (const event of [...history, ...streamEvents]) {
      if (event.task_id === taskId) byId.set(event.id, event);
    }
    return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [taskId, history, streamEvents]);

  async function run(): Promise<void> {
    if (!pipeline) return;
    preRunIds.current = new Set(streamEvents.map((event) => event.id));
    runTitle.current = title.trim();
    setRunning(true);
    setResult(null);
    setError(null);
    setTaskId(null);
    setHistory([]);
    try {
      const terms = mustInclude
        .split(',')
        .map((term) => term.trim())
        .filter(Boolean);
      const outcome = await api.runPipeline(pipeline.id, {
        title: runTitle.current,
        input,
        ...(terms.length ? { must_include: terms } : {}),
      });
      setResult(outcome);
      setTaskId(outcome.taskId);
      // The stream can miss events (e.g. it reconnected); storage is the record.
      setHistory(await api.taskLineage(outcome.taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1">
      <section className="flex w-[28rem] shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-800 p-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">{pipeline?.name ?? 'Review pipeline'}</h2>
          <p className="mt-1 text-xs text-zinc-500">{pipeline?.description}</p>
        </div>

        {pipeline ? (
          <ol className="flex flex-wrap items-center gap-1 text-[11px] text-zinc-400">
            {pipeline.steps.map((step) => (
              <li key={step.label} className="flex items-center gap-1">
                <span className="rounded bg-zinc-900 px-2 py-0.5 ring-1 ring-zinc-800">
                  {step.label} · {profileNames[step.agentId] ?? step.agentId}
                </span>
                <span className="text-zinc-600">→</span>
              </li>
            ))}
            <li className="rounded bg-indigo-950 px-2 py-0.5 text-indigo-200 ring-1 ring-indigo-800">
              gate · {profileNames[pipeline.gateAgentId] ?? pipeline.gateAgentId}
            </li>
          </ol>
        ) : null}

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 ring-1 ring-zinc-800 outline-none focus:ring-zinc-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Request
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={5}
            className="resize-y rounded bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 ring-1 ring-zinc-800 outline-none focus:ring-zinc-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Must include (comma-separated, optional — the gate enforces these)
          <input
            value={mustInclude}
            onChange={(event) => setMustInclude(event.target.value)}
            placeholder="e.g. lineage, v1"
            className="rounded bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 ring-1 ring-zinc-800 outline-none focus:ring-zinc-600"
          />
        </label>

        <button
          type="button"
          onClick={() => void run()}
          disabled={running || !pipeline || !title.trim() || !input.trim()}
          className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? 'Running pipeline…' : 'Run pipeline'}
        </button>

        {error ? (
          <p className="rounded bg-rose-950/50 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-900">{error}</p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-3">
            <div
              className={`rounded px-3 py-2 text-sm font-semibold ring-1 ${
                result.verdict === 'approved'
                  ? 'bg-emerald-950 text-emerald-200 ring-emerald-800'
                  : 'bg-orange-950 text-orange-200 ring-orange-800'
              }`}
            >
              Gate verdict: {result.verdict.toUpperCase()}
            </div>
            <ul className="space-y-1 text-xs">
              {result.checks.map((check) => (
                <li key={check.id} className={checkStyles[check.status]}>
                  <span className="font-mono">{checkIcons[check.status]}</span> {check.id} — {check.detail}
                </li>
              ))}
            </ul>
            {result.warnings.length ? (
              <ul className="space-y-1 rounded bg-amber-950/40 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-900">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <div>
              <h3 className="mb-1 text-xs font-semibold text-zinc-300">Final output</h3>
              <pre className="max-h-80 overflow-auto rounded bg-zinc-900 p-3 text-xs whitespace-pre-wrap text-zinc-200 ring-1 ring-zinc-800">
                {result.final_output}
              </pre>
            </div>
          </div>
        ) : null}
      </section>

      <LineageView
        events={trail}
        profiles={profiles}
        title="Pipeline trail"
        subtitle={taskId ? `task ${taskId}` : 'Run the pipeline to watch each step land in lineage.'}
        live={streamConnected}
      />
    </div>
  );
}
