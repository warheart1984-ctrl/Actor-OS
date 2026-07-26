import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { LineageView } from '../components/LineageView';
import type { LineageEvent, Profile } from '../types';
import { formatTime, shortId } from '../ui';

type Props = {
  profiles: Profile[];
  streamEvents: LineageEvent[];
  streamConnected: boolean;
};

/**
 * Cross-profile view of everything the studio has recorded: pick a task to
 * replay its lineage, or watch all activity as it streams in.
 */
export function OperatorConsole({ profiles, streamEvents, streamConnected }: Props) {
  const [history, setHistory] = useState<LineageEvent[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});

  const load = useCallback(async (): Promise<void> => {
    const [events, tasks] = await Promise.all([api.recentLineage(500), api.listTasks()]);
    setHistory(events);
    setTaskTitles(Object.fromEntries(tasks.map((task) => [task.id, task.title])));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allEvents = useMemo(() => {
    const byId = new Map<string, LineageEvent>();
    for (const event of [...history, ...streamEvents]) byId.set(event.id, event);
    return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [history, streamEvents]);

  const taskIds = useMemo(() => {
    const seen = new Map<string, string>();
    for (const event of allEvents) {
      if (event.task_id && !seen.has(event.task_id)) {
        seen.set(event.task_id, event.created_at);
      }
    }
    return [...seen.entries()].sort((a, b) => b[1].localeCompare(a[1]));
  }, [allEvents]);

  const visible = selectedTaskId
    ? allEvents.filter((event) => event.task_id === selectedTaskId)
    : allEvents;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
            Recorded tasks
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="text-[10px] text-zinc-500 transition hover:text-zinc-200"
          >
            refresh
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-1">
          <li>
            <button
              type="button"
              onClick={() => setSelectedTaskId(null)}
              className={`w-full px-4 py-2 text-left text-xs transition ${
                selectedTaskId === null ? 'bg-zinc-800/70 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/40'
              }`}
            >
              All activity
            </button>
          </li>
          {taskIds.map(([taskId, at]) => (
            <li key={taskId}>
              <button
                type="button"
                onClick={() => setSelectedTaskId(taskId)}
                className={`w-full px-4 py-2 text-left transition ${
                  taskId === selectedTaskId ? 'bg-zinc-800/70' : 'hover:bg-zinc-800/40'
                }`}
              >
                <div className="truncate text-xs text-zinc-200">
                  {taskTitles[taskId] ?? shortId(taskId)}
                </div>
                <div className="font-mono text-[10px] text-zinc-600">{formatTime(at)}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <LineageView
        events={visible}
        profiles={profiles}
        title={selectedTaskId ? 'Lineage replay' : 'All activity'}
        subtitle={
          selectedTaskId
            ? `Task ${shortId(selectedTaskId)} in recorded order`
            : 'Every profile, every task, newest last'
        }
        live={streamConnected}
      />
    </div>
  );
}
