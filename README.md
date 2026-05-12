# NovaMind · Claude Agent SDK demo (React)

Vite + React + TypeScript UI with the **cream / ink / terra** palette from the original HTML demo. **Live agent** calls a **local Node API** that streams **`@anthropic-ai/claude-agent-sdk` `query()`** (Claude Code runtime), opens a **LangSmith** root run, and logs a **Braintrust** span using your API keys (never committed — paste per session or use `.env`).

Trace dashboard URLs are built in `src/lib/traceUrls.ts`; observability ids are persisted in `localStorage` (keys are **not** stored).

## API keys (`.env`)

Copy **`.env.example`** to **`.env`** in the repo root and set:

| Variable | Purpose |
| -------- | ------- |
| `ANTHROPIC_API_KEY` | Anthropic |
| `LANGSMITH_API_KEY` | LangSmith (or use `LANGCHAIN_API_KEY` instead) |
| `BRAINTRUST_API_KEY` | Braintrust |

The API server loads these via `dotenv` (`import 'dotenv/config'` in `server/index.ts`). Request body keys from the UI **override** `.env` when provided; leave all three UI fields **empty** to use only `.env`.

## Prerequisites

- Node 20+
- API keys in **`.env`** and/or pasted in the Live tab (see above)

## Scripts

| Command | Description |
| -------- | ----------- |
| `npm run dev` | **API** (`tsx` on port **8787**) + **Vite** (port **5173**); Vite proxies `/api` → API |
| `npm run dev:api` | API only |
| `npm run dev:web` | Frontend only (needs API elsewhere for Live tab) |
| `npm run build` | Typecheck + Vite production bundle (`dist/`) |
| `npm run preview` | Static preview of `dist/` — **no API** unless you run it separately |

## Live agent flow

1. Add keys via **`.env`** and/or the sidebar (session-only in the browser when pasted).
2. Set **Trace configuration** (org slug, project name, LangSmith tenant, etc.) for correct dashboard links.
3. **Run** sends `POST /api/agent/stream` → NDJSON events → feed blocks + observability log.
4. The server creates a LangSmith run id and returns it to the UI (fed into **LangSmith run id** for deep links). Braintrust receives a span via `initLogger` + `startSpan` + `flush`.

Environment overrides for the API process:

- `PORT` — default `8787`
- `ANTHROPIC_MODEL` — default `claude-sonnet-4-5-20250929`

## Layout

- **Pipeline replay** — **Play** runs a **scripted** multi-step replay (span tree, feed cards, metrics); no network calls.
- **Live agent** — real streaming + **Stop** (`AbortController`); research pipeline via Agent SDK + MCP + subagents.

The main content area (below the tab bar) **scrolls vertically** when a page is taller than the viewport.

## Trace links

Helpers: `langSmithRunUrl`, `langSmithProjectUrl`, `braintrustExperimentUrl`, `braintrustProjectUrl`. LangSmith **project** field should match the **project name** used when creating runs. EU tenants: set region to `eu` in Trace configuration.

## Production / deployment

Ship the **API** alongside the static site (same host is ideal so keys are only sent to your backend over HTTPS). Point Vite’s proxy equivalent (nginx, etc.) at the Node service for `/api`. Do **not** expose users’ keys to third-party frontends.

## Rollup native binding (build)

If `vite build` fails with a missing `@rollup/rollup-*` package:

```bash
npm install -D @rollup/rollup-darwin-arm64
```

(Use the package matching your OS/arch.) Or reinstall after removing `node_modules` and the lockfile.
