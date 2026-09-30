import { useEffect, useRef, useState } from 'react';
import { getApiToken } from '../api/client';
import type { LineageEvent } from '../types';

type SocketPayload =
  | { type: 'lineage_event'; event: LineageEvent }
  | { type: 'connected'; at: string };

export type LineageStream = {
  events: LineageEvent[];
  connected: boolean;
};

/**
 * Subscribes to the backend lineage stream. Events accumulate in arrival order
 * and are capped so a long session cannot grow without bound.
 */
export function useLineageStream(limit = 500, authVersion = 0): LineageStream {
  const [events, setEvents] = useState<LineageEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Browsers cannot set headers on a WebSocket, so the token rides the query.
    const token = getApiToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws${query}`);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (message: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(message.data) as SocketPayload;
        if (payload.type === 'lineage_event') {
          setEvents((previous) => [...previous, payload.event].slice(-limit));
        }
      } catch {
        // A malformed frame should not tear down the stream.
      }
    };

    return () => socket.close();
  }, [limit, authVersion]);

  return { events, connected };
}
