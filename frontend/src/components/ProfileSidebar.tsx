import type { Profile } from '../types';
import { bindingLabel, providerOf } from '../ui';

type Props = {
  profiles: Profile[];
  selectedId: string | undefined;
  liveProviders: Record<string, boolean>;
  onSelect: (id: string) => void;
};

export function ProfileSidebar({ profiles, selectedId, liveProviders, onSelect }: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Agents</span>
        <span className="text-xs text-zinc-600">{profiles.length}</span>
      </div>

      <ul className="flex-1 overflow-y-auto py-2">
        {profiles.map((profile) => {
          const provider = providerOf(profile);
          const isLive = liveProviders[provider] ?? false;
          const isSelected = profile.id === selectedId;
          return (
            <li key={profile.id}>
              <button
                type="button"
                onClick={() => onSelect(profile.id)}
                className={`w-full border-l-2 px-4 py-3 text-left transition ${
                  isSelected
                    ? 'border-amber-400 bg-zinc-800/80'
                    : 'border-transparent hover:border-zinc-600 hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-zinc-100">{profile.name}</span>
                  <span
                    title={
                      isLive
                        ? `${provider} credentials configured`
                        : `${provider} running on mock connector`
                    }
                    className={`size-1.5 shrink-0 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                  />
                </div>
                {profile.role ? (
                  <div className="truncate text-xs text-zinc-500">{profile.role}</div>
                ) : null}
                <div className="mt-1 truncate font-mono text-[10px] text-zinc-600">
                  {bindingLabel(profile)}
                </div>
              </button>
            </li>
          );
        })}
        {profiles.length === 0 ? (
          <li className="px-4 py-6 text-xs text-zinc-500">No agents yet.</li>
        ) : null}
      </ul>

      <div className="border-t border-zinc-800 px-4 py-3 text-[10px] leading-relaxed text-zinc-600">
        Agents own role and lineage. The connector binding below each name is swappable without
        changing identity. A filled dot means live credentials; hollow means mock.
      </div>
    </aside>
  );
}
