# Claude Agent SDK for NovaMind

**Anthropic** · Executive briefing for **NovaMind** CEO / CTO.

**Key considerations:** Why the Agent SDK · Eval framework · What to build first

**Terms:** **Claude** is our model family (Opus / Sonnet / Haiku). The **Agent SDK** is our **library** for the **multi-step tool loop**—Claude requests tools, your process executes them, results return, repeat—like **Claude Code** in **your** services ([Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview)).

This document is a **companion to the Presentation tab** ([`leadershipSlides.md`](leadershipSlides.md)). Sections follow **the same order and titles** as the slides; prose here **expands** what is on each slide—it does not introduce a parallel outline.

---

## NovaMind today — architecture and considerations

NovaMind is a **semi-autonomous research agent** with specialized sub-agents for **literature review**, **data analysis**, and **hypothesis generation**. The team has built **document ingestion** and a **RAG pipeline** for semantic retrieval over **PubMed** articles from roughly the **last ~3 years**. The **data-analysis** agent proactively **validates** themes against the **client’s experimental data**. Early work focuses on **agentic search** and **context management** so **long trajectories** stay coherent and effective.

**Your priorities (why this briefing exists):**

- **Reliability**, **latency**, and **structured outputs** in **production**
- **Migration complexity** and a **fair comparison** against the **current OpenAI stack**
- Clear **“why switch?”** — differentiation and product improvement, not a logo swap
- **Speed of evaluation** without disrupting the **roadmap** or **existing customers**

---

## Part 1 — Why the Agent SDK

### Part 1 · Three breakpoints in NovaMind-shaped research

NovaMind’s workflow is **literature ∥ data → hypothesis → citation-checked Hypothesis deliverable**—not one long chat.

The **Agent SDK harness** is the **productized tool loop** (`query()`, events, agent definitions, tools/MCP, hooks, structured outputs—the **Claude Code** family). It is where **parallelism**, **resume**, and **passage-grounded evidence** stay **enforceable** under tenant and audit load.

