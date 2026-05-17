# Live demo info

Reference for what the **Live agent** tab runs: one **`query()`** session on the main thread, **Agent**-tool delegations to four specialists, and MCP tools wired per lane. Execution is **sequential** today — literature completes (with an orchestrator checkpoint) before data starts.

**Quick map:** Orchestrator (main thread) → Literature review → Data analysis → Hypothesis generation → Citation audit.

---

## How subagents are wired (server)

Subagents are **not** separate HTTP calls you make from the UI. They are **`AgentDefinition` entries** on the same `query()` options object, keyed by `subagent_type` strings the orchestrator passes to the **Agent** tool:

| SDK key (`subagent_type`) | Role |
| --- | --- |
| `literature-review` | External PubMed plane |
| `data-analysis` | Client experimental plane |
| `hypothesis-generation` | Cross-plane synthesis, no tools |
| `citation-audit` | PMID verification only |

**Hardcoded in this demo (and why):**

- **System prompts** — `server/researchPrompts.ts` (`LITERATURE_AGENT_SYSTEM`, `DATA_AGENT_SYSTEM`, etc.). These encode NovaMind protocol (query counts, memo headings, citation rules). They ship with the repo so the Live demo is reproducible without a prompt CMS.
- **Tool allowlists per lane** — each `AgentDefinition.tools` array lists only the MCP tools that lane may call (e.g. literature gets `mcp__novamind__query_pubmed_corpus` only). The SDK enforces scope; the model cannot invoke out-of-lane tools even if it tries.
- **Orchestrator user prompt** — `buildPipelineSdkUserPrompt()` wraps your Live textarea task in a full delegation protocol (planning package, checkpoints, ordered Agent calls). Same file family as the specialist prompts.
- **Models** — orchestrator defaults to **Opus-class**; all four specialists share the **worker** model you pick in the sidebar (Sonnet-class by default). Per-lane model IDs are config knobs in `runAgentSdkLive.ts`, not UI-editable per run.
- **Hooks** — `SubagentStart` / `SubagentStop` in `runAgentSdkLive.ts` drive phase events, LangSmith child runs, and Braintrust nested spans. That wiring is demo-specific observability, not generic SDK behavior.

**What is *not* hardcoded:** the **research task text** in the Live prompt box — that is injected into the orchestrator prompt each run. Everything else about *shape* of the pipeline is fixed for the CTO demo.

---

## Orchestrator (main thread)

The orchestrator is **not** a subagent — it is the **primary thread** model. Every specialist is delegated from here.

- **Model:** Opus-class (**`claude-opus-4-7`** by default) — heaviest SKU for decomposition, run-wide policy, and reasoning **between** delegations.
- **Tools:** **`Agent` only** — no direct MCP. Strategy and coordination stay on the main thread; execution stays in specialists. If the orchestrator could call PubMed directly, it could collapse the pipeline into one pass and defeat the architecture.

### What it produces

- **Planning document** — delegate strategy, citation policy (**tool PMIDs only**, zero tolerance for hallucination), context budget notes.
- **Risk register** — at least two bullets (corpus blind spots, biomarker ambiguity, cohort mismatch).
- **Per-phase success criteria** — one bullet each for literature, data, hypothesis, and citation “done well.”
- **Fenced JSON** `nova_delegate_plan` — phase structure and eval dimensions.
- **Checkpoint after literature** — what landed, what’s uncertain, what data should stress-test.
- **Checkpoint after data** — where client signals **support**, **tension**, or **don’t address** literature claims.
- **Agent tool calls** that start each subagent.

**Checkpoints matter.** They are active reasoning on what just returned — not passive routing. That is what makes this an **orchestrator**, not a thin dispatcher.

*(Agents are instructed to use markdown headings in their outputs — e.g. “Checkpoint · after literature”. Those render in the feed as normal markdown, not as UI section titles on this tab.)*

---

## Literature review subagent

