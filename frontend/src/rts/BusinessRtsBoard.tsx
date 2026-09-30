import { useCallback, useEffect, useMemo, useState } from 'react';
import { rtsApi } from './api';
import type { CrewAgentLite, RtsCatalog, RtsSession } from './types';

type LeftTab = 'crews' | 'units' | 'drones' | 'skills' | 'lenses';
type RightTab = 'missions' | 'tasks' | 'incidents' | 'opportunities';

const RESOURCE_ORDER = [
  'time',
  'budget',
  'compute',
  'storage',
  'attention',
  'risk',
  'evidence',
  'constitutionalCompliance',
] as const;

function meterColor(id: string, value: number, max: number, higherIsWorse?: boolean): string {
  const ratio = max > 0 ? value / max : 0;
  if (id === 'constitutionalCompliance' || id === 'evidence') {
    return ratio > 0.6 ? 'bg-emerald-600' : ratio > 0.3 ? 'bg-amber-600' : 'bg-rose-700';
  }
  if (higherIsWorse || id === 'risk') {
    return ratio > 0.6 ? 'bg-rose-600' : ratio > 0.3 ? 'bg-amber-600' : 'bg-emerald-700';
  }
  return 'bg-sky-600';
}

export function BusinessRtsBoard({ standalone = false }: { standalone?: boolean }) {
  const [catalog, setCatalog] = useState<RtsCatalog | null>(null);
  const [session, setSession] = useState<RtsSession | null>(null);
  const [agents, setAgents] = useState<CrewAgentLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>('crews');
  const [rightTab, setRightTab] = useState<RightTab>('missions');
  const [brief, setBrief] = useState('Ship a governed feature through Mandala phases');
  const [modeQuery, setModeQuery] = useState('sage navigator evidence');
  const [modes, setModes] = useState<Array<{ key: string; label: string }>>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('builder');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedDroneId, setSelectedDroneId] = useState('build-drone');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [autoTick, setAutoTick] = useState(false);

  const boot = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [cat, agentsList, sess] = await Promise.all([
        rtsApi.catalog(),
        rtsApi.listAgents(),
        rtsApi.createSession(),
      ]);
      setCatalog(cat);
      setAgents(agentsList);
      setSession(sess);
      const builder = agentsList.find((a) => a.family === 'implementation') ?? agentsList[0];
      if (builder) setSelectedAgentId(builder.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    if (!autoTick || !session) return;
    const id = window.setInterval(() => {
      void rtsApi
        .action(session.id, { type: 'tick', amount: 1 })
        .then(setSession)
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
    }, 2000);
    return () => window.clearInterval(id);
  }, [autoTick, session?.id]);

  useEffect(() => {
    if (leftTab !== 'lenses') return;
    void rtsApi.listModes(modeQuery, 24).then((r) => setModes(r.items));
  }, [leftTab, modeQuery]);

  useEffect(() => {
    if (!session?.units.length) {
      setSelectedUnitId('');
      return;
    }
    if (!session.units.some((u) => u.id === selectedUnitId)) {
      setSelectedUnitId(session.units[0]!.id);
    }
  }, [session?.units, selectedUnitId]);

  const act = async (body: Record<string, unknown>) => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const next = await rtsApi.action(session.id, body);
      setSession(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const roleById = useMemo(() => {
    const map = new Map(catalog?.unitRoles.map((r) => [r.id, r]) ?? []);
    return map;
  }, [catalog]);

  const droneById = useMemo(() => {
    const map = new Map(catalog?.drones.map((d) => [d.id, d]) ?? []);
    return map;
  }, [catalog]);

  const resourceDefs = useMemo(() => {
    const map = new Map(catalog?.resources.map((r) => [r.id, r]) ?? []);
    return map;
  }, [catalog]);

  const latestMission = session?.missions[0];
  const openIncidents = session?.incidents.filter((i) => i.status !== 'cleared') ?? [];
  const availableDrones =
    (catalog?.drones.length ?? 0) - (session?.drones.filter((d) => d.cooldownUntil > (session?.tick ?? 0)).length ?? 0);

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${standalone ? 'rts-standalone' : ''}`}
      style={
        standalone
          ? {
              ['--rts-ink' as string]: '#e8e2d6',
              ['--rts-muted' as string]: '#9a9184',
              ['--rts-panel' as string]: 'rgba(12, 18, 16, 0.88)',
              ['--rts-line' as string]: 'rgba(120, 140, 110, 0.35)',
              ['--rts-accent' as string]: '#6f9e6a',
              background:
                'radial-gradient(ellipse 90% 60% at 50% 0%, #1a2a22 0%, #0b100e 45%, #070a09 100%)',
              color: 'var(--rts-ink)',
              fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
            }
          : undefined
      }
    >
      {/* Top bar */}
      <header className="shrink-0 border-b border-zinc-800 px-4 py-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
              {standalone ? 'LineageStudio Business RTS' : 'Business RTS'}
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">
              Cursor foreman · governed sim
            </span>
            {session && (
              <span className="font-mono text-[11px] text-zinc-400">
                tick {session.tick} · drones ready ~{Math.max(0, availableDrones)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <input
                type="checkbox"
                checked={autoTick}
                onChange={(e) => setAutoTick(e.target.checked)}
              />
              Auto-tick
            </label>
            <button
              type="button"
              disabled={busy || !session}
              onClick={() => void act({ type: 'tick', amount: 1 })}
              className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
            >
              Tick
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void boot()}
              className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
            >
              New session
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {RESOURCE_ORDER.map((id) => {
            const def = resourceDefs.get(id);
            const value = session?.resources[id] ?? 0;
            const max = def?.max ?? 100;
            return (
              <div key={id} className="min-w-0">
                <div className="mb-0.5 flex justify-between text-[10px] text-zinc-500">
                  <span className="truncate">{def?.name ?? id}</span>
                  <span className="font-mono text-zinc-400">
                    {Math.round(value)}/{max}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded bg-zinc-900">
                  <div
                    className={`h-full ${meterColor(id, value, max, def?.higherIsWorse)}`}
                    style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {session && (
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-zinc-500">
            <span>Crew units: {session.units.length}</span>
            <span>Structures: {session.structures.length}/8</span>
            <span>Alerts: {session.alerts[0]?.message ?? '—'}</span>
            <span>
              Win — ship {session.scoreboard.featuresShipped} · uptime{' '}
              {session.scoreboard.uptimeScore} · compliance{' '}
              {session.scoreboard.constitutionalCompliance}
            </span>
          </div>
        )}
      </header>

      {error && (
        <div className="shrink-0 border-b border-rose-900/50 bg-rose-950/40 px-4 py-1.5 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Left panel */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/80">
          <nav className="flex flex-wrap gap-1 border-b border-zinc-800 p-2">
            {(
              [
                ['crews', 'Crews'],
                ['units', 'Agents'],
                ['drones', 'Drones'],
                ['skills', 'Skills'],
                ['lenses', 'Lenses'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setLeftTab(id)}
                className={`rounded px-2 py-1 text-[10px] ${
                  leftTab === id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 text-xs">
            {leftTab === 'crews' && (
              <div className="space-y-2">
                <p className="text-[11px] text-zinc-500">
                  Mandala 100 + ESFR. Foreman (Cursor) is outside the roster.
                </p>
                {(['vision', 'architecture', 'design', 'implementation', 'testing', 'operations'] as const).map(
                  (phase) => {
                    const count = agents.filter((a) => a.phase === phase).length;
                    return (
                      <div key={phase} className="flex justify-between border-b border-zinc-900 py-1">
                        <span className="capitalize text-zinc-300">{phase}</span>
                        <span className="font-mono text-zinc-500">{count}</span>
                      </div>
                    );
                  },
                )}
                <p className="pt-2 text-[11px] text-zinc-500">
                  Skills indexed: {catalog?.skills.count ?? '—'} (
                  {catalog?.skills.bySource
                    ? Object.entries(catalog.skills.bySource)
                        .map(([k, v]) => `${k}:${v}`)
                        .join(' · ')
                    : ''}
                  )
                </p>
              </div>
            )}

            {leftTab === 'units' && (
              <div className="space-y-2">
                <label className="block text-[10px] text-zinc-500">
                  Role
                  <select
                    className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-200"
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                  >
                    {(catalog?.unitRoles ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rtsLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[10px] text-zinc-500">
                  Bind agent
                  <select
                    className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-200"
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        #{a.order} {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={busy || !selectedAgentId}
                  onClick={() =>
                    void act({
                      type: 'train_unit',
                      roleId: selectedRoleId,
                      agentId: selectedAgentId,
                    })
                  }
                  className="w-full rounded bg-emerald-900/60 px-2 py-1.5 text-[11px] text-emerald-100 hover:bg-emerald-800/60 disabled:opacity-40"
                >
                  Train unit
                </button>
                <ul className="mt-2 space-y-1">
                  {(session?.units ?? []).map((u) => (
                    <li
                      key={u.id}
                      className={`cursor-pointer rounded px-2 py-1 ${
                        selectedUnitId === u.id ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                      }`}
                      onClick={() => setSelectedUnitId(u.id)}
                    >
                      <div className="text-zinc-200">{roleById.get(u.roleId)?.rtsLabel ?? u.roleId}</div>
                      <div className="truncate font-mono text-[10px] text-zinc-500">{u.agentId}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {leftTab === 'drones' && (
              <div className="space-y-2">
                <label className="block text-[10px] text-zinc-500">
                  Drone type
                  <select
                    className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-200"
                    value={selectedDroneId}
                    onChange={(e) => setSelectedDroneId(e.target.value)}
                  >
                    {(catalog?.drones ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={busy || !selectedUnitId}
                  onClick={() =>
                    void act({
                      type: 'deploy_drone',
                      droneTypeId: selectedDroneId,
                      unitId: selectedUnitId,
                    })
                  }
                  className="w-full rounded bg-sky-900/50 px-2 py-1.5 text-[11px] text-sky-100 hover:bg-sky-800/50 disabled:opacity-40"
                >
                  Deploy drone
                </button>
                <ul className="space-y-1">
                  {(session?.drones ?? []).map((d) => (
                    <li key={d.id} className="rounded bg-zinc-900/60 px-2 py-1 text-[11px] text-zinc-300">
                      {droneById.get(d.droneTypeId)?.name ?? d.droneTypeId}
                      <span className="ml-2 font-mono text-zinc-600">cd {d.cooldownUntil}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {leftTab === 'skills' && (
              <ul className="space-y-1">
                {(catalog?.skills.sample ?? []).map((s) => (
                  <li key={s.name} className="border-b border-zinc-900 py-1">
                    <div className="truncate text-zinc-300">{s.name}</div>
                    <div className="text-[10px] text-zinc-600">{s.source}</div>
                  </li>
                ))}
                <li className="pt-2 text-[10px] text-zinc-500">
                  Indexed only — not executed in-product. Full count {catalog?.skills.count}.
                </li>
              </ul>
            )}

            {leftTab === 'lenses' && (
              <div className="space-y-2">
                <input
                  className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200"
                  value={modeQuery}
                  onChange={(e) => setModeQuery(e.target.value)}
                  placeholder="Search ModeKeys"
                />
                <p className="text-[10px] text-zinc-500">
                  Active: {session?.selectedModeKey ?? 'none'} (actorMode = Actor lens)
                </p>
                <ul className="space-y-1">
                  {modes.map((m) => (
                    <li key={m.key}>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1 text-left text-[11px] text-zinc-300 hover:bg-zinc-900"
                        onClick={() => void act({ type: 'set_lens', modeKey: m.key })}
                      >
                        {m.label}
                        <div className="font-mono text-[9px] text-zinc-600">{m.key}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        {/* Main map */}
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(80,100,70,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(80,100,70,0.08) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative h-full p-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-medium tracking-tight text-zinc-100">Business map</h2>
                <p className="text-[11px] text-zinc-500">
                  Structures · units · drones · missions · incidents
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(catalog?.structures ?? []).map((s) => {
                  const built = session?.structures.some((b) => b.structureId === s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={busy || built}
                      title={s.description}
                      onClick={() => void act({ type: 'build_structure', structureId: s.id })}
                      className="rounded border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-[10px] text-zinc-300 hover:border-zinc-500 disabled:opacity-30"
                    >
                      {built ? '✓ ' : '+ '}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative mx-auto h-[min(56vh,480px)] w-full max-w-4xl rounded-sm border border-zinc-800 bg-zinc-950/40">
              {(catalog?.territories ?? []).map((t) => {
                const unlocked = session?.territoriesUnlocked.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy || unlocked}
                    onClick={() => void act({ type: 'unlock_territory', territoryId: t.id })}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-[9px] ${
                      unlocked
                        ? 'border-emerald-700/60 bg-emerald-950/50 text-emerald-200'
                        : 'border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:border-zinc-500'
                    }`}
                    style={{ left: `${t.map.x}%`, top: `${t.map.y}%` }}
                    title={t.description}
                  >
                    {t.name}
                  </button>
                );
              })}
              {(catalog?.structures ?? []).map((s) => {
                const built = session?.structures.some((b) => b.structureId === s.id);
                return (
                  <div
                    key={s.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded px-2 py-1.5 text-[10px] shadow ${
                      built
                        ? 'border border-sky-700/50 bg-sky-950/70 text-sky-100'
                        : 'border border-dashed border-zinc-700 bg-zinc-900/40 text-zinc-600'
                    }`}
                    style={{ left: `${s.map.x}%`, top: `${s.map.y}%` }}
                    title={s.description}
                  >
                    {s.name}
                  </div>
                );
              })}
              {(session?.units ?? []).slice(0, 12).map((u, i) => (
                <div
                  key={u.id}
                  className="absolute h-2.5 w-2.5 rounded-full bg-amber-400 shadow"
                  style={{
                    left: `${30 + (i % 6) * 8}%`,
                    top: `${40 + Math.floor(i / 6) * 10}%`,
                  }}
                  title={`${roleById.get(u.roleId)?.rtsLabel} → ${u.agentId}`}
                />
              ))}
              {openIncidents.map((inc, i) => (
                <div
                  key={inc.id}
                  className="absolute animate-pulse rounded bg-rose-900/80 px-1.5 py-0.5 text-[9px] text-rose-100"
                  style={{ left: `${60 + i * 5}%`, top: `${25 + i * 8}%` }}
                >
                  ! {inc.severity}
                </div>
              ))}
            </div>

            <div className="mx-auto mt-4 max-w-4xl rounded border border-zinc-800 bg-zinc-950/70 p-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Brief Cursor foreman
              </div>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Mission goal…"
                />
                <button
                  type="button"
                  disabled={busy || !brief.trim()}
                  onClick={() =>
                    void act({
                      type: 'start_mission',
                      goal: brief,
                      modeKey: session?.selectedModeKey,
                      compact: true,
                    })
                  }
                  className="rounded bg-emerald-800 px-4 py-2 text-sm text-emerald-50 hover:bg-emerald-700 disabled:opacity-40"
                >
                  Run mission
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act({ type: 'spawn_incident', severity: 'medium' })}
                  className="rounded bg-rose-900/70 px-3 py-2 text-sm text-rose-100 hover:bg-rose-800/70"
                >
                  Spawn battle
                </button>
              </div>
              {latestMission?.plan && (
                <details className="mt-3" open>
                  <summary className="cursor-pointer text-[11px] text-zinc-400">
                    Plan · {latestMission.plan.steps.length} steps · ESFR last=
                    {String(latestMission.plan.esfrLast)} · {latestMission.status}
                  </summary>
                  <ol className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-[10px] text-zinc-500">
                    {latestMission.plan.steps.map((s) => (
                      <li key={`${s.order}-${s.name}`}>
                        {s.order}. [{s.role}] {s.name} ({s.phase})
                      </li>
                    ))}
                  </ol>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-zinc-900/80 p-2 text-[10px] text-zinc-400">
                    {latestMission.plan.invokeBrief}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </main>

        {/* Right panel */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950/80">
          <nav className="flex flex-wrap gap-1 border-b border-zinc-800 p-2">
            {(
              [
                ['missions', 'Missions'],
                ['tasks', 'Tasks'],
                ['incidents', 'Incidents'],
                ['opportunities', 'Opps'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRightTab(id)}
                className={`rounded px-2 py-1 text-[10px] ${
                  rightTab === id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 text-xs">
            {rightTab === 'missions' && (
              <ul className="space-y-2">
                {(session?.missions ?? []).map((m) => (
                  <li key={m.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                    <div className="text-zinc-200">{m.goal}</div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      {m.status} · tick {m.startedAtTick}
                    </div>
                  </li>
                ))}
                {!session?.missions.length && (
                  <p className="text-zinc-500">No missions yet. Brief the foreman.</p>
                )}
              </ul>
            )}
            {rightTab === 'tasks' && (
              <ul className="space-y-1 font-mono text-[10px] text-zinc-400">
                {(latestMission?.plan?.steps ?? []).map((s) => (
                  <li key={`${s.order}-${s.name}`} className="border-b border-zinc-900 py-1">
                    {s.order}. {s.name}
                  </li>
                ))}
                {!latestMission?.plan && (
                  <p className="font-sans text-xs text-zinc-500">Tasks appear from the latest crew plan.</p>
                )}
              </ul>
            )}
            {rightTab === 'incidents' && (
              <ul className="space-y-2">
                {(session?.incidents ?? []).map((inc) => (
                  <li key={inc.id} className="rounded border border-zinc-800 p-2">
                    <div className="text-zinc-200">{inc.title}</div>
                    <div className="text-[10px] text-zinc-500">
                      {inc.severity} · {inc.status}
                    </div>
                    {inc.status !== 'cleared' && (
                      <button
                        type="button"
                        className="mt-2 rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200"
                        onClick={() => void act({ type: 'resolve_incident', incidentId: inc.id })}
                      >
                        Resolve battle
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {rightTab === 'opportunities' && (
              <ul className="space-y-2">
                {(session?.opportunities ?? []).map((o) => (
                  <li key={o.id} className="rounded border border-zinc-800 p-2 text-zinc-300">
                    {o.title}
                    <div className="text-[10px] text-zinc-600">{o.territoryId}</div>
                  </li>
                ))}
                {(catalog?.winConditions ?? []).map((w) => {
                  const score = session?.scoreboard;
                  const current =
                    score && w.metric in score
                      ? (score as Record<string, number>)[w.metric]
                      : session?.resources[w.metric];
                  return (
                    <li key={w.id} className="border-b border-zinc-900 py-1 text-[11px] text-zinc-500">
                      Win: {w.name} — {current ?? 0}/{w.target}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {catalog?.honesty?.[0] && (
            <footer className="shrink-0 border-t border-zinc-800 p-2 text-[9px] leading-snug text-zinc-600">
              {catalog.honesty[0]}
            </footer>
          )}
        </aside>
      </div>
    </div>
  );
}
