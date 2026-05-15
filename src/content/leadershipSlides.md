# Claude Agent SDK for NovaMind

Anthropic · Executive briefing for NovaMind CEO / CTO — Claude and the Agent SDK for your multi-agent research stack.

Terms: Claude is our family of models (Opus / Sonnet / Haiku). The Agent SDK is our library (TypeScript and Python) that runs a multi-step agent loop for you: Claude proposes tool calls (read files, run commands, call your APIs), your process executes them, Claude sees results, repeats until done—same pattern as Claude Code, but embedded in your backend ([Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview)).

Dollar, percent, and benchmark numbers should come from your production traces and finance models; below we focus on architecture, product primitives, and an evaluation path you can run in parallel with today’s stack.

- **Part 1** — Differentiators: Agent SDK primitives and reliability for a governed research workflow.
- **Part 2** — Evaluation: what to test, how to instrument (e.g. Braintrust), parallel timeline vs today’s stack.
- **Part 3** — Recommended first project: framing and concrete multi-agent architecture.
- **Appendix** — Prior vocabulary / mitigation reference.

---

## Why Claude Agent SDK?

**Plain English:** **Subagents** = delegate to a **child Claude** so long retrieval traces do not swamp the parent; **Sessions** = **save and resume** multi-step jobs; **Hooks** = **your code** that can **block or log** sensitive tools **before** they run.

**Strategic setup — how this connects to Part 3:** the recommended architecture optimizes for **two constraints at once**: ship the **Q2 multi-agent research workflow** without destabilizing **today’s production** stack. Nothing in that path needs to touch existing customer traffic until eval gates pass. NovaMind’s familiar lanes—**literature review**, **sponsor-scoped data analysis**, **hypothesis generation**—become **first-class Agent SDK primitives** (subagents, MCP, hooks, sessions, structured outputs) instead of bespoke orchestration glue; **infra-heavy** concerns (tool cycles, permission checks, persistence, telemetry hooks) sit in the **SDK layer**, so engineering hours concentrate on **RAG quality, sponsor ACLs, and `HypothesisPack` semantics**—the product.

**Three structural advantages — in the recommended project:**

