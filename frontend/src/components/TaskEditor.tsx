import { useState } from 'react';

type Props = {
  profileName: string;
  busy: boolean;
  onCreate: (title: string, input: string) => Promise<void>;
};

export function TaskEditor({ profileName, busy, onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [input, setInput] = useState('');

  const canSubmit = title.trim().length > 0 && input.trim().length > 0 && !busy;

  async function submit(): Promise<void> {
    if (!canSubmit) return;
    await onCreate(title.trim(), input.trim());
    setTitle('');
    setInput('');
  }

  return (
    <div className="space-y-2 border-b border-zinc-800 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">New task</h3>
        <span className="text-[10px] text-zinc-600">agent: {profileName}</span>
      </div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Task title"
        className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/60 focus:outline-none"
      />
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="What should this profile do?"
        rows={4}
        className="w-full resize-y rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/60 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!canSubmit}
        className="w-full rounded bg-amber-500 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        Create task
      </button>
    </div>
  );
}