| | |
| --- | --- |
| **SDK key** | `literature-review` |
| **Receives** | Full research task + orchestrator plan excerpt, risk register, and success criteria — passed in the orchestrator’s **Agent** tool message. |
| **Tools** | `mcp__novamind__query_pubmed_corpus` only |
| **Model** | Worker lane (Sonnet-class by default) |
| **System prompt** | `LITERATURE_AGENT_SYSTEM` in `researchPrompts.ts` |

### What it does

The literature agent is prompted to **search like a human reviewer**, not to spam the same keyword string until the context window fills.

**Minimum two queries, different intent each time.** “Orthogonal” here means the `query` argument should stress **different facets** of the same research task — for example:

| Query angle | Example focus (KRAS G12C / STK11 demo) |
| --- | --- |
| Mechanism / pathway | Bypass signaling, STK11/LKB1 loss, MAPK feedback after G12C inhibition |
| Clinical resistance | Acquired mutations, duration of response, post-sotorasib escape |
| Combination / salvage | MEK/SHP2 combinations, rechallenge, next-line strategy |

The system prompt explicitly forbids **repeating the same query text**. The point is **coverage across dimensions** (biology vs clinic vs therapeutic strategy), not redundant retrieval of the same abstract set with minor wording tweaks.

**Optional third query** when the first two returns are **thin** (few snippets), **contradictory** (different mechanisms dominate), or **clearly incomplete** relative to the orchestrator’s risk register (e.g. corpus blind spot on STK11 co-mutation biology). The agent decides; the protocol does not hard-code a third call.

**Typical beat inside the subagent:** a short **Plan** (what angles it will query and why), then `query_pubmed_corpus` tool calls, then synthesis. In the Live feed you see each call as **tool_use** / tool_result JSON under the **Literature review** phase prefix.

**Demo vs production:** In this repo, `executeDemoTool` returns the **same three fictional PMIDs** regardless of query wording — `query_used` is echoed in JSON so you can see the agent *tried* different strings, but snippets do not change. Production would hit NovaMind’s ingested PubMed index (~3y) and return query-dependent hits. The **protocol** (multi-angle search) is real; the **corpus** is stubbed.

### What it produces

A **Literature synthesis** section — concise bullets, each tied to **PMID prefixes from tool output only**. Training knowledge is not admissible; only tool-returned PMIDs count.

### Why it is isolated

No access to NovaMind **internal experimental data** — external knowledge plane only. Hypothesis work needs a clean split between “what papers say” and “what our lab found.”

### Side effect (citation governance)

Every PMID returned by the tool is recorded in **`sessionAdmissiblePmids`** in the MCP subprocess. The literature agent builds the **citation allowlist** passively while searching — no separate manual step.

---

## Data analysis subagent

| | |
| --- | --- |
| **SDK key** | `data-analysis` |
| **Receives** | Literature synthesis + orchestrator **checkpoint after literature** (themes to validate / stress-test). |
| **Tools** | `mcp__novamind__fetch_experiment_summary`, `mcp__novamind__demo_endpoint_trajectory` |
| **Model** | Worker lane |
| **System prompt** | `DATA_AGENT_SYSTEM` |

### What it does

The data agent’s job is **not** to re-do literature search. It takes the **literature synthesis** plus the orchestrator’s **checkpoint after literature** (which themes landed, what to validate or stress-test) and asks: *does our client experimental plane agree, disagree, or stay silent?*

**Step 1 — Two `fetch_experiment_summary` calls (required).** Each call returns structured PDX-style JSON: arms, best response, duration, an `emerging_signal` string. The prompt forces **two different analytical intents**:

| Call | `cohort_id` intent | Purpose |
| --- | --- | --- |
| **First** | Omit `cohort_id` or use a stable default (demo uses `novamind-demo-cohort`) | Baseline read on the panel — “what does our default cohort look like?” |
| **Second** | A **distinct label** tied to one literature theme | Stress-test a specific hypothesis from the checkpoint — e.g. `MAPK_recovery_arm` (bypass / MEK-combo story), `STK11_loss_enriched` (co-mutation biology), `combo_exploratory` (salvage combinations) |

