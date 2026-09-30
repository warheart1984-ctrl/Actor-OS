import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, AUTH_REQUIRED_EVENT, getApiToken, setApiToken } from './api/client';
import { AgentGraph } from './components/AgentGraph';
import { ProfileSidebar } from './components/ProfileSidebar';
import { useLineageStream } from './hooks/useLineageStream';
import { BusinessRtsConsole } from './pages/BusinessRtsConsole';
import { MandalaCrewConsole } from './pages/MandalaCrewConsole';
import { OperatorConsole } from './pages/OperatorConsole';
import { PipelineConsole } from './pages/PipelineConsole';
import { ProfileWorkspace } from './pages/ProfileWorkspace';
import type { AgentGraph as AgentGraphData, Health, Profile } from './types';

type View = 'studio' | 'pipeline' | 'operator' | 'graph' | 'crew' | 'rts';

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'studio', label: 'Studio' },
  { id: 'pipeline', label: 'Review pipeline' },
  { id: 'operator', label: 'Operator console' },
  { id: 'graph', label: 'Agent graph' },
  { id: 'crew', label: 'Mandala crew (exp)' },
  { id: 'rts', label: 'Business RTS (exp)' },
];

export function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>();
  const [health, setHealth] = useState<Health | null>(null);
  const [graph, setGraph] = useState<AgentGraphData>({ nodes: [], edges: [] });
  const [view, setView] = useState<View>('studio');
  const [bootError, setBootError] = useState<string | null>(null);
  const [needsToken, setNeedsToken] = useState(false);
  const [tokenDraft, setTokenDraft] = useState('');
  // Bumped when the token changes so the stream reconnects with it.
  const [authVersion, setAuthVersion] = useState(0);

  const { events, connected } = useLineageStream(500, authVersion);

  useEffect(() => {
    const onAuthRequired = (): void => setNeedsToken(true);
    window.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
  }, []);

  const loadProfiles = useCallback(async (): Promise<void> => {
    const loaded = await api.listProfiles();
    setProfiles(loaded);
    setSelectedProfileId((current) => current ?? loaded[0]?.id);
  }, []);

  const boot = useCallback(async (): Promise<void> => {
    try {
      const [, status] = await Promise.all([loadProfiles(), api.health()]);
      setHealth(status);
      setBootError(null);
    } catch (error) {
      setBootError(error instanceof Error ? error.message : String(error));
    }
  }, [loadProfiles]);

  useEffect(() => {
    void boot();
  }, [boot]);

  function saveToken(): void {
    setApiToken(tokenDraft.trim() || null);
    setTokenDraft('');
    setNeedsToken(false);
    setAuthVersion((version) => version + 1);
    void boot();
  }

  useEffect(() => {
    if (view !== 'graph') return;
    void api.agentGraph().then(setGraph);
  }, [view, events.length]);

  const liveProviders = useMemo(
    () =>
      Object.fromEntries((health?.providers ?? []).map((entry) => [entry.provider, entry.live])) as Record<
        string,
        boolean
      >,
    [health],
  );

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b border-zinc-800 px-5">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight text-zinc-100">LineageStudio</span>
          <span className="text-[10px] tracking-widest text-zinc-600 uppercase">
            agent operating system
          </span>
        </div>

        <nav className="flex gap-1">
          {VIEWS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setView(entry.id)}
              className={`rounded px-3 py-1.5 text-xs transition ${
                view === entry.id
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            {connected ? 'lineage stream live' : 'stream offline'}
          </span>
          {health ? (
            <span className="font-mono">
              db:{health.database} ·{' '}
              {health.providers.map((entry) => `${entry.provider}=${entry.live ? 'live' : 'mock'}`).join(' ')}
            </span>
          ) : null}
        </div>
      </header>

      {needsToken ? (
        <form
          className="flex items-center gap-2 border-b border-amber-900 bg-amber-950/40 px-5 py-2 text-xs text-amber-200"
          onSubmit={(event) => {
            event.preventDefault();
            saveToken();
          }}
        >
          <span>
            {getApiToken() ? 'The saved API token was rejected.' : 'This API requires a token.'} Enter
            LINEAGE_API_TOKEN:
          </span>
          <input
            type="password"
            value={tokenDraft}
            onChange={(event) => setTokenDraft(event.target.value)}
            className="w-64 rounded bg-zinc-900 px-2 py-1 text-zinc-100 ring-1 ring-zinc-700 outline-none"
            autoComplete="off"
          />
          <button type="submit" className="rounded bg-amber-200 px-2 py-1 font-medium text-amber-950">
            Save
          </button>
        </form>
      ) : null}

      {bootError ? (
        <div className="border-b border-rose-900 bg-rose-950/50 px-5 py-2 text-xs text-rose-200">
          Cannot reach the API: {bootError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {view !== 'rts' && view !== 'pipeline' ? (
          <ProfileSidebar
            profiles={profiles}
            selectedId={selectedProfileId}
            liveProviders={liveProviders}
            onSelect={(id) => {
              setSelectedProfileId(id);
              setView('studio');
            }}
          />
        ) : null}

        <main className="flex min-w-0 flex-1">
          {view === 'studio' ? (
            selectedProfileId ? (
              <ProfileWorkspace
                profiles={profiles}
                profileId={selectedProfileId}
                streamEvents={events}
                streamConnected={connected}
                onProfilesChanged={loadProfiles}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
                Select a profile to begin.
              </div>
            )
          ) : null}

          {view === 'pipeline' ? (
            <PipelineConsole profiles={profiles} streamEvents={events} streamConnected={connected} />
          ) : null}

          {view === 'operator' ? (
            <OperatorConsole profiles={profiles} streamEvents={events} streamConnected={connected} />
          ) : null}

          {view === 'graph' ? (
            <AgentGraph
              graph={graph}
              onSelectEdge={(from, to) => api.agentMessages(from, to)}
            />
          ) : null}

          {view === 'crew' ? <MandalaCrewConsole /> : null}

          {view === 'rts' ? <BusinessRtsConsole /> : null}
        </main>
      </div>
    </div>
  );
}
