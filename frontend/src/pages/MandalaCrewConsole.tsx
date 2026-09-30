import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { CrewAgent, CrewPlan, CrewStatus, ModeEntry, VendorSkillHit } from '../types';

const PHASES = [
  'vision',
  'architecture',
  'design',
  'implementation',
  'testing',
  'operations',
] as const;

/**
 * Operable surface for the Mandala 100+ESFR crew pack: inspect roster, search
 * the vendor skill catalog (with path metadata), select ModeKeys, and produce
 * a foreman plan / invoke brief. Cursor still executes agents; this UI plans and routes.
 */
export function MandalaCrewConsole() {
  const [status, setStatus] = useState<CrewStatus | null>(null);
  const [agents, setAgents] = useState<CrewAgent[]>([]);
  const [esfrId, setEsfrId] = useState<string>('ls-esfr');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [modes, setModes] = useState<ModeEntry[]>([]);
  const [modeQuery, setModeQuery] = useState('sage navigator evidence');
  const [skillQuery, setSkillQuery] = useState('');
  const [skills, setSkills] = useState<VendorSkillHit[]>([]);
  const [skillTotal, setSkillTotal] = useState(0);
  const [preferredOnly, setPreferredOnly] = useState(false);
  const [goal, setGoal] = useState('Design and ship a focused LineageStudio capability');
  const [modeKey, setModeKey] = useState('sage__navigator__evidence-strict');
  const [phases, setPhases] = useState<string[]>([]);
  const [compact, setCompact] = useState(true);
  const [plan, setPlan] = useState<CrewPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCore = useCallback(async (): Promise<void> => {
    const [crewStatus, roster] = await Promise.all([api.crewStatus(), api.crewAgents()]);
    setStatus(crewStatus);
    setAgents(roster.agents);
    setEsfrId(roster.esfr.id);
    setSelectedAgentId((current) => current ?? roster.agents[0]?.id ?? null);
  }, []);

  useEffect(() => {
    void loadCore().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [loadCore]);

  useEffect(() => {
    void api
      .crewModes({ q: modeQuery || undefined, limit: 24 })
      .then((result) => setModes(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [modeQuery]);

  useEffect(() => {
    void api
      .crewSkills({
        q: skillQuery || undefined,
        preferredOnly,
        limit: 40,
      })
      .then((result) => {
        setSkills(result.items);
        setSkillTotal(result.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [skillQuery, preferredOnly]);

  useEffect(() => {
    if (!selectedAgentId) return;
    void api
      .crewAgent(selectedAgentId)
      .then((agent) => setPreferredSkills(agent.preferredSkills))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [selectedAgentId]);

  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const agent of agents) {
      counts[agent.phase] = (counts[agent.phase] ?? 0) + 1;
    }
    return counts;
  }, [agents]);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  async function runPlan(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const next = await api.crewPlan({
        goal,
        modeKey: modeKey || undefined,
        phases: phases.length ? phases : undefined,
        compact,
        includeEsfr: true,
      });
      setPlan(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function togglePhase(phase: string): void {
    setPhases((current) =>
      current.includes(phase) ? current.filter((entry) => entry !== phase) : [...current, phase],
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 lg:flex-row">
      <section className="flex w-full flex-col gap-4 lg:w-[340px] lg:shrink-0">
        <div className="border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-[10px] tracking-widest text-zinc-500 uppercase">Mandala crew</div>
          <h2 className="mt-1 text-sm font-semibold text-zinc-100">100 pre-ESFR + ESFR #101</h2>
          {status ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-zinc-400">
              <div>
                <dt className="text-zinc-600">Status</dt>
                <dd className="font-mono text-amber-200/90">{status.status}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Agents</dt>
                <dd className="font-mono text-zinc-200">{status.preEsfrCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Phases</dt>
                <dd className="font-mono text-zinc-200">{status.phaseCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">ModeKeys</dt>
                <dd className="font-mono text-zinc-200">{status.modeKeyCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Vendor catalog</dt>
                <dd className="font-mono text-zinc-200">{status.vendorCatalogCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Skill paths</dt>
                <dd className="font-mono text-zinc-200">{status.vendorPathIndexCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Preferred</dt>
                <dd className="font-mono text-zinc-200">{status.vendorPreferredUnique}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">ESFR</dt>
                <dd className="font-mono text-zinc-200">
                  {esfrId}#{status.esfrSlot}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-xs text-zinc-600">Loading crew pack…</p>
          )}
          {status?.honesty?.[0] ? (
            <p className="mt-3 border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-500">
              {status.honesty[0]}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 border border-zinc-800 bg-zinc-900/40">
          <div className="border-b border-zinc-800 px-4 py-2 text-[10px] tracking-widest text-zinc-500 uppercase">
            Roster
          </div>
          <ul className="max-h-[420px] overflow-y-auto py-1">
            {agents.map((agent) => (
              <li key={agent.id}>
                <button
                  type="button"
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-xs transition ${
                    selectedAgentId === agent.id
                      ? 'bg-zinc-800/80 text-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800/40'
                  }`}
                >
                  <span>
                    <span className="font-mono text-[10px] text-zinc-600">{agent.order}.</span>{' '}
                    {agent.name}
                  </span>
                  <span className="text-[10px] text-zinc-600">{agent.phase}</span>
                </button>
              </li>
            ))}
            <li className="border-t border-zinc-800 px-4 py-2 text-xs text-amber-200/80">
              {status?.esfrSlot}. ESFR gate ({esfrId})
            </li>
          </ul>
          <div className="border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-600">
            {Object.entries(phaseCounts)
              .map(([phase, count]) => `${phase}:${count}`)
              .join(' · ')}
          </div>
        </div>
      </section>

      <section className="flex min-w-0 flex-1 flex-col gap-4">
        {error ? (
          <div className="border border-rose-900 bg-rose-950/40 px-4 py-2 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-[10px] tracking-widest text-zinc-500 uppercase">Preferred skills</div>
            <p className="mt-1 text-xs text-zinc-400">
              {selectedAgentId ?? '—'} · {preferredSkills.length} mapped
            </p>
            {selectedAgent?.description ? (
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{selectedAgent.description}</p>
            ) : null}
            <div className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {preferredSkills.length ? (
                preferredSkills.map((name) => (
                  <span
                    key={name}
                    className="border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-300"
                  >
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-zinc-600">No preferred map for this agent.</span>
              )}
            </div>
          </div>

          <div className="border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] tracking-widest text-zinc-500 uppercase">
                Vendor catalog ({skillTotal}
                {status ? ` / ${status.vendorCatalogCount}` : ''})
              </div>
              <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <input
                  type="checkbox"
                  checked={preferredOnly}
                  onChange={(event) => setPreferredOnly(event.target.checked)}
                />
                preferred only
              </label>
            </div>
            <input
              value={skillQuery}
              onChange={(event) => setSkillQuery(event.target.value)}
              placeholder="Search all skill names…"
              className="mt-2 w-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
            />
            <ul className="mt-2 max-h-40 overflow-y-auto text-[11px]">
              {skills.map((skill) => (
                <li
                  key={skill.name}
                  className="flex items-center justify-between border-b border-zinc-900 py-1 text-zinc-400"
                >
                  <span className="font-mono text-zinc-300">{skill.name}</span>
                  <span className="text-[10px] text-zinc-600">
                    {skill.preferred ? `preferred×${skill.preferredBy.length}` : 'on-demand'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-[10px] tracking-widest text-zinc-500 uppercase">ModeKeys</div>
          <input
            value={modeQuery}
            onChange={(event) => setModeQuery(event.target.value)}
            placeholder="Filter ModeKeys…"
            className="mt-2 w-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
          />
          <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
            {modes.map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setModeKey(mode.key)}
                className={`border px-2 py-1 text-left text-[10px] transition ${
                  modeKey === mode.key
                    ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-zinc-600">selected: {modeKey || '(none)'}</p>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-[10px] tracking-widest text-zinc-500 uppercase">Foreman plan</div>
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            rows={3}
            className="mt-2 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {PHASES.map((phase) => (
              <button
                key={phase}
                type="button"
                onClick={() => togglePhase(phase)}
                className={`border px-2 py-1 text-[10px] ${
                  phases.includes(phase)
                    ? 'border-zinc-500 text-zinc-100'
                    : 'border-zinc-800 text-zinc-500'
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <input
                type="checkbox"
                checked={compact}
                onChange={(event) => setCompact(event.target.checked)}
              />
              compact phase leads (else full 100 when no phase filter)
            </label>
            <button
              type="button"
              disabled={busy || !goal.trim()}
              onClick={() => void runPlan()}
              className="ml-auto border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-40"
            >
              {busy ? 'Planning…' : 'Plan pipeline'}
            </button>
          </div>
        </div>

        {plan ? (
          <div className="border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] tracking-widest text-zinc-500 uppercase">
                Pipeline · {plan.steps.length} steps · ESFR last={String(plan.esfrLast)}
              </div>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(plan.invokeBrief)}
                className="text-[10px] text-zinc-500 hover:text-zinc-200"
              >
                copy invoke brief
              </button>
            </div>
            <ol className="mt-3 space-y-1 text-xs text-zinc-400">
              {plan.steps.map((step) => (
                <li key={`${step.agentId}-${step.order}`} className="flex gap-2">
                  <span className="w-6 shrink-0 font-mono text-zinc-600">{step.order}.</span>
                  <span>
                    <span className={step.role === 'esfr' ? 'text-amber-200' : 'text-zinc-200'}>
                      {step.agentId}
                    </span>{' '}
                    <span className="text-zinc-600">
                      ({step.phase}/{step.role})
                    </span>
                    {step.description ? (
                      <span className="mt-0.5 block text-[11px] text-zinc-500">{step.description}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
            <pre className="mt-4 max-h-64 overflow-auto border border-zinc-800 bg-zinc-950 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-400">
              {plan.invokeBrief}
            </pre>
          </div>
        ) : null}
      </section>
    </div>
  );
}