The agent should **compare** the two JSON payloads in prose: same model line in the stub, but the second `cohort_id` is how you practice “slice the cohort by the story literature surfaced.” In production, each id would map to a real warehouse slice with different endpoint tables; in the demo, the JSON shape is identical except for `cohort_id` and the agent must still articulate **supported / tension / not addressed** per literature claim.

**Step 2 — One `demo_endpoint_trajectory` call (required).** Returns a **deterministic SVG** (fixed tumor-volume index curve) embedded in markdown. No Python, no matplotlib, no arbitrary code execution — it stands in for “attach a client-facing chart to the same LangSmith/Braintrust trace as the numeric summary.” The data memo should **reference** this figure when explaining how charts would ship alongside tables in a real workflow.

**Step 3 — Map every important literature claim** to one of three states using **both** fetches (and the chart where useful):

- **Supported** — client data corroborates or directionally aligns with the paper claim.
- **Tension** — client data contradicts, weakens, or complicates the literature story.
- **Not addressed** — no signal in the experimental plane for that claim (absence of evidence, not evidence of absence).

Name which fetch (or the trajectory artifact) backs each judgment when possible. That discipline is what the hypothesis agent needs for clean cross-plane ranking.

**Typical beat in the feed:** tool results appear under **Data analysis** only — no PubMed tools. If you see `query_pubmed_corpus` here, something is mis-routed.

**Demo note:** `cohort_id` changes the **label** in stub JSON only; `executeDemoTool` does not query a LIMS. The **comparison ritual** (two slices + one chart) is what the prompt encodes; production would swap in real sponsor APIs behind the same MCP surface.

### What it produces

A **Data analysis memo** — each literature claim mapped to **supported**, **tension**, or **not addressed** by cohort signals. Structured three-way mapping so hypothesis can reason cleanly.

### Why it is isolated

**No PubMed access** — internal data plane only. Hypothesis must know **which plane** each piece of evidence came from.

---

## Hypothesis generation subagent

| | |
| --- | --- |
| **SDK key** | `hypothesis-generation` |
| **Receives** | Orchestrator planning + **both checkpoints**, literature synthesis (with PMIDs), data memo — richest handoff in the pipeline. |
| **Tools** | **None** (`tools: []` on the AgentDefinition) |
| **Model** | Worker lane |
| **System prompt** | `HYPOTHESIS_AGENT_SYSTEM` |

### What it does (three mandatory beats)

1. **Cross-plane reconciliation** — 2–3 bullets tying literature PMIDs to data signals **before** ranking.
2. **Ranked hypotheses** — mechanism, evidence from **both** planes, concrete validation experiment per row.
3. **Citation hygiene** — PMIDs that could only have come from prior literature tool returns.

Fenced JSON in the memo supports **eval parsers** and programmatic PMID extraction for citation audit / Braintrust scorers.

### Why no tools

Synthesis **only from this run’s retrieved evidence** — no new PubMed pulls or cohort queries that bypass prior gates. An empty tool list is the enforcement mechanism: the SDK cannot grant tools the definition does not list. Quality of orchestration + handoffs **is** quality of hypotheses.

---

## Citation audit subagent

| | |
| --- | --- |
| **SDK key** | `citation-audit` |
| **Receives** | Full hypothesis memo from the orchestrator’s **Agent** handoff — especially **Ranked hypotheses** and fenced JSON where PMIDs appear. |
| **Tools** | `mcp__novamind__verify_claimed_pmids` only |
| **Model** | Worker lane |
| **System prompt** | `CITATION_AGENT_SYSTEM` |

### What it does

1. **Plan** — list every PMID-shaped string in the handoff (extraction only, no verification yet).
2. Call **`verify_claimed_pmids`** once with a deduplicated `claimed_pmids` array.
3. **Citation audit** section — admissible vs **unknown_or_hallucinated**, plus what would break **citation_accuracy** scorers if unresolved PMIDs remain.

### Why it is isolated

No PubMed or experiment tools — **verification against the session allowlist only**. If this agent could call `query_pubmed_corpus`, it could “verify” hallucinated PMIDs by fetching new text — defeating governance.

### How it closes the loop