| Breakpoint | Without a primitive | Agent SDK primitive |
| --- | --- | --- |
| **1 · Parallel lanes** | Serial lit → data (**45+ min** class) **or** one parent transcript absorbs every abstract | **[Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)** — wall → **max(lit, data)** when independent |
| **2 · Durable job identity** | Timeout at minute 25 → **re-run ~40 PubMed pulls**; weak audit mid-flight | **[Sessions](https://docs.anthropic.com/en/agent-sdk/sessions)** — `session_id`, **resume**/fork |
| **3 · Deliverable tied to retrieved text** | PMID looks right but **passage doesn’t match** abstract | **[Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)** + validators — evidence **before** bounded synthesis |

**Walkthrough:** **`query()`** → parallel **literature** and **data** subagents → typed merge → **`resume(session_id)`** on interrupt → passage-grounded rows → **Hypothesis deliverable**.

### Part 1 — Primitives glossary

A **`ResearchTask`** is one customer job—inputs, expected **Hypothesis deliverable** JSON, tenant ids, SLA. **One `ResearchTask` → one `session_id` → many tool turns.**

| Primitive | Plain English | NovaMind use |
| --- | --- | --- |
| **Subagents** | Child Claude with its own transcript | Literature, data, hypothesis, citation audit **lanes** |
| **Sessions** | Save and **resume** multi-step state | Long PubMed fan-out without “new chat amnesia” |
| **Hooks** | Code **before/after** tools | Sandbox, audit, deny unsafe writes |
| **MCP** | Standard wire-up for **your** tools | PubMed RAG, sponsor tables, Braintrust scorers |
| **Structured outputs** | Schema **across tool turns** | **Hypothesis deliverable** after real MCP traffic |

**Models vs primitives:** the **model** is the engine; **primitives** are the frame—whether the vehicle is **operable** under tenants, audit, and load.

### Part 1 · Latency and routing (production)

A **`ResearchTask`** combines **routing**, **evidence-heavy retrieval**, **synthesis**, and **structured output**—different **cognitive loads**; **one flagship everywhere** over-pays or under-delivers. The Agent SDK sets **`model` per agent/lane** as **config**.

**Claude family (defaults—your fixtures decide):** Opus / Sonnet / Haiku differ in **deep reasoning vs cheap coordination** ([models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)).

**Problem:** customers care about **p95/p99** and **$/completed ResearchTask**, not short chat benchmarks.

**Without a harness:** model choice welded into monolithic prompts; hard to tune **per lane** or measure tails on **your** mix.

**With the Agent SDK:** **`AgentDefinition`** per lane; benchmark TTFT and tails on frozen end-to-end runs (Part 2).

**`AgentDefinition`** holds name, instructions, tools, **`model`**. **Routing** = which definition runs coordinator vs literature vs hypothesis.

| Agent lane | Model class | Rationale |
| --- | --- | --- |
| **Coordinator** | Sonnet-class | Merge, delegate, customer-visible quality |
| **Literature** | Sonnet-class | Tool-heavy retrieval + evidence JSON |
| **Hypothesis** | Opus-class | Deepest mechanistic reasoning |
| **Routing / light extract** | Haiku-class | Cheap structure when classification-shaped |

Measure **TTFT, p50/p95/p99** on **your** `ResearchTask` mix before claiming any small-model win.

### Part 1 · Harness vs model — the Agent SDK premise (Messages reality)

**Problem:** NovaMind needs a **governed multi-agent research system**—dozens of tool rounds, **parallel** lanes, **Hypothesis deliverable** after real traffic, ACLs, audit—not “a smarter completion.”

**Two questions:** **Messages API** — “what next in **this thread**?” **NovaMind** — “how do we run a **long, tool-heavy, tenant-governed** job to a **repeatable deliverable**?” That second job lives in **everything you wrap around** the API.

**Without a harness:** you own the **`while`**, routing, sessions, JSON enforcement on Messages—**every** release and lane. A **stronger SKU** does not give you merge, schema under load, or audit for **multi-hour** `ResearchTask` work.

**With the Agent SDK:** same loop shape as **Claude Code**—you **`query()`**, pass agents/tools/hooks, **subscribe to events**—depth stays on **PubMed, sponsor, Hypothesis, policy**.

**Coordinator path:** ingest **`ResearchTask`** → delegate **literature** and **data** when allowed → merge **typed JSON** → **hypothesis** → **Hypothesis deliverable**.

**The loop (every vendor):** `tool_use` → your process executes → `tool_result` → repeat → finalize structured output.

| Investment | What you’re buying |
| --- | --- |
| **Model upgrade** | Better reasoning **per step** |
| **Harness (Agent SDK)** | Operable **multi-agent pipeline** |

| Messages-centric, you typically own… | Agent SDK shifts toward… |
| --- | --- |
| Tool loop, streaming, recovery | **`query()`** + events |
| Merge, routing, context growth | **`AgentDefinition` + subagents** |
| Tenant / tool policy in app code | **Hooks + permissions** |
| JSON + observability glue | **Structured outputs + sessions** |

### Part 1 · Harness vs Messages API — who owns the loop? (code)

Same governed system: **Messages `while` loop you maintain** vs **Agent SDK runs the loop** while you configure agents, hooks, schema, session.

**Messages (left):** `stop_reason == tool_use` only means “model wants a tool”—parallel subagents, merge, truncation, retries, session, schema, audit are **your** code in `execute_tool` and around `messages`.

**Agent SDK (right):** `sdk.query(task, agents, hooks, schema, session_id)` — you ship **MCP, ACLs, schema, hooks**; not another bespoke interpreter.

### Part 1 · Structured outputs — enforcement with the Agent SDK

**Without the harness:** **Hypothesis deliverable** validated **after** the tool loop—scrape last turn, retry into growing transcript.

**With the Agent SDK:** **[Structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)** on **`query()`**—schema part of the **same run** as MCP and subagents.

- **Schema on the job** — `schema=HypothesisDeliverable` (and per-lane handoff types) inside orchestration
- **At handoff boundaries** — lit / data / merge steps end in **typed JSON** before downstream consumption
- **Retries that respect structure** — log, alert, targeted retry at the **boundary** that broke

Customers get a deliverable **enforced on the production harness path**, not only parsed from prose.

### Part 1 · Board mandate — model agnosticism at the harness level

**Problem:** every new SKU feels like a **rewrite** of prompts, routes, PubMed, Hypothesis schema.

**Without a harness:** vendor baked into architecture.

**With the Agent SDK:** workflow shape fixed; **`AgentDefinition.model`** is **per-lane config** validated on **frozen `ResearchTask` eval** (Part 2).

When a better model ships, **change the model field (and validate)**—not re-architect delegation, MCP, hooks, or schema wiring. Example: update **`literature_review.model`** after frozen eval wins—PubMed MCP and hooks unchanged.

### Part 1 · Subagents — specialists without flooding the parent

**Coordinator = engagement lead; subagent = consultant** with a **one-page brief**, not the scratchpad.

| Without subagents | With subagents |
| --- | --- |
| One transcript absorbs every PubMed hit | Child contexts; parent sees **handoff** |
| Sequential lit → data → hypothesis | **Parallel** lit ∥ data |
| One system prompt blob | **Per-lane** prompts and **tool allowlists** |

**Reference pipeline:** coordinator → **literature ∥ data** → **hypothesis** → **citation audit**. See [Subagents](https://docs.anthropic.com/en/agent-sdk/subagents); **`AgentDefinition` fields** in deck appendix.

### Part 1 · Reliability (A) — Citations API and regulated framing

**Problem:** QA reviews **summaries**; models produce **plausible PMIDs** with **wrong passages**—compliance liability.

**Without a harness:** “cite your sources” in prompt; weak link claim ↔ span.

**With the Agent SDK:** **[Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)** + **your PubMed MCP** + Part 2 **citation grounding** scorer.

Production **PubMed ~3y** stays **NovaMind RAG + MCP + ACLs**. **WebFetch** is not regulated PubMed production.

### Part 1 · Reliability (B) — Adaptive thinking, effort, compaction

**Problem:** long fan-out fills context; compaction **drops** passage detail citations need.

**Without a harness:** compaction = cheaper tokens; citation regressions with no archived fingerprints.

**With the Agent SDK:** thinking as **budget knob** on hypothesis; **archive-before-compaction** via hooks when context management is on.

**OpenAI compatibility** path: no prompt caching / full thinking visibility—**citations, structured outputs, caching** on **native** Claude + Agent SDK.

### Part 1 · Hooks — production control and audit trail

**Problem:** model paths/URLs/shell are untrusted; pharma needs **deny-by-code** and **prove what was retrieved**.

**Without a harness:** post-hoc logs; policy drifts from `allowed_tools`.

**With the Agent SDK:** **[Hooks](https://docs.anthropic.com/en/agent-sdk/hooks)** — **PreToolUse** blocks bad writes/shell; **PostToolUse** audit rows (query, PMIDs, tenant/session ids).

**Patterns:** sandbox **Write/Edit/Bash**; optional host allowlists on egress; **PostToolUse** on MCP with structured audit fields; **archive before compaction** when evidence must survive summarization.

### Part 1 · Sessions — why durable state matters

**Problem:** **`ResearchTask`** is **multi-hour**—deploys and pauses should not force **expensive replay** or lose “what the model saw at step 37.”

**Without a harness:** “resume” = human summary—lossy for citations.

**With the Agent SDK:** stable **`session_id`**; **`resume`** and **`fork`** without throwing away the tool graph. Sessions = **job identity**, not the same as prompt-token cache.

- **`resume(session_id)`** — same job after deploy/timeout; PubMed and sponsor work already paid for stay attached
- **`fork`** — new branch for **what-if** without overwriting the audited parent in flight

### Part 1 · MCP — data plane for PubMed, sponsor, and eval

**Problem:** PHI/SQL in prompts; bespoke REST per squad; eval fixtures **drift** from production.

**Without a harness:** secrets in prompts; inconsistent PubMed routes.

**With the Agent SDK:** **[MCP](https://docs.anthropic.com/en/agent-sdk/mcp)** — `mcp__<server>__<action>`; auth and row-level rules **server-side**.

**NovaMind-shaped servers:** PubMed ~3y RAG · sponsor cohort readers · **`verify_claimed_pmids`** · optional Braintrust scorers. Anthropic **`pubmed@life-sciences`** = demo; **tenant-regulated** corpus = **your** MCP.

### Part 1 · Agent Skills — building reusable domain packages for pharma customers

**Skill** = folder loaded **on demand** (`SKILL.md` under **`.claude/skills/<name>/`**): procedures, rubrics, exemplars—**version in git** like policy.

**Platform reach:** Claude.ai, Claude Code, Agent SDK, Developer Platform ([overview](https://docs.anthropic.com/en/agent-sdk/overview)).

**NovaMind example:** **`drug-discovery-research`**-style pack for PubMed patterns, evidence rubric, citation hygiene, sponsor guardrails—**`ResearchTask`** parameterizes TA/tenant without forking the whole tree.

---

## Part 2 — Evaluation framework

Six slides on frozen **`ResearchTask`** rows: **failure modes → freeze → two arms → two scorers → two-week plan → readout**.

### Part 2 · Step 1 · Four failure modes to measure

Name what can go wrong **before** metrics.

1. **Structured output drift** — valid JSON turn 1, broken turn 30; empty **`passage`** strings; invisible to one-shot benchmarks under **real tool load**.
2. **Citation integrity collapse** — plausible PMIDs, wrong/missing passages; passes schema; fails human/compliance trace.
3. **Long-context synthesis degradation** — contradictions, incomplete synthesis; often **human rubric** on a subset.
4. **Cost and latency tail risk** — correct at **p50**, **timeout at p95**; where **parallel** and **resume** matter most.

**Do not average** across modes—a 0.98 / 0.60 split is **diagnosable**, not “79%.”

### Part 2 · Step 2 · What to freeze before you run anything

Freeze **four things** before run 1; asymmetry or post-hoc scorers void the readout.

**`fixtures@v1` (15–20 rows, stratified):**

- **5** high-complexity (p95, context bloat)
- **5** medium (typical load)
- **5** known-failure (production/QA failures on GPT‑5.1—most credible signal)
- **3–5** adversarial (retries, empty-vs-drift fields, bad tool returns)

Tag **`fixtures@v1`**; **immutable** mid-eval; **`fixtures@v2`** ⇒ **rerun every arm**.

**Ground truth per row (before either pipeline):** allowlisted PMIDs; expected passages for ≥**3** claims; expected **`HypothesisDeliverable`** shape; known anomalies.

**MCP:** same servers/versions; **stubs/replay** per row—pinned, not live corpora that drift by date.

**Scorers:** defined in **code** upfront (Step 4)—lock, version, identical on every arm.

### Part 2 · Step 3 · The two arms — what each represents

**Arm 1 — Baseline: GPT‑5.1 Messages API**

- Run **as production today**—retries, re-prompt glue, post-hoc validators (no fake “clean” baseline)
- Tags: `arm=messages-api`, `model=gpt-5.1`, `research_task_id`

**Arm 2 — Target: Agent SDK parallel specialist pipeline**

- Parallel lit + data → coordinator merge → hypothesis; **`session_id`**, **`citation_allowlist`**, **`audit_logger`**
- Tags: `arm=agent-sdk`, `model=claude-sonnet` (or per-lane), `research_task_id`

**Optional (Week 2):** **Gemini 3** in Arm 2 harness—**model** knob only.

Fair comparison rules, **Sub-test A vs B**, and **four-configuration attribution** are executed per **Step 5** (not a separate deck slide).

### Part 2 · Step 4 · Scorers — citation grounding and time-to-valid

**Two Braintrust scorers**—define in code, version, run **identically** on every arm.

**Citation grounding rate**

- **Pass if:** non-empty `passage`, `pmid` in allowlist, `passage` substring of that PMID’s abstract
- **Score:** fraction of `supporting_evidence` rows passing all three
- **Target:** ≥ **0.95** on known-good; **<0.80** on any row → stop-ship

**Time-to-valid**

- Wall clock from `ResearchTask` start to accepted **`HypothesisDeliverable`**
- Report **p50** and **p95** on frozen set—**p95** is where parallel lanes and resume show up
- **Target:** match/beat baseline **p50**; **p95** should improve on high-complexity rows

**Braintrust:** one project **`research-pipeline-eval`**; tag **`arm`**, **`model`**, **`research_task_id`**, **`week`**.

Inspect **`schema_violations_during_run`** in outputs/traces when trajectory quality matters—it is **not** a third Braintrust scorer. **Week 3** kill/resume validates durability separately.

### Part 2 · Step 5 · Two-week execution plan

**Pre-work (~1 day):** lock **`fixtures@v1`**, ground truth, MCP stubs, both scorers on **2–3** warm-up rows (not in main eval), **preflight** both arms—if either fails E2E on warm-up, **stop**.

**Week 1 — Measure and calibrate**

- **Days 1–2 — Sub-test A:** each model vs **`HypothesisDeliverable`** in a **single clean prompt** on all frozen rows (JSON/scoring infra)
- **Days 2–4 — Sub-test B (literature only):** Agent SDK literature subagent alone; **citation grounding** only—fix citations **before** full stack
- **Day 5 — Baseline full run:** GPT‑5.1 Messages on all rows; **both** scorers—if materially off existing Braintrust on **same rows**, **stop**
- **Checkpoint:** Sub-test A, literature citation, baseline **citation + time-to-valid** trends

**Week 2 — Full pipeline and decision**

- **Days 1–2 — Full Agent SDK Sub-test B:** parallel pipeline; **both** scorers
- **Day 4 — Attribution:** **GPT‑5.1 + Agent SDK** and **Claude + Messages API** on frozen rows—**do not skip**
- **Day 5 — Readout prep:** two-metric view (baseline, target, delta, pass/fail); flag target-under-baseline rows

**Blockers:** flaky stubs; dishonest baseline; too-easy fixtures (add adversarial **before Week 2**); literature citation **<0.80** → do not proceed to full pipeline.

### Part 2 · Step 6 · How to read the results and make the decision

**Validate baseline first** — GPT‑5.1 on frozen rows must match existing Braintrust on **same rows** before deltas.

**Read each metric independently** — do **not** average scorers (0.98 citation + worse p95 = **latency** failure, not “good enough”).

**Attribute** — **four-configuration** design separates harness vs model on citation and wall clock.

**Two go/no-go signals**

1. **Citation grounding** — Agent SDK ≥ **0.95** on frozen rows and ≥ baseline on **known-failure** rows; below → no literature lane migration until fixed (**compliance**)
2. **Time-to-valid p95** — Agent SDK **p95 ≤ baseline p95** on **high-complexity** rows; if worse, investigate parallel overhead / retry inflation

**Three outcomes**

- **A — Both signals green** — Q2 Agent SDK template; **literature-first** lane story; existing customers **lane-by-lane**
- **B — Harness green, model mixed by lane** — Agent SDK harness everywhere; **`AgentDefinition.model`** per lane from attribution
- **C — One signal weak** — targeted extension (e.g. **5–10** citation-failure rows, rerun **citation** only)—not a program reset

**What the readout is not** — a **migration vote**. It **informs** which stack minimizes risk on the four failure modes; timeline is a **separate** conversation.

**After evidence:** [Migrating from OpenAI Agents SDK](https://platform.claude.com/cookbook/claude-agent-sdk-04-migrating-from-openai-agents-sdk); [OpenAI SDK compatibility](https://docs.anthropic.com/en/api/openai-sdk) for spikes.

---

## Part 3 — Recommended first project

### Part 3 · Recommended first project · Parallel specialist pipeline with typed handoffs

Today: **one loop**, one transcript, sequential work. **12 customers**; **three structural problems** that compound with pharma SLAs.

Build a **parallel-native pipeline beside production**—**GPT‑5.1 unchanged** for customers; new path on **Part 2 frozen rows**, Braintrust-scored apples-to-apples.

**Not a POC** — validated **Q2 template** after **four weeks**, not throwaway spike.

### Part 3 · Problem 1 · Sequential execution where parallelism is possible

Lit and data are **independent** but run **in order** → wall ≈ **sum** (**45+ min** class). **Not a smarter-model fix**—**shape**.

**Fix:** parallel subagents → wall ≈ **max**; coordinator **delegates and merges**, does not ingest every PubMed turn.

### Part 3 · Problem 2 · Context accumulation degrades output quality over long runs

**30–40** tool returns in one parent → drift, empty **`passage`**, brittle merge—**Sub-test A ≠ Sub-test B**.

**Fix:** isolated lanes; **`LiteratureHandoff` / `DataHandoff`** at boundaries; hypothesis sees **contracts**, not forty abstracts. Each boundary validated **where produced**.

### Part 3 · Problem 3 · No durability when long-running jobs are interrupted

Interrupt at minute **25** → replay **~40 PubMed** pulls. At scale, interruption is **planning**, not tail risk. Compliance needs **what the model saw**, not inference from final JSON.

**Fix:** **`session_id`**, checkpoints after milestones, **`resume(session_id)`** without redoing finished steps; full trajectory logged under **`research_task_id`**.

### Part 3 · Pipeline design · Graph and schema boundaries

**Four agents** — coordinator, literature, data, hypothesis — with **schema boundary** at every arrow (diagnosable failures). Exercises **four SDK primitives** tied to Part 2 evidence.

### Part 3 · Pipeline design · Subagents and structured outputs

**Subagents:** isolated processes, **tool allowlists by configuration**; coordinator runs lit ∥ data, waits for **both**, then merge.

- **Evaluates:** citation blur under load → Part 2 **citation grounding**; drift → **`schema_violations_during_run`** in traces

**Structured outputs:** validate **`LiteratureHandoff`**, **`DataHandoff`**, **`HypothesisInput`**, **`HypothesisDeliverable`** at each boundary—**`schema_violations_during_run`** counts retries; compare field and traces across arms (not a separate Braintrust scorer).

### Part 3 · Pipeline design · Sessions and hooks

**Sessions:** one **`session_id`** per run; **Week 3** kill/resume at checkpoints; Part 2 **time-to-valid** on uninterrupted runs.

**Hooks:** **`citation_allowlist`** before PubMed results enter context; **`audit_logger` → OTLP** after every tool call.

- **Evaluates:** enforcement mechanism vs prompt-only → Part 2 **citation grounding** (same allowlist both arms)

### Part 3 · The schema architecture

**Contracts before agent code** — merge is **mechanical** when **`HypothesisInput`** requires both handoffs.

**`passage` in `EvidenceRow`** — empty string is JSON-valid but **not a citation**; citation grounding scorer + allowlist hook.

**`schema_violations_during_run` in `HypothesisDeliverable`** — trajectory truth vs lucky final JSON.

Full Pydantic: **deck appendix · Part 3 schema reference**.

### Part 3 · Four weeks · Weeks 1–2 — foundation and parallel merge

**Week 1 — Foundation (one lane)**

- Wire SDK → PubMed + sponsor MCP; **four** Pydantic schemas
- Literature subagent alone on **3–5** frozen rows; **citation grounding**; **`schema_violations_during_run` == 0** on happy paths
- **Exit:** valid **`LiteratureHandoff`**, stable MCP, cross-validated schemas
- **Risk:** MCP flake vs model—log separately for Week 4 attribution

**Week 2 — Parallel merge**

- Data **in parallel** with literature; coordinator → **`HypothesisInput`** + **`merge_confidence`**; hypothesis → **`HypothesisDeliverable`**; E2E on **all** frozen rows
- **Exit:** both start together; coordinator **waits for both**; four boundaries green; **`merge_confidence`** from written formula
- **Hard triad:** no merge on first return alone; partial-fail keeps lit; define merge semantics **before code**
- **Risk:** merge after first finish—timestamp traces

### Part 3 · Four weeks · Weeks 3–4 — durability, evidence, and baseline honesty

**Week 3 — Durability and policy**

- Checkpoints at **four** milestones; kill + **`resume`**; deterministic fields match uninterrupted run
- **`citation_allowlist`** + **`audit_logger` → OTLP** with **`research_task_id`**
- **Risk:** checkpoint gaps—enumerate every state transition

**Week 4 — Evidence**

- **Both arms** on **`fixtures@v1`**; **two** Braintrust scorers + **four-configuration** attribution
- **Stop-ship:** citation **<0.95** on known-good; **p95** worse than baseline on high-complexity
- **Honest baseline** — prod glue as-shipped; prettified baseline **voids** readout

### Part 3 · Week 4 decision — three outcomes and shared truth

**Outcome A — Both signals green** — Q2 template; literature-first migration story; lane-by-lane for existing customers.

**Outcome B — Harness signals green, model varies by lane** — Agent SDK harness everywhere; **`AgentDefinition.model`** per lane.

**Outcome C — One signal failing** — add **5–10** targeted rows; rerun **that scorer only**—not a restart.

**Across all outcomes:** schemas, MCP, hooks, sessions validated—**no discarded four weeks**.

---

## Closing · OpenAI-only vs Agent SDK

**OpenAI-only** (or **Gemini-only**) is sound when **your** harness already delivers **multi-agent isolation, citation-grade governance, and eval coverage** at acceptable cost. Strategic question: **incremental patches** on custom orchestration vs **Agent SDK primitives** Anthropic evolves as a **product surface**.

**Custom orchestration** = you own tool loops, audit, sessions, routing—engineering + SRE + compliance on top of tokens.

**Public benchmarks** are directional; **frozen eval rows and board rubric** anchor go/no-go.

**Workflow + MCP + hooks** stable; **GPT‑5.1**, **GPT‑5 / mini**, **Gemini 3**, Claude are **engines per lane**—frozen eval before bet-the-company cutover.

**Claude Code** teams reuse hook/permission/tool-loop mental model—lift is MCP, ACLs, Hypothesis schema.

**Pilot recap:** six-slide Part 2 + eleven Part 3 slides → **GPT‑5.1 Messages** vs **Agent SDK** on **same frozen rows**.

**Migration:** [OpenAI Agents → Agent SDK cookbook](https://platform.claude.com/cookbook/claude-agent-sdk-04-migrating-from-openai-agents-sdk) + [notebook](https://github.com/anthropics/claude-cookbooks/blob/main/claude_agent_sdk/04_migrating_from_openai_agents_sdk.ipynb).

---

## Appendices (deck only)

The Presentation tab includes backup slides engineers use in implementation—not in a typical exec read:

- **Appendix · Part 3 schema reference (full)** — verbatim Pydantic for four handoff models
- **Appendix · Built-in Agent SDK tools** — Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch (PubMed = **your MCP**)
- **Appendix · `AgentDefinition` reference** — `description`, `prompt`, tools, `model`, `skills`

---

## Anthropic documentation

- [Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview)
- [Subagents](https://docs.anthropic.com/en/agent-sdk/subagents) · [Sessions](https://docs.anthropic.com/en/agent-sdk/sessions) · [Hooks](https://docs.anthropic.com/en/agent-sdk/hooks) · [MCP](https://docs.anthropic.com/en/agent-sdk/mcp) · [Skills](https://docs.anthropic.com/en/agent-sdk/skills)
- [Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations) · [Structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)
- [Extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) · [Adaptive thinking](https://docs.anthropic.com/en/docs/build-with-claude/adaptive-thinking) · [Effort](https://docs.anthropic.com/en/docs/build-with-claude/effort)
- [OpenAI SDK compatibility](https://docs.anthropic.com/en/api/openai-sdk) · [Claude models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- [Cookbook — Migrating from the OpenAI Agents SDK](https://platform.claude.com/cookbook/claude-agent-sdk-04-migrating-from-openai-agents-sdk)
