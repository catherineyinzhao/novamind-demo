# NovaMind · Claude Agent SDK demo (React)

Vite + React + TypeScript UI with the **cream / ink / terra** palette from the original HTML demo. Open **Presentation** first for the leadership brief (markdown); use **Pipeline replay** for the static scenario, and **Live agent** for the streaming demo: a **local Node API** streams **`@anthropic-ai/claude-agent-sdk` `query()`** (Claude Code runtime), opens a **LangSmith** root run, and logs a **Braintrust** span using your API keys (never committed — paste per session or use `.env`).

Trace dashboard URLs are built in `src/lib/traceUrls.ts`; observability ids are persisted in `localStorage` (keys are **not** stored).

## Why Claude Agent SDK (vs only GPT‑5.1 / Gemini APIs)

This is about **orchestration surface area**, not a single-model scoreboard. With typical **chat-completions + tools** integrations (OpenAI, Google, or Anthropic’s own Messages client), **you** usually own the multi-turn tool loop, delegation boundaries, and glue for observability. Anthropic documents the **Claude Agent SDK** as the same **tools, agent loop, and context management that power Claude Code**, as a TypeScript/Python library — including **built-in tools** (Read, Bash, Glob, Grep, …), **MCP** servers, **subagents** via the Agent tool, **hooks**, **permissions**, and **sessions** ([Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview)). The TypeScript package also **bundles the Claude Code-class native binary** for your platform so you do not install Claude Code separately for the harness to run.

For a NovaMind-style stack that is already **OpenAI-forward** but **model-agnostic-curious**, the pragmatic pitch is: keep your eval stack (e.g. LangSmith + Braintrust) and add a **first-class Claude path** where long multi-tool research runs reuse the **same harness** many engineers already use in Claude Code, instead of maintaining a second bespoke agent framework per vendor API.

The **Live** tab sidebar expands this with links into the official docs (MCP, subagents, hooks, sessions).

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
| `npm test` | API smoke tests (`test:smoke`) — health, env-keys, NDJSON stream shape |
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

## Claude Agent SDK platform binary

The Agent SDK ships a **Claude Code**-class native binary per OS/arch. This repo lists **`@anthropic-ai/claude-agent-sdk-darwin-arm64`** so Apple Silicon installs resolve the binary predictably. On **other machines**, add the matching optional package at the **same version** as `@anthropic-ai/claude-agent-sdk` (see `package.json`), then reinstall:

| Host | Package (npm scope `@anthropic-ai/`) |
| ---- | ------------------------------------- |
| macOS Intel | `claude-agent-sdk-darwin-x64` |
| Linux x64 (glibc) | `claude-agent-sdk-linux-x64` |
| Linux x64 (musl) | `claude-agent-sdk-linux-x64-musl` |
| Linux arm64 | `claude-agent-sdk-linux-arm64` |
| Windows x64 | `claude-agent-sdk-win32-x64` |

Example (Linux x64, adjust version to match `claude-agent-sdk` in `package.json`):

```bash
npm install @anthropic-ai/claude-agent-sdk-linux-x64@^0.2.139
```

If the SDK cannot find the binary, set **`CLAUDE_CODE_CLI_PATH`** or **`PATH_TO_CLAUDE_CODE_EXECUTABLE`** (see `.env.example`).

## Rollup native binding (build)

If `vite build` fails with a missing `@rollup/rollup-*` package:

```bash
npm install -D @rollup/rollup-darwin-arm64
```

(Use the package matching your OS/arch.) Or reinstall after removing `node_modules` and the lockfile.

## Smoke tests

```bash
npm test
```

Runs `server/smoke.test.ts` via Node’s test runner (`node --import tsx --test`) against an in-process Express app (`createApp`): `/api/health`, `/api/env-keys`, and `POST /api/agent/stream` NDJSON shape when API keys are temporarily cleared (no network calls to Anthropic).