**`sessionAdmissiblePmids`** was populated by literature **`query_pubmed_corpus`** returns in the **same MCP stdio process** for this run. A PMID either appeared in a tool result or it did not. The citation agent reads that state; the orchestrator does not manually maintain allowlists.

---

## MCP tools (demo server)

The Agent SDK launches a **stdio MCP server** (`server/mcp/novamindDemoMcp.ts`) as `mcpServers.novamind`. Tools are exposed to the model as `mcp__novamind__<tool_name>`. Implementation splits into two layers:

1. **MCP layer** — protocol, schemas, session state (`sessionAdmissiblePmids`).
2. **Stub layer** — `executeDemoTool()` in `server/demoTools.ts` returns **deterministic JSON/SVG** so demos work without PubMed APIs, LIMS, or chart services.

### query_pubmed_corpus (literature lane)

| | |
| --- | --- |
| **Inputs** | `query` (string), optional `max_results` (1–5) |
| **Hardcoded behavior** | Always returns a small fixed set of fictional snippets (`demo-903214`, `demo-771902`, `demo-445821`) sliced by `max_results`. Query string is echoed in JSON as `query_used` but **does not change** which papers appear — production would hit NovaMind’s ingested index. |
| **Why stub** | Live tab must run offline-friendly, fast, and citation-governable without API keys to PubMed. |
| **Session side effect** | MCP parses `[PMID:…]` from JSON snippets and adds each ID to **`sessionAdmissiblePmids`** for the lifetime of that MCP process (one Agent SDK session). |

### fetch_experiment_summary (data lane)

| | |
| --- | --- |
| **Inputs** | Optional `cohort_id` (string label) |
| **Hardcoded behavior** | Returns synthetic PDX-style JSON: two arms, durations, `emerging_signal` text. `cohort_id` is reflected in the payload label only — not a real warehouse slice. |
| **Why stub** | Stands in for sponsor/LIMS-backed cohort queries; keeps data plane separate from PubMed in the demo. |
| **Protocol** | System prompt requires **two** calls with different cohort intent so the model practices cross-slice reasoning. |

### demo_endpoint_trajectory (data lane)

| | |
| --- | --- |
| **Inputs** | Optional `cohort_id` (caption; ignored in stub) |
| **Hardcoded behavior** | Returns a **fixed SVG polyline** (tumor volume index) embedded in markdown. No Python/matplotlib execution. |
| **Why stub** | Shows how chart artifacts attach to the same trace/session as tool JSON — production would call a viz service or sandboxed notebook runner. |

### verify_claimed_pmids (citation lane)

| | |
| --- | --- |
| **Inputs** | `claimed_pmids`: string array |
| **Hardcoded behavior** | Compares each ID to **`sessionAdmissiblePmids`** only. Returns JSON: `admissible`, `unknown_or_hallucinated`, `session_corpus_hits`, `policy_note`. **No network lookup** — cannot “fix” bad PMIDs by fetching PubMed. |
| **Why stub** | Makes citation governance **mechanical**: admissible means “appeared in an earlier tool return this session,” matching Braintrust **citation grounding** scorers on the Live eval readout. |

### Production vs this demo

| Concern | Demo | Production direction |
| --- | --- | --- |
| PubMed | Fixed fictional PMIDs | Real ingestion + semantic retrieval over ~3y corpus |
| Experiments | Canned JSON | Tenant-scoped LIMS / PDX APIs with ACLs |
| Charts | Deterministic SVG | Hosted viz or approved execution environment |
| Allowlist | In-memory Set in MCP process | Durable session store keyed by `session_id` / `ResearchTask` |
| MCP host | Child stdio process per run | Same pattern; swap stub handlers for real services |

---

## What to watch on the Live tab

- **Phase rail** — sequential dots and wall times per phase.
- **Feed** — orchestrator checkpoints, specialist memos, tool JSON, streaming text.
- **Eval readout** — citation grounding from latest **`verify_claimed_pmids`** result.
- **Orchestration & traces** — LangSmith child runs and Braintrust spans aligned to subagent boundaries.
