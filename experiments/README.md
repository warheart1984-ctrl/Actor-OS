# Experiments

Work built on top of the LineageStudio core that runs locally but is not the
headline. Anything here may change shape, move to its own repo, or be removed.
The core (agents, TaskSpec, ModelRouter, lineage) must never depend on it.

| Experiment | Where it lives |
|---|---|
| **Mandala crew** — 100+ESFR roster, skill catalog, foreman plans | `backend/src/core/MandalaCrewEngine.ts`, `/api/crew`, `frontend/src/pages/MandalaCrewConsole.tsx`, pack in `packs/mandala-crew/`, docs in `docs/mandala-crew/` |
| **Business RTS** — catalog + in-memory session sim | `backend/src/core/Rts*.ts`, `/api/rts`, `frontend/src/rts/`, standalone app in [`rts-app/`](rts-app/), docs in `docs/rts/` |

Only the standalone `rts-app` is physically under this folder; the backend and
studio-UI pieces stay in their workspaces so they build and test with the rest
of the app.

```bash
npm run dev:rts     # backend + rts-app on http://localhost:3001
npm run crew:smoke
npm run rts:smoke
```
