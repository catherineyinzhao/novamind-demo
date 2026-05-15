# Claude Agent SDK for NovaMind

**Anthropic** · Executive briefing for **NovaMind** CEO / CTO — **three parts** (differentiators, evaluation, recommended project).

**Terms:** **Claude** is our model family (Opus / Sonnet / Haiku). The **Agent SDK** is our **library** that runs the **multi-step tool loop**—Claude requests tools, your process executes them, results return, repeat—like **Claude Code** embedded in **your** services ([Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview)).

---

## Introduction

NovaMind is building (or has built) a **semi-autonomous research agent** with **literature review**, **sponsor-scoped data validation**, and **hypothesis generation**, backed by **PubMed RAG (~3y)** and downstream **Hypothesis deliverable** JSON. Leadership’s real question is how to get **model optionality** without **rebuilding the product every time a frontier model shifts**—and how to separate **model quality** from **harness quality** from **domain stack**.

**Central thesis:** the **Claude Agent SDK** is the same **managed tool loop and context patterns** that power **Claude Code**, exposed as a **library**—so multi-agent patterns (subagents, hooks, permissions, sessions, MCP, Skills) are **first-class**, not bespoke `while (tool_use)` glue per team ([Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview)). **That thesis is about harness shape, not “Claude beats GPT‑5.1 on every leaderboard”**—see **Agent SDK vs a GPT‑5.1‑centric stack** below.

**CEO framing:** the decision is **infrastructure for Q2 multi-agent**, not a “logo swap.” We recommend **parallel**, **frozen-task** proof before any cutover. The **recommended first project** in Part 3 serves **two goals at once**: **ship the Q2 workflow** and **keep today’s production stable**—literature, data, and hypothesis run as **Agent SDK subagents + MCP + hooks + sessions**, so your team spends depth on **RAG, sponsor policy, and Hypothesis deliverable contracts** instead of another bespoke tool loop. **Three Anthropic pillars** anchor the architecture: **[Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)** for passage-grounded evidence, **sessions and long-context** for durable `ResearchTask` threads, and the **Agent SDK** as the **native** orchestration surface (the same loop family as Claude Code). **Parallel literature and data** address the usual sequential bottleneck—wall time moves toward the **max** of independent legs, not always the **sum**.

### How to read this briefing

1. **Part 1** — **why the Agent SDK** (including **vs a GPT‑5.1‑centric stack**), then models, routing, primitives, and reliability.  
2. **Part 2** — a **six-dimension** evaluation design with Braintrust and a two-week cadence.  
3. **Part 3** — the **recommended first project**: Q2 multi-agent workflow on the Agent SDK.

---

## Part 1 — Claude’s differentiators for NovaMind’s use case

Part 1 is the **technical rationale** for the **recommended architecture** in Part 3: **why the Agent SDK addresses NovaMind’s workflow in a different layer than “GPT‑5.1 vs Claude,”** then models, routing, Agent SDK vs raw API, subagents, structured outputs for the **Hypothesis deliverable**, reliability (citations, permissions, thinking), hooks, sessions, MCP, Skills, and observability—each ties to a **concrete guardrail or latency** decision in that project.

## Agent SDK vs a GPT‑5.1‑centric stack

Frontier models—including **GPT‑5.1**—raise the quality ceiling on **Messages-style** work: reasoning, tool use, and JSON in a **single** managed transcript. **NovaMind’s** product is closer to a **long-running, multi-lane research system**: **PubMed-heavy** retrieval, **sponsor-scoped** numeric work, and a downstream **Hypothesis deliverable** contract, often **in parallel**, with **audit** and **tenant** boundaries. That gap is mostly **harness**, not **IQ per token**.

**What stays in your engineering scope with a GPT‑5.1‑centric pattern:** you still implement and operate the **orchestration loop** (when to call tools, how to retry, how to merge parallel legs), **context growth** when many abstracts and tables flow through one parent thread, **schema discipline after many tool results**, **per-tenant auth** at every tool boundary, and **telemetry** that attributes cost and latency to **customer** and **`research_task_id`**. A stronger base model improves **median** answer quality; it does not by itself deliver **governed multi-agent** shape.

