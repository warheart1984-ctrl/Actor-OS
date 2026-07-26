import { useMemo, useState } from 'react';
import type { AgentGraph as AgentGraphData, AgentMessage } from '../types';

type Props = {
  graph: AgentGraphData;
  onSelectEdge: (from: string, to: string) => Promise<AgentMessage[]>;
};

const SIZE = 460;
const RADIUS = 165;
const CENTER = SIZE / 2;

/** Circular layout of profiles with directed, weighted message edges. */
export function AgentGraph({ graph, onSelectEdge }: Props) {
  const [selected, setSelected] = useState<{ from: string; to: string } | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);

  const positioned = useMemo(
    () =>
      graph.nodes.map((node, index) => {
        const angle = (2 * Math.PI * index) / Math.max(graph.nodes.length, 1) - Math.PI / 2;
        return {
          ...node,
          x: CENTER + RADIUS * Math.cos(angle),
          y: CENTER + RADIUS * Math.sin(angle),
        };
      }),
    [graph.nodes],
  );

  const findNode = (id: string) => positioned.find((node) => node.id === id);
  const nameOf = (id: string): string => graph.nodes.find((node) => node.id === id)?.name ?? id;

  async function selectEdge(from: string, to: string): Promise<void> {
    setSelected({ from, to });
    setMessages(await onSelectEdge(from, to));
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6 lg:flex-row">
      <div className="shrink-0">
        <svg
          width={SIZE}
          height={SIZE}
          className="rounded-lg border border-zinc-800 bg-zinc-900/40"
          role="img"
          aria-label="Agent interaction graph"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-zinc-500" />
            </marker>
          </defs>

          {graph.edges.map((edge) => {
            const from = findNode(edge.from);
            const to = findNode(edge.to);
            if (!from || !to) return null;
            const isSelected = selected?.from === edge.from && selected?.to === edge.to;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                strokeWidth={1 + Math.min(edge.count, 5)}
                markerEnd="url(#arrow)"
                onClick={() => void selectEdge(edge.from, edge.to)}
                className={`cursor-pointer transition ${
                  isSelected ? 'stroke-amber-400' : 'stroke-zinc-700 hover:stroke-zinc-500'
                }`}
              />
            );
          })}

          {positioned.map((node) => (
            <g key={node.id} className="cursor-default">
              <circle cx={node.x} cy={node.y} r={22} className="fill-zinc-800 stroke-zinc-600" />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-zinc-100 text-[10px]"
              >
                {node.name.slice(0, 8)}
              </text>
            </g>
          ))}

          {graph.edges.length === 0 ? (
            <text x={CENTER} y={CENTER} textAnchor="middle" className="fill-zinc-600 text-xs">
              No cross-agent messages yet
            </text>
          ) : null}
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-zinc-100">
          {selected ? `${nameOf(selected.from)} → ${nameOf(selected.to)}` : 'Edge inspector'}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {selected
            ? `${messages.length} messages exchanged on this pair`
            : 'Click an edge to read the messages exchanged between two profiles.'}
        </p>

        <ul className="mt-3 space-y-2">
          {messages.map((message) => (
            <li
              key={message.id}
              className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs"
            >
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>
                  {nameOf(message.from_profile)} → {nameOf(message.to_profile)}
                </span>
                <span className="font-mono">
                  {String(message.metadata_json['type'] ?? 'message')}
                </span>
              </div>
              <p className="mt-1 leading-relaxed whitespace-pre-wrap text-zinc-300">
                {message.content_text.slice(0, 600)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
