import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'node:http';
import { authorizeUpgrade, readSecurityConfig, type SecurityConfig } from './api/auth.js';
import type { LineageEngine } from './core/LineageEngine.js';

export type LineageSocketMessage = {
  type: 'lineage_event';
  event: unknown;
};

/**
 * Streams lineage events to every connected client. Clients receive events as
 * they are recorded, which is what drives live lineage and the operator console.
 */
export function attachWebSocket(
  server: Server,
  lineage: LineageEngine,
  security: SecurityConfig = readSecurityConfig(),
): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    verifyClient: (info: { req: IncomingMessage }) => authorizeUpgrade(security, info.req),
  });

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