**What Anthropic puts on the product surface with the Agent SDK:** the same **managed tool loop** we use in **Claude Code** ([Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview))—**subagents** for isolation and parallelism ([Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)), **structured outputs** for contracts **across** tool trajectories ([Structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)), **hooks** and **permissions** for enforcement ([Hooks](https://docs.anthropic.com/en/agent-sdk/hooks), [Configure permissions](https://code.claude.com/docs/en/agent-sdk/permissions)), **sessions** for durable tasks ([Sessions](https://docs.anthropic.com/en/agent-sdk/sessions)), **MCP** for **PubMed RAG and sponsor systems** ([MCP](https://docs.anthropic.com/en/agent-sdk/mcp)), **Skills** for reusable domain instruction ([Skills](https://docs.anthropic.com/en/agent-sdk/skills)), and **Citations** on native paths for grounded passages ([Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)).

**Why we think that is preferable for NovaMind:** it **separates** “which frontier model answers this sub-question?” from “how does a regulated **Hypothesis deliverable** pipeline behave under load?” It makes **parallel literature and data** a **native** pattern instead of a custom orchestrator. It aligns **compliance** with **code-level** hooks and tool allowlists, not prompt honor systems alone. And it gives you a **stable evaluation story**: **raw API** JSON (where another vendor may lead) versus **SDK-enforced** JSON **after** tools—Part 2’s **Sub-test A vs B** split.

**On GPT‑5.1 specifically:** Anthropic does not ask you to ignore strong results on **short** structured-output or chat benchmarks. We ask you to score **the same frozen `ResearchTask` rows** on the **surface your customers actually receive**—validated **Hypothesis deliverable** output after **real** PubMed and sponsor tool traffic. That is the **preferability** claim in one sentence: **less unbounded custom harness risk per accepted Hypothesis deliverable.**

**OpenAI-compatible endpoints** are useful for **comparison spikes**; production features that need **citations, native structured outputs, and caching** belong on **native** Claude with the Agent SDK—see **[OpenAI SDK compatibility](https://docs.anthropic.com/en/api/openai-sdk#important-openai-compatibility-limitations)**.

## The model lineup and what each one does

**Concept:** the SDK lets **each lane** pick a **model tier**—**Opus** for hardest reasoning, **Sonnet** for default tool-heavy work, **Haiku** for fast structure—so you do not pay flagship **latency and cost** on every cheap step.

We recommend a **three-tier** Claude lineup; current names, context windows, and list pricing are on the **[Claude models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)**:

- **Opus-class (flagship)** — deepest reasoning; best for **hypothesis generation** when mechanistic reasoning and long evidence chains dominate. **Caveat:** tokenizer generation changes can alter **effective tokens per request**—**benchmark $ per accepted Hypothesis deliverable** before committing flagship tiers to the highest-throughput lane.

- **Sonnet-class (workhorse)** — best default for **literature review** and **data analysis** sub-agents and for the **coordinator**—strong structured reasoning at a better cost profile than flagship for broad fan-out work.

- **Haiku-class (fast)** — routing, classification, and lighter extraction—**analogous** to “small frontier” models elsewhere. **Do not** claim universal latency superiority vs other vendors’ small models without **your** measured p50/p95/p99.

## Latency and routing (production)

**Concept:** **`AgentDefinition`** names **one sub-agent’s prompt, tools, and model**; **routing** is which definition runs coordinator vs literature vs hypothesis.

Measure **TTFT**, **p50/p95/p99 wall clock**, and **tail** behavior on **your** `ResearchTask` mix for each lane—**Haiku-class is fast**, but superiority versus another vendor’s small model is a **measurement claim**, not a default. Route with **`AgentDefinition.model`** for **coordinator / literature / hypothesis / light routing**; revisit after tokenizer or SKU changes. **[Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)** follows published prefix rules; **[extended / adaptive thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)** trades **latency and tokens** for harder reasoning—budget it where your rubric values depth.

## The Agent SDK — architecture and key technical details

**Concept:** with the **Messages** client you implement **`while (stop_reason == tool_use)`** yourself—every retry and stream edge case is **your** loop. With **`query()`**, Anthropic’s Agent SDK runs that **managed loop** and streams **events** to you. Built-ins cover **workspace** (Read/Write/Edit/Glob/Grep), **shell** (Bash), **web** (WebSearch/WebFetch), and **AskUserQuestion** for UI-backed clarification; **PubMed** arrives via **your MCP servers**.

**Client SDK vs Agent SDK:** the **Client SDK** path is direct API access where **you** implement the **tool loop** (`stop_reason == tool_use` cycles, retries, streaming semantics). The **Agent SDK** gives **Claude with built-in tool execution**—Claude runs the multi-turn cycle described in the [overview](https://docs.anthropic.com/en/agent-sdk/overview).

**Built-in tools** include **Read**, **Write**, **Edit**, **Bash**, **Monitor**, **Glob**, **Grep**, **WebSearch**, **WebFetch**, and **AskUserQuestion** (see the overview table). For NovaMind, the important mapping is conceptual: **WebSearch/WebFetch** illustrate how the SDK reasons about **external retrieval**; **your** production PubMed path should remain **aligned with the Hypothesis deliverable schema**, **ACL’d**, and **checksum’d** behind **custom tools** and/or **MCP**—not silently replaced by generic web tools in regulated settings.

**Agent SDK vs Claude Code:** the Agent SDK is the **same harness family** as Claude Code—we operate these primitives on serious agent workloads—and **your** team still owns the **data plane**, **contracts**, and **customer SLAs**.

## Subagents — the multi-agent architecture NovaMind needs for Q2

**Concept:** a **subagent** is a **child Claude run** whose long tool trace **stays in the child**; the parent receives a **compact handoff**—specialist scratchpad vs specialist report.

Subagents are **separate agent instances** the parent can spawn for focused work. Child runs accumulate their own tool transcript; the parent receives a **curated return**, preserving **`parent_tool_use_id`**-style lineage for traces ([Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)).

**Creation patterns:** programmatic **`AgentDefinition`** maps in `query()` options; filesystem-defined agents under **`.claude/agents/`** when using Claude Code-style project config; optional built-in general-purpose patterns where enabled.

**Why subagents matter:**

1. **Context isolation** — literature exploration can touch **many** abstracts without polluting coordinator context.  
2. **Parallelization** — independent legs can run concurrently when dependencies allow.  
3. **Specialized instructions** — per-agent expertise without bloating a single system prompt.  
4. **Tool restrictions** — enforce **read-only** literature profiles and **sandboxed** data compute separate from hypothesis drafting.

**Recommended project:** the Part 3 **coordinator → parallel literature and data → hypothesis** graph instantiates these four points.

**`AgentDefinition` fields:** `description`, `prompt`, `tools`, `disallowedTools`, `model` (`sonnet` / `opus` / `haiku` / `inherit` or full id), and **`skills`** when using Skills.

## Structured outputs across full tool runs

**Concept:** **tool trajectory** = many MCP/Bash steps, then JSON. **Structured outputs** enforce the **Hypothesis deliverable** schema **across that whole trajectory**, not on one final message.

Agent SDK **structured outputs** aim to return **validated JSON** for a declared schema across **tool-using** runs—not merely a one-shot `response_format` completion.

**Two-track comparison:**

- **Sub-test A (raw APIs):** Messages API / JSON mode / function calling on both vendors—**accept** if internal benchmarks show another vendor ahead here.  
- **Sub-test B (SDK-enforced):** the same **Hypothesis deliverable** schema enforced in the Agent SDK layer—measure **violations**, **retries**, and **time-to-valid** after realistic tool trajectories.

## Reliability — citations through permissions

**Concept:** **Citations** tie answers to **document spans**; **Structured outputs** tie the **Hypothesis deliverable** to its **schema**; **permissions** tie **tool calls** to **policy**—three different “reliability layers” that prompts alone do not replace.

**Citations:** **[Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)** ground outputs in retrieved documents—pair with **your** PubMed RAG and **Hypothesis deliverable** validators; **WebFetch** is not regulated PubMed production. **Structured outputs vs compatibility:** **[Structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)** on native Claude paths enforce Sub-test B; our **[OpenAI SDK compatibility](https://docs.anthropic.com/en/api/openai-sdk#important-openai-compatibility-limitations)** layer **ignores `strict`**—the shim is not schema-guaranteed. **Thinking:** **[Extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)**, **[adaptive thinking](https://docs.anthropic.com/en/docs/build-with-claude/adaptive-thinking)**, and **[effort](https://docs.anthropic.com/en/docs/build-with-claude/effort)** per SKU—compatibility paths omit several native levers. **Compaction:** **archive** evidence before summaries drop citation-critical detail. **Permissions:** evaluation order is **hooks → deny → mode → allow → `canUseTool`** (with **`dontAsk`** denying unmatched tools without prompts)—see **[Configure permissions](https://code.claude.com/docs/en/agent-sdk/permissions)**; **`bypassPermissions`** is for **trusted sandboxes**, not production tenants.

**Operational note:** permission modes change **who gets prompted**, not **what is inherently safe**—when you add MCP actions or rename tools, update **`allowed_tools`**, **`disallowed_tools`**, and **`PreToolUse`** rules together; otherwise **`dontAsk`** agents can **hard-deny** at runtime with **no** `canUseTool` escape hatch, which is easy to misread as “the model got worse.”

## Hooks — production control and audit trail

**Concept:** **hooks** are **your callbacks** before/after tools (and other lifecycle points) to **deny**, **log**, or **transform**—policy as code.

Hooks run **your code** at lifecycle points—block dangerous operations, log for compliance, transform I/O, require human approval, and tie into notifications ([Hooks](https://docs.anthropic.com/en/agent-sdk/hooks)). The guide lists **`PreToolUse`**, **`PostToolUse`**, **`Stop`**, session lifecycle hooks, and additional events for each SDK release.

**How hooks fit reliability:** they sit **first** in the documented permission evaluation order—**before** deny rules and permission modes—so you can enforce **path policy**, **data-class rules**, and **rate limits** even when a mode would otherwise auto-approve. They do **not** replace **`allowed_tools`**, but they catch **model-supplied arguments** that static allowlists cannot express.

**Illustrative production patterns:**

- **`PreToolUse` on `Write` / `Edit` / `Bash`** — enforce a **sandbox root**, reject traversal outside it, and consider **allowlisting** shell entrypoints instead of unconstrained **`bash -c`**.  
- **`PreToolUse` on outbound tools (optional)** — host allowlists for **`WebFetch`**, signed request metadata, or human approval for sensitive egress when using **`default`** mode.  
- **`PostToolUse` on retrieval / MCP / web** — structured audit fields (**tool**, **tenant/session ids**, **query or redacted hash**, **PMID/DOI/URL list**, **latency**, **SKU**) so you can defend **citations** and incidents without necessarily retaining full payloads.  
- **`PostToolUse` after mutations** — paths touched plus **checksums** or small diffs for forensics.  
- **Compaction / lifecycle** — **archive** transcript slices and **tool-return fingerprints** **before** compaction drops evidence your validators or regulators would need—treat it as **retention policy**, not silent savings.

## Sessions — long-running research workflow support

**Concept:** **sessions** persist **history** so a 15–30 minute research job survives restarts; **`resume`** continues; **fork** tries an alternate path from the same evidence.

Sessions persist **conversation + tool history** so analysts can **resume** after interruptions without treating every pause as a brand-new chat ([Sessions](https://docs.anthropic.com/en/agent-sdk/sessions)). Capture `session_id` from init messages as in the SDK examples; use **`resume`** for explicit continuation; use **fork** (where supported) to explore alternate hypotheses from the same evidence base.

The Python SDK documents **SessionStore** adapters (**S3**, **Redis**, **Postgres**)—pick the backend that matches **your** infra and compliance posture.

## Observability — integration with your stack

**Concept:** **OTLP** is the standard wire format for **traces/metrics/logs**—wire Agent SDK telemetry into **Datadog, Honeycomb, Grafana, LangSmith**, etc., with **`customer_id`** / **`research_task_id`** / **`agent_role`** on every span.

The SDK ecosystem supports exporting **OpenTelemetry** signals (metrics, logs, traces) to OTLP-compatible backends. Practically: attach **`customer_id`**, **`research_task_id`**, and **`agent_role`** early so cost and latency reports slice the way finance and customer success already think.

**LangSmith:** teams already on LangSmith typically enable OTLP ingestion—**span name strings** can change between SDK releases; **stable resource attributes** matter more.

## MCP — your RAG pipeline and evaluation stack

**Concept:** **MCP** registers **your** PubMed or sponsor systems as **named tools** Claude calls through the SDK—**your** server enforces auth and row-level rules.

MCP connects agents to external systems with a uniform tool lifecycle ([MCP](https://docs.anthropic.com/en/agent-sdk/mcp)). Tool naming often follows patterns like `mcp__<server>__<action>`.

**NovaMind applications:** PubMed RAG as MCP; Braintrust or internal scorers as MCP tools for rectangular eval rows; sponsor experimental readers as MCP with the same auth/logging discipline as first-party tools.

**Anthropic PubMed (optional):** a first-party **PubMed connector** on **Claude.ai**, **hosted PubMed MCP** for API/Message builds, and **Claude Code** **`pubmed@life-sciences`** (marketplace **[anthropics/life-sciences](https://github.com/anthropics/life-sciences)**)—see **[Using the PubMed Connector in Claude](https://claude.com/resources/tutorials/using-the-pubmed-connector-in-claude)**. Use for **general** NLM retrieval; **tenant** corpora and **Hypothesis deliverable** gates stay on **your** MCP above.

## Agent Skills — building reusable domain packages for pharma customers

**Concept:** **Skills** are **versioned instruction packs** loaded **on demand** so a fifty-page SOP does not live in every prompt.

Skills package domain instructions and resources with **progressive disclosure** so large playbooks do not flood context every turn ([Skills](https://docs.anthropic.com/en/agent-sdk/skills)). They are supported across Claude surfaces including the Agent SDK—useful when onboarding **multiple** pharma customers with shared guardrails and per-tenant overlays.

## Differentiation — why Agent SDK for NovaMind

**Concept:** **MCP** = your data plane; **subagents** = isolation and parallelism; **hooks + permissions** = enforcement; **sessions** = durability; **structured outputs + citations** = customer contract; **Skills** = domain SOPs; **OTLP** = finance-grade visibility—**one composable stack**.

Compared to raw Messages API loops, the Agent SDK bundles the **managed tool cycle**, **hooks**, **permissions**, **sessions**, **MCP**, and **Skills** as **product-level** primitives. Subagents deliver **Q2-shaped** isolation for literature fan-out; the **[OpenAI Agents → Claude Agent SDK](https://platform.claude.com/cookbook/claude-agent-sdk-04-migrating-from-openai-agents-sdk)** cookbook accelerates engineer onboarding. **Citations** beat prompt-only “cite PMIDs” for auditability—**pair with** existence / passage / claim checks. **Life sciences:** we publish **Claude for life sciences** materials on **[anthropic.com](https://www.anthropic.com)**—**customer names** belong on **your** approved external materials. **Model and cloud optionality:** Bedrock, Vertex, Foundry, direct API—keep **`AgentDefinition.model`** explicit per lane.

---

## Part 2 — The evaluation framework — detailed and practical

### Why this evaluation is shaped this way

Leadership needs **production-relevant** signal, not generic chat leaderboards. Where it matters, compare **Sub-test A** (raw completion / JSON habits) with **Sub-test B** (Agent SDK **[structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)** with schema validation and retries) so “model conformance” is not confused with **system guarantees**.

### Four pillars — what to measure and why

1. **Structured output reliability** — fastest test; separates raw API behavior from SDK-enforced **Hypothesis deliverable** shape. Measure first-attempt violations, retries, time-to-valid at **p50/p95/p99**, and **field completeness** (non-empty semantically important fields). Prefer **~200+** frozen rows sampled from **real** production distributions over synthetic-only suites; scale **Sub-test B** toward **~1k** calls once the harness is stable for tighter intervals.

2. **Citation accuracy** — treat **existence** (identifiers resolve), **passage** (span matches source; pair **[Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)** with substring or judge), and **claim** (0–3 rubric; often LLM-as-judge with spot human audit) as **separate** metrics. Include an **adversarial** slice (~20%) where the right answer is **no support**. Scale **N** toward **500+** when stable.

3. **Long-context scientific reasoning** — **50+** papers / **100k+** tokens; tasks that require **cross-corpus** synthesis (contradictions, refinement chains, multi-paper hypotheses). Use **blinded** human review on a **pre-registered** rubric; expect deltas on **hard tension** tasks more than trivial summaries.

4. **End-to-end pipeline cost** — **$/completed `ResearchTask`** with token splits (**cached vs fresh input**, outputs) and **[Message Batches](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)** where eligible. **[Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)** economics depend on **prefix stability** and **TTL**—confirm **current** default vs **1-hour** cache options and pricing before board-level promises. On the same end-to-end runs, capture **p95/p99** latency and **multi-agent** routing/handoff quality (coordinator → literature → hypothesis, **plus data** when ready).

### What this evaluation is not

Not a **forced migration** of the legacy stack; not a **comprehensive** LLM benchmark suite; not **one-shot**—the harness should become **ongoing** QA as prompts and SKUs change.

### Two-week cadence (parallel to production)

- **Days 1–2:** branch harness; **Hypothesis deliverable** schema → **Pydantic** / **Zod**; Braintrust on **both** arms; run **Sub-test A** and **Sub-test B** on the same frozen rows (batch overnight where eligible); scale **Sub-test B** toward **~1k** calls once stable.  
- **Days 3–5:** citation battery—auto graders for existence/passage; queued judges for claim/adversarial rows.  
- **Week 2 · Days 1–4:** build the **Agent SDK** prototype (3–4 agents, minimum hooks)—this is **Q2-shaped** work, not disposable code.  
- **Week 2 · Days 5–7:** **50–100** end-to-end tasks—cost, **p95/p99**, quality vs baseline; optional concurrency slice.

### Handling results honestly

If results are **mixed**, default response is often **per-lane routing** (**`AgentDefinition.model`**) rather than a single winner-take-all model choice. If signals are **inconclusive**, **double N** before redesigning rubrics. If another vendor leads even on **Sub-test B**, narrow the first Claude wedge (e.g. hypothesis-only) and keep investing in harness gaps.

### Braintrust

Run **both** arms through the **same** project, scorers, and frozen dataset IDs. Treat eval configs as **durable product assets**—wire into **PR/release** checks where practical so regressions surface early. Longer term, eval tools can become **MCP tools** inside the agent loop where policy allows.

### Decision gate and compatibility

Ship Q2 on Agent SDK when **citation pillar**, **Sub-test B**, and **$/task** (under realistic cache/batch assumptions from **your** traces) all clear **parity-or-better** bars you predefine; otherwise expand harness work—not customer traffic. Map OpenAI Agents primitives with the **[migration cookbook](https://platform.claude.com/cookbook/claude-agent-sdk-04-migrating-from-openai-agents-sdk)**; **[OpenAI SDK compatibility](https://docs.anthropic.com/en/api/openai-sdk)** omits **`strict`**, **hoists** system/developer messages, and is not a substitute for **native** citations/caching—graduate proven spikes accordingly.

---

## Part 3 — Recommended first project — strategic framing

The recommended first project is **not** “migrate everything.” It is **NovaMind’s Q2 multi-agent research workflow on the Agent SDK** in parallel: additive for technical leadership, aligned to board velocity for executive leadership.

**OpenAI-compatible spikes** must respect **[documented limitations](https://docs.anthropic.com/en/api/openai-sdk#important-openai-compatibility-limitations)**; production features that need **citations, structured outputs, caching, and permission depth** belong on **native** Agent SDK paths.

## Concrete architecture

The slides summarize lanes; here is the **implementation intent** behind each role.

**Coordinator (Sonnet-class)** — Owns **task decomposition**, launches **literature** and **data** **in parallel** when safe, **merges typed JSON**, calls **hypothesis**, returns a **Hypothesis deliverable**. Sonnet balances **latency on the hot path** with reliable structured delegation; **deep science** belongs in children and in the Opus hypothesis lane. Keep the coordinator prompt **minimal**; validate the pack with **Pydantic/Zod** and Agent SDK **structured outputs** so JSON is enforced **after tools**, not only in prose.

**Literature (Sonnet + MCP PubMed RAG)** — Wrap NovaMind’s **PubMed ~3y** pipeline as **MCP**; combine with **Read/Grep** and optional web tools where policy allows. Use **[Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)** so evidence rows include **grounded passages**—**pair with** the **citation pillar** checks from Part 2 (existence / passage / claim). **Tight `allowed_tools`** (no **Write/Bash**) limits blast radius from hostile abstracts. **Subagent isolation** keeps large retrieval traces out of the parent context ([Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)).

**Data (Sonnet + Bash + sandboxed Write + sponsor MCP)** — **Bash** for real stats code; **Write** only under a **sandbox prefix** enforced in **`PreToolUse`** (deny-by-code, not prompt honor system). Sponsor numeric access via **MCP** with **tenant-scoped** auth—no raw DB secrets in prompts. Emit **quality-flagged** summaries the hypothesis agent can trust or discount.

**Hypothesis (Opus-class, read-only)** — Reasons over **merged structured memos**; **Opus** for contradiction-heavy mechanistic work where cost is acceptable because parallel legs already finished. Narrow tools; encode **confidence** and **contradicting_evidence** expectations in schema + prompt so silent omission of negative evidence is **structurally discouraged**.

**Sessions** — **`session_id` per customer task** on **Postgres** `SessionStore` (or chosen adapter); **`resume`** after interruptions; **fork** where supported for alternate hypotheses from the same evidence ([Sessions](https://docs.anthropic.com/en/agent-sdk/sessions)).

**Hooks** — Sandbox writes; **log** every retrieval/MCP access for audit; **archive before compaction** when context management would drop citation-grade detail ([Hooks](https://docs.anthropic.com/en/agent-sdk/hooks)); route long-job signals to **Slack/PagerDuty** where you enable notification hooks.

**Observability** — OTLP with **`customer_id`**, **`research_task_id`**, **`agent_role`** for tenant billing, end-to-end traces, and per-lane tuning—usually a **config** step into existing LangSmith OTLP.

**Skills** — Shared **drug-discovery-research**-style base plus **per-tenant overlays** for therapeutic area and schema notes ([Skills](https://docs.anthropic.com/en/agent-sdk/skills)).

**Rollout watchpoints** — Stress-test **compaction** on worst-case PubMed breadth; **re-benchmark tokens/$** when changing Opus-class SKUs or tokenizers; **version** coordinator delegation prompts like application code—small wording changes shift child behavior.

## Closing · OpenAI-only vs Agent SDK

**OpenAI-only** is coherent when **your** harness already delivers **multi-agent isolation, citation-grade governance, and eval coverage** at acceptable cost. If **Q2** needs new orchestration depth, compare **Agent SDK primitives** to the **full cost** of maintaining custom loops, audit hooks, and session infra in-house. **Public benchmarks** are **directional**; **your** own **frozen eval rows and scoring rubric**—not leaderboard scores—should anchor go/no-go. **Model optionality** in the SDK (**per-subagent** model choice across supported routes—see [Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)) preserves flexibility without re-architecting on every SKU shift.

---

## Anthropic documentation

- [Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview)  
- [Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)  
- [Structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)  
- [OpenAI SDK compatibility](https://docs.anthropic.com/en/api/openai-sdk)  
- [Extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) · [Adaptive thinking](https://docs.anthropic.com/en/docs/build-with-claude/adaptive-thinking) · [Effort](https://docs.anthropic.com/en/docs/build-with-claude/effort)  
- [Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)  
- [Message Batches](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)  
- [Hooks](https://docs.anthropic.com/en/agent-sdk/hooks)  
- [Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)  
- [Sessions](https://docs.anthropic.com/en/agent-sdk/sessions)  
- [MCP](https://docs.anthropic.com/en/agent-sdk/mcp)  
- [Permissions](https://docs.anthropic.com/en/agent-sdk/permissions) · [Configure permissions](https://code.claude.com/docs/en/agent-sdk/permissions)  
- [Skills](https://docs.anthropic.com/en/agent-sdk/skills)  
- [Claude models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)  
- [Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)  
- [Cookbook — Migrating from the OpenAI Agents SDK](https://platform.claude.com/cookbook/claude-agent-sdk-04-migrating-from-openai-agents-sdk)  
