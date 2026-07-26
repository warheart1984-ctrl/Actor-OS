import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import type { LineageEngine } from './core/LineageEngine.js';

export type LineageSocketMessage = {
  type: 'lineage_event';
  event: unknown;
};

/**
 * Streams lineage events to every connected client. Clients receive events as
 * they are recorded, which is what drives live lineage and the operator console.
 */
export function attachWebSocket(server: Server, lineage: LineageEngine): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  const unsubscribe = lineage.onEvent((event) => {
    const payload = JSON.stringify({ type: 'lineage_event', event } satisfies LineageSocketMessage);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected', at: new Date().toISOString() }));
  });

  wss.on('close', () => {
    unsubscribe();
  });

  return wss;
}
