import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { ActiveContextPanel, type PanelResult } from '../components/ActiveContextPanel';
import { ChainVisualization } from '../components/ChainVisualization';
import { LineageView } from '../components/LineageView';
import { ProfileSettingsPanel } from '../components/ProfileSettingsPanel';
import { TaskChainBuilder } from '../components/TaskChainBuilder';
import { TaskEditor } from '../components/TaskEditor';
import type {
  Artifact,
  LineageEvent,
  Profile,
  ProfileSettings,
  Task,
} from '../types';
import { formatTime, statusStyles } from '../ui';

type Props = {
  profiles: Profile[];
  profileId: string;
  streamEvents: LineageEvent[];
  streamConnected: boolean;
  onProfilesChanged: () => Promise<void>;
};

/** Merges the fetched history with live events, keeping arrival order and no duplicates. */
function mergeEvents(fetched: LineageEvent[], streamed: LineageEvent[]): LineageEvent[] {
  const byId = new Map<string, LineageEvent>();
  for (const event of [...fetched, ...streamed]) {
    byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function ProfileWorkspace({
  profiles,
  profileId,
  streamEvents,
  streamConnected,
  onProfilesChanged,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [lineage, setLineage] = useState<LineageEvent[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [result, setResult] = useState<PanelResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = profiles.find((entry) => entry.id === profileId);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  const refreshTasks = useCallback(async (): Promise<Task[]> => {
    const loaded = await api.listProfileTasks(profileId);
    setTasks(loaded);
    return loaded;
  }, [profileId]);

  const refreshTaskDetail = useCallback(async (taskId: string): Promise<void> => {
    const [events, taskArtifacts] = await Promise.all([
      api.taskLineage(taskId),
      api.taskArtifacts(taskId),
    ]);
    setLineage(events);
    setArtifacts(taskArtifacts);
  }, []);

  useEffect(() => {
    setSelectedTaskId(null);
    setLineage([]);
    setArtifacts([]);
    setResult(null);
    setError(null);
    void refreshTasks();
  }, [profileId, refreshTasks]);

  useEffect(() => {
    if (!selectedTaskId) return;
    void refreshTaskDetail(selectedTaskId);
  }, [selectedTaskId, refreshTaskDetail]);

  const visibleEvents = useMemo(() => {
    const live = selectedTaskId
      ? streamEvents.filter((event) => event.task_id === selectedTaskId)
      : [];
    return mergeEvents(lineage, live);
  }, [lineage, streamEvents, selectedTaskId]);

  async function guard(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function createTask(title: string, input: string): Promise<void> {
    await guard(async () => {
      const task = await api.createTask({
        agent_id: profileId,
        title,
        intent: 'execute',
        input_text: input,
      });
      await refreshTasks();
      setSelectedTaskId(task.id);
      setResult(null);
    });
  }

  async function runTask(): Promise<void> {
    if (!selectedTaskId) return;
    await guard(async () => {
      const run = await api.runTask(selectedTaskId);
      setResult({
        label: 'Latest output',
        output: run.output,
        model_type: `${run.connector} · ${run.model}`,
        is_mock: run.is_mock,
      });
      await Promise.all([refreshTasks(), refreshTaskDetail(selectedTaskId)]);
    });
  }

  async function runChain(steps: Array<{ agentId: string }>): Promise<void> {
    if (!selectedTaskId) return;
    await guard(async () => {
      const chain = await api.runChain(selectedTaskId, steps);
      const final = chain.steps[chain.steps.length - 1];
      if (final) {
        setResult({
          label: `Chain output (${chain.steps.length} steps)`,
          output: final.output,
          model_type: `${final.connector} · ${final.model}`,
          is_mock: final.is_mock,
        });
      }
      await Promise.all([refreshTasks(), refreshTaskDetail(selectedTaskId)]);
    });
  }

  async function sendToAgent(toProfileId: string, intent: string, content: string): Promise<void> {
    await guard(async () => {
      const sent = await api.sendToAgent({
        taskId: selectedTaskId,
        fromAgentId: profileId,
        toAgentId: toProfileId,
        content,
        intent,
      });
      if (sent.response) {
        const targetName = profiles.find((entry) => entry.id === toProfileId)?.name ?? toProfileId;
        setResult({
          label: `Reply from ${targetName} (${intent})`,
          output: sent.response.output,
          model_type: `${sent.response.connector} · ${sent.response.model}`,
          is_mock: sent.response.is_mock,
        });
      }
      if (selectedTaskId) await refreshTaskDetail(selectedTaskId);
    });
  }

  async function saveInput(input: string): Promise<void> {
    if (!selectedTaskId) return;
    await guard(async () => {
      await api.updateTaskInput(selectedTaskId, input);
      await refreshTasks();
    });
  }

  async function saveSettings(input: {
    role?: string;
    binding?: { connector: string; model: string };
    settings_json?: ProfileSettings;
  }): Promise<void> {
    await guard(async () => {
      await api.updateProfile(profileId, input);
      await onProfilesChanged();
    });
  }

  if (!profile) {
    return <div className="p-6 text-sm text-zinc-500">Agent not found.</div>;
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedTask ? <ChainVisualization events={visibleEvents} profiles={profiles} /> : null}
        <LineageView
          events={visibleEvents}
          profiles={profiles}
          title={selectedTask ? `Lineage · ${selectedTask.title}` : 'Lineage'}
          subtitle={
            selectedTask
              ? selectedTask.spec_json
                ? `TaskSpec · ${selectedTask.spec_json.intent} · every step, handoff, and artifact`
                : 'Every task, decision, chain step, handoff, and artifact'
              : 'Select a task to inspect its lineage'
          }
          live={streamConnected}
        />
      </div>

      <aside className="flex w-[26rem] shrink-0 flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-900/40">
        <div className="border-b border-zinc-800">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
              Tasks
            </span>
            <span className="text-[10px] text-zinc-600">{tasks.length}</span>
          </div>
          <ul className="max-h-48 overflow-y-auto pb-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left transition ${
                    task.id === selectedTaskId ? 'bg-zinc-800/70' : 'hover:bg-zinc-800/40'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">{task.title}</span>
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[9px] ring-1 ${statusStyles[task.status]}`}
                  >
                    {task.status}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] text-zinc-600">
                    {formatTime(task.created_at)}
                  </span>
                </button>
              </li>
            ))}
            {tasks.length === 0 ? (
              <li className="px-4 py-3 text-[11px] text-zinc-600">
                No tasks for this profile yet.
              </li>
            ) : null}
          </ul>
        </div>

        <TaskEditor profileName={profile.name} busy={busy} onCreate={createTask} />

        <ActiveContextPanel
          profiles={profiles}
          activeProfileId={profileId}
          task={selectedTask}
          artifacts={artifacts}
          result={result}
          busy={busy}
          error={error}
          onSaveInput={saveInput}
          onRun={runTask}
          onSendToAgent={sendToAgent}
        />

        <TaskChainBuilder
          profiles={profiles}
          disabled={busy || !selectedTaskId}
          onRunChain={runChain}
        />

        <ProfileSettingsPanel profile={profile} onSave={saveSettings} />
      </aside>
    </div>
  );
}