1. **Grounded synthesis** — **[Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)** ties factual extraction to **source passages** for the model tier you ship. In the recommended project, the **literature subagent** returns **`EvidenceObject`-style** rows (PMID, title, **verbatim passage**, claim, confidence, study type) so **hypothesis** and customer review stay **auditable**, not “trust the prose.”
2. **Long-context + sessions** — **durable** `ResearchTask`-scale threads without “new chat amnesia” ([Sessions](https://docs.anthropic.com/en/agent-sdk/sessions)). Long jobs (literature fan-out + data runs + hypothesis) get a **`session_id` per customer task**, **Postgres** (or another `SessionStore`) for resume after restarts, and optional **fork** where supported so researchers explore alternatives from the **same evidence base** without losing the original run.
3. **Multi-agent SDK** — the same **managed tool loop family** as **Claude Code**, exposed as a library ([Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview)). The **coordinator** delegates **literature** and **data** as **parallel subagent** calls when dependencies allow—addressing the common pattern where literature and numeric legs run **sequentially** today; wall time often tracks **max(lit, data)** instead of **sum**, which matters when many customer workflows overlap in Q2.

---

## Part 1 — Claude’s differentiators for NovaMind’s use case

**What we cover:** how each Agent SDK primitive supports **`HypothesisPack`**, **PubMed RAG**, **sponsor data**, and **multi-tenant** delivery for the **recommended first project** in Part 3.

**If the Agent SDK is new to you:** picture **one long-running “research job”** as a **state machine**—many steps, many tools, possibly **parallel** branches—not a single chat reply. The SDK gives you **named building blocks** for that machine: **who runs the loop**, **which tools exist**, **who may call them**, **what gets logged**, **where state is saved**, and **how final JSON is validated**. **Models** pick *reasoning quality per step*; these primitives pick *whether the pipeline is operable at all* under load, tenants, and compliance.

**Models** are one ingredient; **subagents, structured outputs, hooks, permissions, sessions, MCP, Skills, and observability** are what turn research agents into **repeatable, governable systems**—while **your** corpus, ACLs, and contracts stay authoritative.

---

## Part 1 · Why the Agent SDK — not only “a different model than GPT‑5.1”

**Concept:** this slide separates **“smarter completions”** from **“a governed research system.”** GPT‑5.1 raises the first; the Agent SDK targets the second.

**Two different bets:** upgrading to **GPT‑5.1** (or any frontier completion API) mainly raises **model IQ** on the **Messages-shaped** surface: one transcript, tools you invoke, JSON you parse. Shipping **NovaMind’s Q2 research workflow** is mostly a **harness IQ** problem: **many** tool rounds, **parallel** evidence and numeric legs, **schema-stable** outputs **after** those rounds, **tenant isolation**, **auditability**, and **weeks-long** task state. The Agent SDK is Anthropic’s answer on the **harness** side—the same **managed multi-turn tool loop** we run in **Claude Code**, exposed as a **library** ([Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview))—so you are not choosing “Claude instead of GPT” in the abstract; you are choosing **whether that harness is productized or handmade**.

**What a GPT‑5.1‑centric stack typically still leaves on your plate:** your engineers own the **`while (tool_use)`** loop (or equivalent orchestrator), **retry and stop semantics**, **streaming edge cases**, **routing** between literature / data / hypothesis, **parent-context growth** when PubMed fan-out returns large payloads, **per-tenant secrets and sponsor ACLs** at every tool boundary, **structured JSON that survives dozens of tool results**, and **OTLP/log lineage** that ties spend and latency to **customer** and **task**. None of that disappears because the base model got smarter—it is **orthogonal** to headline benchmark scores.

**What the Agent SDK moves onto the product surface:** **built-in tool execution** for the standard research loop, **subagents** so heavy retrieval traces stay in **child** contexts ([Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)), **structured outputs** tied to **Pydantic/Zod-style** contracts **across** tool turns ([Structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)), **hooks** for sandbox and audit ([Hooks](https://docs.anthropic.com/en/agent-sdk/hooks)), **permissions** with an explicit evaluation order ([Configure permissions](https://code.claude.com/docs/en/agent-sdk/permissions)), **sessions** for durable **`ResearchTask`** state ([Sessions](https://docs.anthropic.com/en/agent-sdk/sessions)), **MCP** for **PubMed RAG and sponsor data** as first-class tools ([MCP](https://docs.anthropic.com/en/agent-sdk/mcp)), and **Skills** for reusable domain packs ([Skills](https://docs.anthropic.com/en/agent-sdk/skills)). **Citations** sit on the **native** Claude path for passage-grounded extraction ([Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)). Together, that is the **governed multi-agent shape** Q2 is asking for—not a bigger monologue from a single thread.

**Why that is *preferable* for NovaMind conceptually:** (1) **Separation of model and orchestration** — you can **benchmark models** on frozen tasks while the **Agent SDK** holds the **workflow contract** steady. (2) **Parallelism and isolation** — literature and sponsor-backed analysis become **first-class parallel subagents** with **least-privilege tools**, instead of one transcript absorbing **every** abstract and dataframe preview. (3) **Contract-first delivery** — **`HypothesisPack`** is enforced as **system behavior**, not as a **prompt request** after volatile tool traffic. (4) **Operational clarity** — the same primitives **OTLP**, **hooks**, and **session_id** semantics your SRE and compliance teams need are **first-class**, not re-invented per squad.

**Fair comparison on benchmarks:** if **GPT‑5.1** leads on **one-shot** or **raw API** structured-output suites, that is **compatible** with our story: those suites usually measure **Sub-test A**-shaped surfaces (see the structured-output slide). NovaMind’s production bar is closer to **Sub-test B**—**schema after real PubMed and sponsor tool traffic**—which is **exactly** what Agent SDK structured outputs are designed for. The right exec question is not “which model tops a short JSON leaderboard?” but “**which stack minimizes combined** model + orchestration + compliance **risk per accepted `HypothesisPack`?**”

**If you stay on GPT‑5.1 for the model layer:** you can still **evaluate Agent SDK + Claude in parallel** on frozen **`ResearchTask`** rows (Part 2)—the outcome informs **harness choice** independent of **single-model loyalty**. Many teams end up with **multi-model** routing; the Agent SDK’s per-lane **`model`** on **`AgentDefinition`** is built for that shape.

---

## Part 1 · The model lineup and what each one does

**Concept:** the Agent SDK lets **each lane** of your system pick a **different Claude model**—like assigning a **fast junior analyst** vs a **senior reviewer** per task. **Opus** = maximum reasoning depth per token; **Sonnet** = default for heavy tool + language work; **Haiku** = cheap structure and routing. You pay in **latency and $** when you “over-class” a lane; you pay in **quality** when you “under-class” hypothesis work.

**Three-tier lineup** — current SKUs, context windows, and pricing: **[Claude models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)**.

| Tier | Role in the recommended stack | When to use it for NovaMind-shaped work |
| --- | --- | --- |
| **Claude Opus** (flagship) | Hypothesis generation sub-agent where reasoning depth matters most | **`HypothesisPack`** synthesis that must trace evidence across long memos |
| **Claude Sonnet** (workhorse) | Literature review + data analysis sub-agents; coordinator | PubMed-heavy retrieval, cohort validation, orchestration—**cost / latency balance** |
| **Claude Haiku** (fast) | Routing, classification, lighter extraction | Tasks that today might sit on a **small** frontier model—**benchmark latency on your workload** |

---

## Part 1 · Latency and routing (production)

**Concept:** **`AgentDefinition`** is the SDK’s struct for **“this sub-agent’s name, instructions, tools, and model.”** **Routing** means: which definition runs **coordinator** vs **literature** vs **hypothesis**, so you do not run **flagship depth** on every cheap classification step.

**Latency:** Haiku-class is built for **speed**—we still recommend **TTFT, p50/p95/p99, and tail** on **your** `ResearchTask` mix against any other “small” model you compare to.

**Per-`AgentDefinition` routing** (recommended defaults):

| Agent lane | Model class | Rationale |
| --- | --- | --- |
| **Coordinator** | Sonnet-class | Merge narrative, delegate, own customer-visible quality |
| **Literature** | Sonnet-class | Tool-heavy retrieval + structured evidence JSON |
| **Hypothesis** | Opus-class | Deepest mechanistic reasoning where budget allows |
| **Routing / tags / light extract** | Haiku-class | Cheap structure when rubric says the task is classification-shaped |

We suggest **~100** end-to-end tasks (Part 2) and, when staging allows, a **bounded concurrency sweep** to stress **p95/p99**—SLAs care about variance, not averages alone.

**Caching + thinking:** [Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) rewards stable prefixes; rules are documented per product release. **[Extended / adaptive thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)** trades **tokens and latency** for quality on the hardest steps—that is a **quality–latency–cost** choice, not “free depth.”

---

## Part 1 · The Agent SDK — architecture and key technical details

**`while (stop_reason == tool_use)` in plain terms:** the model returns “please run tool X with args Y”; **your code** must run X, feed the result back, call the model again, and repeat until the model stops asking for tools. That loop is easy to sketch and hard to run in production (streaming, retries, partial failures, security).

**What `query()` changes:** you hand Claude a **goal** and **options** (allowed tools, agents, hooks, permissions); the SDK runs the **turn-taking loop** and **tool execution plumbing** so your service mostly **reacts to events** (messages, tool results, final output) instead of re-implementing the loop yourself ([Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview)).

**Built-in tools** — Claude can already use these **out of the box** (names match our docs); your code can still wrap or deny them per policy:

| Tool | What it does |
| --- | --- |
| **Read** | Read files in the working directory |
| **Write** | Create new files |
| **Edit** | Precise edits to existing files |
| **Bash** | Shell commands, scripts, git |
| **Monitor** | Watch a background script line-by-line |
| **Glob** | Find files by pattern |
| **Grep** | Search file contents (regex) |
| **WebSearch** | Web search for current information |
| **WebFetch** | Fetch and parse web pages |
| **AskUserQuestion** | Clarifying questions (see [user input](https://docs.anthropic.com/en/agent-sdk/user-input)) |

**How to read the table:** **Read / Write / Edit / Glob / Grep** are **workspace** tools; **Bash** is **compute**; **WebSearch / WebFetch** are **open-web** retrieval; **AskUserQuestion** is for **interactive** clarification when you attach a UI. NovaMind’s **regulated PubMed path** is not “another built-in row”—it lands as **your MCP tools** (next section).

**PubMed production:** **PubMed ~3y** stays behind **your** RAG + **custom tools** and/or **MCP** servers (`mcp__pubmed__…`) so retrieval, ACLs, and checksums stay **yours**. Built-in **WebSearch** / **WebFetch** show how the SDK reasons about the open web; they **do not** replace your regulated corpus path.

---

## Part 1 · Subagents — the multi-agent architecture NovaMind needs for Q2

**Concept:** a **subagent** is a **child Claude run** with its **own mini-conversation**: it can spam tools and long intermediate text **without** stuffing all of that into the **parent** transcript. The parent only sees a **handoff package** (structured JSON or a short memo)—think **specialist report**, not **specialist’s scratchpad**.

**What they are:** separate agent instances the parent can spawn; **child context is isolated**—intermediate tool payloads stay in the child; the parent receives a **delegated result** (see [Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)).

**Three ways to create them (conceptual):** programmatic **`agents` / `AgentDefinition`** in `query()` options; filesystem agents under **`.claude/agents/`** when using Claude Code-style config; built-in general-purpose subagent where enabled.

**Why subagents matter:**

1. **Context isolation** — dozens of PubMed calls do not flood the coordinator transcript; parent sees **digest + manifest**.
2. **Parallelization** — literature and sponsor/data legs can run **concurrently** where independent.
3. **Specialized instructions** — per-agent prompts for retrieval vs biostat vs hypothesis without bloating one system blob.
4. **Tool restrictions** — literature profile **read-only**; data profile **sandboxed**; hypothesis profile **read-only on primary evidence** if that is your policy.

**Recommended project (Part 3):** the **coordinator → literature ∥ data → hypothesis** shape is the direct application: **isolated** PubMed-heavy traces, **parallel** literature and sponsor-backed numeric prep when dependencies allow, **per-lane** domain prompts, and **least-privilege** tool lists per agent.

Each **`AgentDefinition`** carries `description`, `prompt`, `tools`, `disallowedTools`, `model` (aliases like **`sonnet` / `opus` / `haiku` / `inherit`** or a full model id), and **`skills`** when using [Skills](https://docs.anthropic.com/en/agent-sdk/skills).

**Model override per subagent:** route **hypothesis** to a deeper class, **literature/data** to Sonnet-class workhorse lanes, **routing** to Haiku-class—**measure cost and quality** per lane on your traces.

---

## Part 1 · Structured outputs across full tool runs

**Concept:** a **tool trajectory** means “model called PubMed MCP **n** times, Bash **m** times, then wrote JSON.” **Structured outputs** mean the SDK keeps enforcing your **schema across that whole trajectory**, not only on a **single** final chat message.

Raw API **structured output** benchmarks measure a **different surface** than **Agent SDK schema-enforced** outputs across a **full tool trajectory**.

- **Sub-test A — raw API:** OpenAI vs Anthropic **Messages** + JSON / function-calling—this is where another vendor may lead on **raw** JSON surfaces and deserves a fair comparison.
- **Sub-test B — SDK-enforced:** same **`HypothesisPack`** (or production schema) via Agent SDK **structured outputs**—measure **schema violation rate**, **retry count**, **time-to-valid JSON** **after** tool rounds.

**Bottom line:** downstream biotech automation needs **`HypothesisPack`** reliable **after** PubMed + sponsor tools—not only on a one-shot completion.

---

## Part 1 · Reliability (A) — Citations API and regulated framing

**Concept:** **Citations** (on supported native paths) tie model statements to **specific spans** in **documents you supplied**—closer to **evidence tagging** than to “model promises it read the paper.” That is a different reliability story than prompt-only “cite your sources.”

**Native citations** (see **[Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)**) ground model text in **retrieved documents** with structured citation metadata—**stronger** than “prompt-only: please cite PMIDs” for auditability, when paired with **your** validators.

**Regulated evidence path:** production **PubMed ~3y** stays behind **NovaMind RAG + MCP + ACLs**—**WebFetch** illustrates generic web retrieval in the SDK; it is **not** interchangeable with corpus-backed PubMed production.

---

## Part 1 · Reliability (B) — Structured outputs vs OpenAI compatibility `strict`

**Concept:** **`strict: true`** in some OpenAI-style tool schemas asks the **API** to enforce JSON shape. Anthropic’s **OpenAI-compatible shim** documents that **`strict` is ignored**—so “drop-in” compatibility **does not** move Sub-test B onto that path.

Agent SDK **structured outputs** follow the native **[Structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)** path—validated JSON for **`HypothesisPack`** **after** tool rounds (Sub-test B above).

**OpenAI SDK compatibility:** our **[OpenAI SDK compatibility](https://docs.anthropic.com/en/api/openai-sdk)** layer **ignores `strict`**—tool JSON there is **not** schema-guaranteed. For **guaranteed** conformance, use **native Claude + Structured Outputs** with the Agent SDK.

**Week 1 cadence:** express **`HypothesisPack`** in **Pydantic** / **Zod** and run **~1k** Sub-test B calls—track **schema violation rate**, **retries**, and **time-to-valid JSON** on frozen tasks.

---

## Part 1 · Reliability (C) — Adaptive thinking, effort, compaction

**Concept:** **Extended / adaptive thinking** lets Claude spend **extra hidden reasoning tokens** before answering—useful for hard hypothesis merges; it is **not free** (time + cost). **Compaction** means the runtime may **shorten old transcript** to save context—**governance** means you **archive** first if regulators need the full trace.

**Reasoning controls:** **[Extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)**, **[adaptive thinking](https://docs.anthropic.com/en/docs/build-with-claude/adaptive-thinking)**, and **[effort](https://docs.anthropic.com/en/docs/build-with-claude/effort)** shape internal reasoning on newer Sonnet/Opus SKUs—**behavior differs by model version**; see the extended-thinking guide for the SKU you standardize on.

**OpenAI compatibility layer:** **prompt caching** and **`response_format`** are **not** supported on that shim—**citations, structured outputs, caching, and full thinking visibility** belong on **native** Claude APIs with the Agent SDK.

**Compaction / context management:** if you adopt **conversation compaction** (where available), treat it as **governance**: **archive** transcripts and tool-return fingerprints **before** evidence needed for downstream citations could be dropped—same principle as the Hooks slide. **Failure-mode mindset:** many “model regressions” in long jobs are actually **compaction**, **tool rename + `dontAsk`**, or **schema drift**—instrument each layer separately.

---

## Part 1 · Reliability (D) — Permission layer order and modes

**Concept:** **permissions** answer “**may** this tool run at all?”—distinct from “the model asked nicely.” Modes like **`dontAsk`** vs **`default`** trade **headless safety** (deny unknown tools) vs **interactive** approvals (`canUseTool`).

**Tool permission evaluation order** (see **[Configure permissions](https://code.claude.com/docs/en/agent-sdk/permissions)**): **Hooks** → **deny rules** (`disallowed_tools` / settings) → **permission mode** → **allow rules** (`allowed_tools`) → **`canUseTool`** — except in **`dontAsk`**, where **unmatched tools are denied** without calling `canUseTool`.

**Permission modes** (as documented):

| Mode | Behavior (summary) |
| --- | --- |
| **`default`** | Standard flow; unmatched tools defer to `canUseTool` |
| **`dontAsk`** | Deny unless pre-approved—useful for **headless** agents with a **fixed** tool surface |
| **`acceptEdits`** | Auto-approve scoped file / filesystem operations per doc |
| **`bypassPermissions`** | Auto-approve tools that reach this step—**hooks and deny rules still apply**; **not** for customer production |
| **`plan`** | Read-only style exploration per doc |
| **`auto`** | Model-classified approvals (**TypeScript**); see docs for availability |

**Recommended headless composition (illustrative, not prescriptive):** split **read-only** retrieval lanes from **mutating** compute lanes. On **retrieval-only** agents, combine **narrow `allowed_tools`** with **`dontAsk`** so approved MCP tools (for example `mcp__<corpus>__search`) run **without** blocking on `canUseTool`—**unmatched** tool names **deny** by design. For **Write/Edit** scratch space, pair **`acceptEdits`** (where risk is acceptable) with **`PreToolUse`** **path allowlists**: only under a **sandbox prefix**, deny parent traversal and writes to **vcs roots** or **secrets paths**. Reserve **`bypassPermissions`** for **trusted single-tenant engineering sandboxes** when you need fast iteration—**hooks and deny rules still apply**; it is a poor default for **multi-tenant production** because it removes the permission-layer friction you normally want for customer traffic.

---

## Part 1 · Hooks — production control and audit trail

**Concept:** **hooks** are **your functions** the SDK calls **before or after** tool use (and at other lifecycle points). They are how you turn “model asked to `Write`” into “**deny** unless path is in `/sandbox`” or “**log** this corpus query to the audit table.”

**What they are:** callbacks at lifecycle points—**block**, **log**, **transform**, **require approval** (see [Hooks](https://docs.anthropic.com/en/agent-sdk/hooks)).

The [Hooks](https://docs.anthropic.com/en/agent-sdk/hooks) guide covers **`PreToolUse`**, **`PostToolUse`**, **`Stop`**, session lifecycle hooks, and additional events for your SDK language and version.

**Reliability stack:** hooks are **not** a substitute for **`allowed_tools` / `disallowed_tools`**, but they are where **tenant policy** and **deny-by-code** meet **untrusted model output** (paths, URLs, shell fragments).

**Production-style patterns (illustrative):**

- **`PreToolUse` on `Write` / `Edit` / `Bash`** — normalize paths, enforce a **single sandbox root**, reject `..` and absolute paths outside that root, and cap write sizes where your OS allows. For **shell**, many teams **parse the first token** against an allowlist of interpreters/commands instead of accepting unconstrained **`bash -c`** from the model.
- **`PreToolUse` on outbound tools (optional)** — attach signed metadata, enforce **host allowlists** for `WebFetch`, or require **human approval** for out-of-domain fetches when you run **`default`** mode with interactive `canUseTool`.
- **`PostToolUse` on retrieval / MCP / web** — emit structured audit rows: **tool name**, **tenant and session ids**, **query** (or a **hash** if you must avoid storing raw PHI), **identifiers returned** (PMID, DOI, URL), **latency**, **model SKU**—enough to reconstruct “what the model saw” for **citations** and **post-incident** review without necessarily retaining full payloads forever.
- **`PostToolUse` after mutating tools** — record **paths touched** and **content checksums** or short diffs for forensics.
- **Session lifecycle / compaction** — if you enable **conversation compaction** or similar context management, **archive** transcript slices and **tool-return fingerprints** **before** the runtime drops detail that downstream **Citations** or regulators would need—treat compaction as an explicit **retention and evidence** decision, not silent token savings.

---

## Part 1 · Sessions — long-running research workflow support

**Concept:** a **session** is the **saved transcript + tool history** for one agent run. **`resume`** continues after timeouts or deploys; **fork** copies history so a researcher can try a **variant** without destroying the original run.

**What they are:** persisted conversation + tool history so **resume** is not “new chat amnesia” ([Sessions](https://docs.anthropic.com/en/agent-sdk/sessions)).

**Resume and fork:** **`resume(session_id)`** continues a run; capture `session_id` from init messages; **fork** branches from the same evidence base where the SDK supports it.

**SessionStore** ships adapters for **S3**, **Redis**, and **Postgres**—choose the backend that fits tasks that span hours or compliance holds.

---

## Part 1 · Observability — integration with your stack

**Concept:** **OpenTelemetry (OTLP)** is an industry-standard wire format for **traces / metrics / logs**. The Agent SDK ecosystem can emit OTLP so NovaMind’s existing **Datadog / Honeycomb / Grafana / LangSmith** collectors ingest **the same** agent events your SREs already know how to query.

**OTLP export:** the SDK ecosystem supports exporting **traces / metrics / logs** to OTLP-compatible backends—**Honeycomb, Datadog, Grafana, Langfuse, self-hosted collectors, and LangSmith** where OTLP ingestion is enabled.

**Practical tagging:** attach **`customer_id`**, **`research_task_id`**, **`agent_role`** (coordinator / literature / data / hypothesis) as attributes so cost and latency slice cleanly.

**Span naming:** span **names** can evolve between releases—**stable resource attributes** and **`session.id`**-style correlation are what finance and reliability teams should standardize on.

---

## Part 1 · MCP — your RAG pipeline and evaluation stack

**Concept:** **MCP (Model Context Protocol)** is a **standard way to expose tools and data** to Claude—your PubMed service, sponsor DB reader, or Braintrust scorer runs as an **MCP server**; the Agent SDK registers it; Claude sees tools like **`mcp__pubmed__search`**. You keep **auth, rate limits, and row-level security** in **your** server.

**What it is:** open standard for tools and data sources; SDK configures `mcp_servers` / `mcpServers` ([MCP](https://docs.anthropic.com/en/agent-sdk/mcp)).

MCP tools commonly follow **`mcp__<server>__<action>`** naming.

**NovaMind applications:**

- Wrap **PubMed RAG** as an MCP server → literature sub-agent calls **`mcp__pubmed__search`** (exact names match your server registration).
- Wrap **Braintrust** (or internal scorers) for **protocol-shaped** scoring tools.
- Wrap **sponsor experimental data** readers with the same lifecycle as other tools—**rectangular rows** for LangSmith → Braintrust exports.

---

## Part 1 · Agent Skills — building reusable domain packages for pharma customers

**Concept:** a **Skill** is a **folder of instructions and assets** (markdown, scripts) the agent can **load on demand**—**progressive disclosure**—so you do not paste fifty pages of SOP into every request. One **skill pack** can be shared across **internal** and **customer** agents with review gates.

**What they are:** organized folders of instructions, scripts, resources—**progressive disclosure** so large domain packs do not flood every turn ([Skills](https://docs.anthropic.com/en/agent-sdk/skills)).

**Where Skills run:** Claude.ai, Claude Code, Agent SDK, Developer Platform—**one skill pack** can ride across internal and customer-facing agents with governance review.

A **`drug-discovery-research`**-style skill can package PubMed query patterns, evidence-quality rubric, citation formatting, and sponsor-language guardrails—then **parameterize** per therapeutic area and tenant.

---

## Part 1 · Differentiation — why Agent SDK for NovaMind

**Concept (how the pieces fit):** **MCP** brings **your** data; **subagents** isolate **fan-out**; **hooks + permissions** enforce **policy**; **sessions** keep **long jobs** alive; **structured outputs + citations** bind **customer-visible JSON** to **evidence**; **Skills** ship **domain SOPs**; **OTLP** proves **who spent what** per tenant. The Agent SDK is the **glue layer** that keeps those concerns **composable** instead of one-off.

**Raw API vs Agent SDK — what you actually get:**

- **Managed multi-turn tool execution** instead of hand-rolled `while (stop_reason == tool_use)` ([Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview)).
- **First-class** subagents, hooks, permissions, sessions, MCP, Skills—**product primitives**, not one-off infra science per squad.
- **Observable** agent lifecycle via OTLP for finance- and compliance-friendly slicing.

**Cookbook / migration:** our **[Migrating from the OpenAI Agents SDK](https://platform.claude.com/cookbook/claude-agent-sdk-04-migrating-from-openai-agents-sdk)** guide and **[companion notebook](https://github.com/anthropics/claude-cookbooks/blob/main/claude_agent_sdk/04_migrating_from_openai_agents_sdk.ipynb)** map tools, guardrails, and sessions for your engineers.

**Subagents + literature:** coordinator delegates **literature → hypothesis** with **isolated** child context (see [Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)) so PubMed-heavy tool payloads do not collapse parent coherence—this is the **Q2-shaped** alternative to bolting parallel calls onto a single transcript.

**Citations vs prompts-only:** structured, document-linked citations reduce “plausible PMID” failure modes versus prose-only instructions—**pair with** existence / passage / claim checks in your eval harness (Part 2, **citation pillar**).

**Life sciences + PubMed:** **Claude for life sciences** positioning and connectors on **[anthropic.com](https://www.anthropic.com)**. **PubMed** ships as a **Claude.ai connector** (Connectors), **Claude Code** plugin **`pubmed@life-sciences`** via marketplace **[anthropics/life-sciences](https://github.com/anthropics/life-sciences)**, and **hosted PubMed MCP** for API builds—see **[Using the PubMed Connector in Claude](https://claude.com/resources/tutorials/using-the-pubmed-connector-in-claude)** (beta **`mcp-client-2025-11-20`**). That is **NLM-shaped** retrieval; **your** sponsor-scoped PubMed RAG and eval corpora stay on **custom MCP**. **Customer names** belong on **your** approved external slides, not ours.

**Developer familiarity:** teams already effective with **Claude Code** patterns map cleanly to **Agent SDK** options—lower coordination tax than a greenfield custom orchestrator.

**Model and cloud agnosticism:** run agents on **direct Anthropic API**, **Amazon Bedrock**, **Google Vertex AI**, **Microsoft Foundry**, etc. (see Agent SDK setup docs)—per-subagent **`model`** on **`AgentDefinition`** keeps lanes **explicit** and swappable.

---

## Part 2 — The evaluation framework — detailed and practical

## Part 2 · Why this evaluation is shaped this way

**Concept:** the board and CTO need **production-relevant** signal—not a beauty contest on generic chat benchmarks. Where it matters, run **paired comparisons** at the **right abstraction layer** (raw completion API vs **Agent SDK** with schema enforcement) so nobody confuses **model JSON habits** with **system guarantees**.

---

## Part 2 · Four things worth measuring — and why each matters

1. **Structured output reliability** — fastest to run; separates **raw API** behavior from **SDK-enforced** contracts (**Sub-test A vs B**).
2. **Citation accuracy** — **existence**, **passage**, and **claim** are different failure modes; all three matter for regulated literature workflows.
3. **Long-context scientific reasoning** — hardest and slowest; usually requires **human expert** scoring on a **fixed rubric**.
4. **End-to-end pipeline cost** — **$/completed `ResearchTask`** (and latency tails) on **frozen** rows, with **token accounting** that reflects **prompt caching** and **[Message Batches](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)** where applicable—not list-price $/1M tokens alone.

---

## Part 2 · 1 · Structured output reliability — at the right abstraction layer

**Why it is the CTO’s first concern:** it is the **fastest** high-signal test and it clarifies **what “JSON reliability” even means** in production.

**Sub-test A — raw API surface:** structured output reliability is primarily a **model + API** question: how often does the model return JSON that **conforms** to your schema **without** a framework re-prompting? Another vendor’s **native structured outputs** may look strong here—**that is fine**; record it honestly.

**Sub-test B — Agent SDK surface:** with Agent SDK **[structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)** tied to **Pydantic** / **Zod**, reliability becomes a **system** property: the SDK **validates** against the schema and **re-prompts** on mismatch. The headline shifts from “does the model conform?” to **retry rate**, **extra latency**, and **extra tokens** to reach a valid pack.

**Run both:** reproduce the CTO’s benchmark on **Sub-test A** (expect a strong vendor to **win or tie**), then run the **same frozen rows** on **Sub-test B** (expect **parity or Claude advantage** because enforcement **neutralizes** much of the pure model-level gap). Presenting **both** numbers keeps the conversation honest: “you were right on raw API—here is the **production-relevant** comparison.”

**What to measure:** schema **violation rate** on first attempt; **retry count**; **time-to-valid JSON** including retries at **p50 / p95 / p99**; **field completeness** (required fields **semantically populated**, not merely structurally present—e.g. empty `passage` fields can pass schema and still break downstream).

**Dataset discipline:** prefer **real production request shapes** over synthetic-only suites—synthetics skew **simple and uniform** and often **under-estimate** failure rates. A practical target is on the order of **~200** frozen rows sampled from **your** distribution (scale up after regressions are stable). After the harness is stable, scale **Sub-test B** toward **~1k** calls if you need tighter confidence intervals on violation and retry rates.

---

## Part 2 · 2 · Citation accuracy — the non-negotiable

**Why it dominates for this product shape:** “zero tolerance for hallucinated citations” is not a taste preference—it is a **liability and integrity** boundary when scientists act on retrieved evidence.

**Three failure types — measure separately** (different root causes, different fixes):

- **Existence failures** — PMIDs / DOIs that **do not resolve**. **Auto-gradable** (binary): query your resolver / PubMed for every identifier returned.
- **Passage failures** — the paper exists, but the **quoted span** is not faithful to the source. Compare cited **passage** to source text; **[Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)** on native paths is designed around **passage-grounded** extraction—pair with **substring** checks and, for near-misses, an **LLM judge** to separate acceptable paraphrase from fabrication.
- **Claim failures** — real paper, real passage, but the **scientific conclusion attributed** to the paper is wrong. Usually needs a **domain rubric** (e.g. **0–3** scores, not binary) and often an **LLM-as-judge** with spot human audit.

**Adversarial slice:** include roughly **~20%** of rows where the correct behavior is **“this paper does not support this claim.”** Penalize **false positives** (citing support where none exists) as heavily as false negatives—otherwise the system can look “good” while still **hallucinating support**.

**Scale:** pilot **N**, then grow toward **500+** when infra allows—small deltas at volume become statistically meaningful.

---

## Part 2 · 3 · Long-context scientific reasoning — hardest test, most differentiated

**Concept:** this is where **native long context** and **reasoning controls** can matter—and where **automation alone** is usually insufficient.

**Corpus and tasks:** feed **50+** papers / **100k+** tokens representative of **your** PubMed retrieval; require tasks that force **true synthesis** across the corpus—not single-fact lookup. Examples: **contradictions** across papers; **trace how paper X was refined/disputed by Y/Z**; **hypothesis that requires weaving** multiple experimental designs.

**Method:** prioritize **blind human review** (ML/AI plus domain stakeholders) on a rubric scored **before** you read model outputs—**evidence coverage**, **reasoning quality**, **appropriate uncertainty**, **absence of unsupported claims**. Anthropic’s public evaluation guidance stresses **automation where possible** but acknowledges **human judgment** for tasks that automated metrics cannot faithfully capture.

**Fairness:** identical inputs, **blinded** outputs, same rubric, **pre-registered** scoring rules.

**Expectations:** deltas often show up on **tension-heavy** tasks (contradictions, long chains), not on **trivial** single-abstract summaries where frontier models are already strong.

---

## Part 2 · 4 · End-to-end pipeline cost — the board’s question

**Concept:** the decision-relevant unit is **cost per completed `ResearchTask`** across **the whole agent pipeline** (all tool turns, all subagents), not headline **$/1M tokens** in isolation.

**Instrument every run:** split **cached vs fresh input tokens**, **output tokens**, and (where used) **batch** vs online—then map to **$/task** at **your** concurrency and **your** monthly volume baseline.

**Caching and batch (verify on current docs):** **[Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)** can materially reduce cost for **large stable prefixes** (system prompts, repeated corpus context)—see **pricing** for cache read/write multipliers and how they **stack** with other modifiers such as **[Message Batches](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)**. Treat published economics as **inputs to a model**, not a promise: **measure** on **50–100** frozen end-to-end tasks against **your** current stack.

**TTL caveat (CTO detail):** the public caching guide documents a **default minimum cache lifetime** and a **1-hour** option for workloads with **longer gaps** between requests; batch workloads may need **1-hour blocks** or **pre-warm** patterns because **5-minute** entries can expire between asynchronous completions—confirm the **current** TTL and pricing table before locking board numbers.

**Fold in latency + coordination:** the same end-to-end runs should capture **TTFT** and **p95/p99 wall clock**, plus **routing / handoff** quality (coordinator → literature → hypothesis, **plus data** when ready)—those are the old “multi-agent + latency” dimensions, now measured **on real pipeline traces** rather than as disconnected micro-benchmarks.

---

## Part 2 · What this evaluation is not

- **Not a migration decision** for the **legacy** customer-facing stack—the scope is whether the **Q2 multi-agent research workflow** should be built **natively** on the Agent SDK **in parallel**, with rollback.
- **Not a comprehensive LLM benchmark program**—prefer **four sharp pillars** over twenty shallow ones; keep the two-week box **decision-grade**, not encyclopedic.
- **Not one-and-done**—the Braintrust projects, citation graders, schema tests, and token accounting should become **ongoing** regression harnesses (CI / release gates) as prompts and SKUs change.

---

## Part 2 · Two-week timeline — and why it does not hijack the roadmap

**Week 1 — fast tests (often batch-friendly):**

- **Days 1–2 · Structured outputs:** stand up **Sub-test A** and **Sub-test B** on the same frozen rows; wire **Braintrust** on **both** arms; run overnight **[Message Batches](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)** where eligible to save cost; scale **Sub-test B** toward **~1k** calls once the harness is stable.
- **Days 3–5 · Citations:** run the **existence / passage** graders at volume; route **claim** and adversarial rows through the judge queue; freeze prompts and dataset IDs.

**Week 2 — prototype is product work:**

- **Days 1–4 · Agent SDK prototype:** build the **3-agent** or **4-agent** pipeline (coordinator + literature + hypothesis, **plus data** when that lane is ready) with minimum **`PreToolUse` / `PostToolUse`**—this is **Q2-shaped** engineering, not throwaway spike code.
- **Days 5–7 · End-to-end runs:** **50–100** frozen **`ResearchTask`**s through the prototype—**$/task**, **p95/p99**, and **quality** using the same rubrics as Week 1; optional **bounded concurrency** sweep if staging allows.

**Why it stays parallel:** Week 1 is mostly **automated** scoring after setup; Week 2 is work you likely need **anyway** for Q2—the incremental tax is **rigor** (frozen rows, paired arms), not a second unrelated program.

---

## Part 2 · Handling results honestly

**Four outcomes — four responses:**

1. **Claude ahead on the pillars that matter** — straightforward path to **ship Q2 on Agent SDK**; bring **cost curves** to the board, **schema retries** to the CTO, **citation deltas** to science leadership.
2. **Mixed (typical)** — e.g. strong **citations / long-context** on Claude, another vendor ahead on **raw** structured JSON—still often rational to **route literature + hypothesis** on Claude while keeping **data / code-heavy** lanes **swappable** via **`AgentDefinition.model`** (see Part 3).
3. **Other vendor ahead even on Sub-test B** — acknowledge plainly; narrow Claude’s first wedge (e.g. **hypothesis-only**) or invest in harness gaps before widening scope.
4. **Inconclusive** — almost always **dataset volume or representativeness**; **double N** and rerun in **batch** mode before redesigning the rubric.

**Principle:** slightly **noisier** automated grading at **higher N** usually beats tiny hand-perfect sets for **model selection** decisions.

---

## Part 2 · Using Braintrust

**First move:** run **both** Claude and OpenAI outputs through the **same** Braintrust project and scorers.

**Replay discipline:** **evaluation is the work**—freeze prompts, tool stubs, and dataset IDs so comparisons stay **apples-to-apples**.

**Persistent harness:** treat eval assets like **product code**—wire scorers into **PR / release** checks so prompt and SKU changes surface **regressions** early (exact CI integration depends on your repo; the goal is **continuous**, not one-off).

**Longer term:** Braintrust (or scorers) as **MCP tools** for **in-loop** quality signals—**post-hoc** eval becomes **live** guardrails where policy allows.

---

## Part 2 · Decision gate, compatibility note, and migration cookbook

**Decision gate (all three for a clear “ship Q2 on Agent SDK” read):** **citation** pillar at **parity or better**; **Sub-test B** structured outputs at **parity or better**; **$/completed task** favorable **after** realistic **cache + batch** assumptions from **your** traces. If **citation** wins but **cost** loses, that is a **board-level** trade—still a useful outcome. If signals are weak, **widen harness and N**, not customer traffic.

**OpenAI → Claude:** the **[OpenAI Agents → Claude Agent SDK](https://platform.claude.com/cookbook/claude-agent-sdk-04-migrating-from-openai-agents-sdk)** cookbook maps tools, guardrails, and sessions. On the **[OpenAI SDK compatibility](https://docs.anthropic.com/en/api/openai-sdk)** path, **system and developer messages are hoisted** into Anthropic’s single initial system message—design for that shape when spiking, then move production features to **native** Agent SDK.

---

## Part 3 — Recommended first project — full detail

---

## Part 3 · The strategic framing

**Not a migration story first:** ship **NovaMind’s Q2 multi-agent research workflow** **natively** on the Agent SDK on a **parallel** branch.

**CEO:** fastest path to the board mandate—orchestration, isolation, sessions, telemetry patterns **without** re-proving every legacy route on day one.

**CTO:** existing OpenAI production stays; this is **additive** science on **frozen** tasks and **clear** rollback.

**OpenAI-compatible spikes:** **[documented limitations](https://docs.anthropic.com/en/api/openai-sdk#important-openai-compatibility-limitations)** include **`strict` ignored**, **no prompt caching on the shim**, and **system/developer hoisting**—successful spikes should **graduate** to **native** Agent SDK for citations, structured outputs, and caching.

**Full migration (after the eval gate):** **3–4 weeks** is a typical **order-of-magnitude** when surface area and owners are bounded—data-plane and compliance work can extend that; we plan buffer explicitly.

---

## Part 3 · Concrete architecture

**At-a-glance routing:**

| Agent | Model class | Tools | Output to downstream |
| --- | --- | --- | --- |
| **Coordinator** | Sonnet-class | Delegates via **`Agent`** tool; owns merge narrative | Final **`HypothesisPack`** / report assembly |
| **Literature review** | Sonnet-class | **WebSearch**, **WebFetch**, **Read**, **Grep** + **MCP → your PubMed RAG** | Structured JSON: papers, findings, citation objects, confidence |
| **Data analysis** | Sonnet-class | **Bash**, **Read**, **Write** (**sandbox dir only**—enforce with **`PreToolUse`**) + **MCP → sponsor data** | Stats summaries, anomaly flags, data-quality JSON |
| **Hypothesis generation** | Opus-class | **Read**-only on upstream JSON memos | **`HypothesisPack`** with evidence chain + confidence + suggested next experiments |

**Coordinator (Sonnet-class)** — Ingests the customer **`ResearchTask`**, decomposes into workstreams, launches **literature** and **data** subagents **in parallel** when their inputs do not depend on each other, merges their **typed JSON**, invokes **hypothesis**, and returns a final **`HypothesisPack`**. **Why Sonnet, not Opus, here:** orchestration and structured delegation sit on the **critical path for every job**; depth belongs in the hypothesis lane. Keep the coordinator **system prompt small** (routing, merge rules, output schema)—**domain science** lives in child prompts so the parent context stays lean. Declare **`HypothesisPack`** (and nested types such as evidence rows and statistical summaries) with **Pydantic** / **Zod** and wire them through Agent SDK **structured outputs** so the framework validates JSON **across tool turns**, not only on a one-shot completion.

**Literature review (Sonnet + MCP to PubMed RAG)** — **Keep** the corpus pipeline you already run; expose **PubMed ~3y** as an **[MCP](https://docs.anthropic.com/en/agent-sdk/mcp)** server (for example `mcp__pubmed-rag__search`). The agent calls MCP for ranked chunks / metadata and uses **Read** / **Grep** where files land on disk. Pair factual extractions with **[Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)** so `passage` fields are **grounded in source text**—Part 2’s **citation pillar** (existence / passage / claim) is the eval contract. **Tool allowlist:** retrieval-oriented tools plus MCP—**omit Write / Bash** so hostile abstracts cannot pivot to shell or arbitrary writes (**defense in depth** with [permissions](https://docs.anthropic.com/en/agent-sdk/permissions)). **Isolation:** dozens of abstract reads stay in the **child** transcript; the coordinator receives a **compact evidence list** ([Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)).

**Data analysis (Sonnet + Bash + sandboxed Write + sponsor MCP)** — Runs **Python/R-style** analysis via **Bash**, writes scratch artifacts only under a **sandbox output prefix**, and reads sponsor tables through **MCP** scoped by **customer_id** (no raw DB credentials in prompts—access stays **server-mediated**). **`PreToolUse`** on **Write** / **Edit** should **deny** paths outside the sandbox—**code-level** enforcement, not a prompt reminder. Returns **structured summaries** (metric, value, units, **quality_flag**, notes) so the hypothesis agent can down-rank weak experimental support.

**Hypothesis generation (Opus-class, read-only)** — Consumes **merged structured memos** from literature + data; performs mechanistic reasoning, **confidence calibration**, **contradicting evidence**, and suggested next experiments. **Why Opus here:** **cross-paper reasoning** and contradiction handling justify flagship cost; latency is usually acceptable because literature and data already finished (often in parallel). Prefer **narrow `allowed_tools`** (typically read-only). Encode **confidence rubrics** and **explicit contradicting evidence** in the schema and prompts. **[Adaptive / extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)** deepens reasoning on the hardest packs—**tune** to the SKU you standardize on.

**Sessions** — One **`session_id` per customer research task**; persist via **Postgres** `SessionStore` (or S3/Redis per [Sessions](https://docs.anthropic.com/en/agent-sdk/sessions)). Capture `session_id` from init messages and use **`resume`** for continuation after timeouts or deploys. **Fork** (where supported) enables “explore alternate hypothesis from this evidence” without losing the original thread.

**Hooks (production minimum)** — **`PreToolUse`** on **Write**/**Edit**/**Bash** for path allowlists and deny-by-default outside sandbox; **`PostToolUse`** on **WebFetch** / **WebSearch** / **PubMed MCP** for audit logs (query, PMID/URL, timestamp, `session_id`). **Compaction:** **archive** transcripts or checksums **before** summaries replace citation-critical detail; lifecycle events are covered in [Hooks](https://docs.anthropic.com/en/agent-sdk/hooks). **Notifications** — surface long-running job lifecycle and errors to **Slack** / **PagerDuty** via the SDK’s notification path where you enable it.

**Observability** — OTLP with **`customer_id`**, **`research_task_id`**, **`agent_role`** slices cost, latency, and failures per tenant, task, and lane. Teams on **LangSmith** typically point OTLP at **your** collector endpoint—it is **configuration**, not a new observability product.

**Skills** — A shared **`drug-discovery-research`** base skill carries cross-tenant heuristics (evidence rubric, citation hygiene, hypothesis shape); **per-customer overlays** capture therapeutic area and internal schema notes so onboarding is **directories plus governance review**, not a rewrite of agent code ([Skills](https://docs.anthropic.com/en/agent-sdk/skills)).

**Rollout watchpoints** — **Compaction** on the largest PubMed pulls; **tokenizer / SKU** shifts when you move Opus-class routes ([models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)); **version** coordinator delegation prompts with the same discipline as application code—small wording changes propagate to child behavior.

---

## Closing · OpenAI-only vs Agent SDK

**OpenAI-only** is a sound choice when **your** harness already delivers **multi-agent isolation, citation-grade governance, and eval coverage** at acceptable cost. The strategic question is whether **Q2** work is cheaper as **incremental patches** on that harness or as **Agent SDK** primitives (subagents, hooks, permissions, sessions) that Anthropic ships and evolves as a **product surface**.

**Custom orchestration:** staying on raw chat-completions usually means **you** own **tool loops, audit hooks, session persistence, and per-lane routing**—that is **engineering, SRE, and compliance** cost on top of **$/1M tokens**.

**Public benchmarks:** leaderboards are **directional**; they rarely match regulated **`HypothesisPack`** work. **Your** frozen **`ResearchTask`** rubric is the authority for go/no-go.

**Model optionality:** **`AgentDefinition.model`** plus supported cloud routes let you **swap lanes on evidence** without redesigning the orchestration layer each time a frontier SKU shifts.

---

## Appendix · Prior vocabulary (mitigation rows A–E)

| Row | Concern | Where we cover it |
| --- | --- | --- |
| **A** | Parent coherence under PubMed-heavy tools | Part 1 **Subagents** + built-in/MCP bridge |
| **B** | **`HypothesisPack` after many tools** | Part 1 **Structured outputs**; Part 2 **structured-output pillar** |
| **C** | Citations & sponsor governance | Part 1 **Hooks** + **MCP**; Part 2 **citation pillar** |
| **D** | Fair migration vs OpenAI | Part 2 **paired Sub-test A/B** + frozen-task framing |
| **E** | Decision-grade eval signal | Part 2 **four pillars** + timeline + **Braintrust** |

---

## Next steps

| Next step | Lead |
| --- | --- |
| Own eval pillars + Braintrust project | Eval lead + research PM |
| Build Agent SDK prototype + hooks | Platform / ML infra |
| Port `HypothesisPack` schema + validators | Product eng |
| OTLP → LangSmith (or collector) | Observability owner |
| Exec readout | CEO staff + CTO |

---

## Anthropic documentation

- [Agent SDK overview](https://docs.anthropic.com/en/agent-sdk/overview) — Client vs Agent SDK, built-in tools  
- [Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations)  
- [Structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)  
- [OpenAI SDK compatibility](https://docs.anthropic.com/en/api/openai-sdk) — limitations, `strict`, hoisted system messages  
- [Extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) · [Adaptive thinking](https://docs.anthropic.com/en/docs/build-with-claude/adaptive-thinking) · [Effort](https://docs.anthropic.com/en/docs/build-with-claude/effort)  
- [Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)  
- [Message Batches](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)  
- [Hooks](https://docs.anthropic.com/en/agent-sdk/hooks)  
- [Subagents](https://docs.anthropic.com/en/agent-sdk/subagents)  
- [Sessions](https://docs.anthropic.com/en/agent-sdk/sessions)  
- [MCP](https://docs.anthropic.com/en/agent-sdk/mcp)  
- [Permissions](https://docs.anthropic.com/en/agent-sdk/permissions) · [Configure permissions (layer order + modes)](https://code.claude.com/docs/en/agent-sdk/permissions)  
- [Skills](https://docs.anthropic.com/en/agent-sdk/skills)  
- [Claude models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)  
- [Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)  
- [Cookbook — Migrating from the OpenAI Agents SDK](https://platform.claude.com/cookbook/claude-agent-sdk-04-migrating-from-openai-agents-sdk)  
