# Leadership presentation — sample presenter script

**Source deck:** [`leadershipSlides.md`](leadershipSlides.md) (Presentation tab)  
**Companion brief:** [`leadershipPresentation.md`](leadershipPresentation.md) (Document tab)

This script is **intentionally verbose**—use it as a rehearsal guide and cut on the fly. Slide numbers match the **Presentation** tab order (1 = title, **37** = last appendix).

**Slides 4–16 (Part 1, primitives track):** For each slide, lead with **the problem** (NovaMind-shaped), then **without a productized harness**, then **with the Agent SDK**, then walk the table or diagram. **Slide 3** anchors **`ResearchTask` breakpoints**—then glossary and **Slide 5** front‑loads **task–model fit and per-lane routing**—not “one flagship fixes everything.”

**Pacing legend**

| Tag | Meaning |
| --- | --- |
| **~Xs** | Suggested time if presenting this slide in a **full** walkthrough |
| **[SHOW]** | Point at something on the slide |
| **[PAUSE]** | Stop for questions |
| **→ Skip** | Safe to advance quickly in a **15–20 min** exec read |

---

## Before you start (not a slide)

**Audience:** NovaMind CEO / CTO. They care about reliability, latency, structured outputs, migration honesty, differentiation, and speed without breaking customers.

**Your through-line:** This is **not** “replace GPT with Claude.” It is **whether NovaMind’s governed multi-agent research workflow** should be built on **Agent SDK primitives** in **parallel**, with **frozen-task evidence** before any production cutover.

**Ask up front:** “Interrupt me anytime—especially on eval design and what stays on OpenAI production.”

---

## Slide 1 — Title · Claude Agent SDK for NovaMind (~1 min)

**[SAY]**  
Thanks for the time. Today I want to walk through three things in order: **why the Agent SDK fits NovaMind’s product shape**, **how we’d evaluate it fairly against your current stack—including GPT‑5, GPT‑5‑mini, and Gemini 3**, and **what a concrete first project looks like** without asking you to migrate customers on day one.

Quick vocabulary: **Claude** is our model family. The **Agent SDK** is our **library** that runs the same kind of **multi-step tool loop** you see in **Claude Code**—but embedded in **your** backend. The model proposes tools; your code executes them; results go back; repeat until the job is done.

**[SHOW]** Title + subtitle + **Key considerations:** three bullets — **Why the Agent SDK** · **Eval framework** · **What to build first**.

**[SAY]**  
The headline for the whole meeting: NovaMind would ship a **governed multi-agent research workflow**—literature, sponsor data, hypothesis—in **parallel** with today’s production stack. Not rip-and-replace on slide one.

---

## Slide 2 — NovaMind today — architecture and considerations (~2 min)

**[SAY]**  
Let me anchor on **your** product, not ours. NovaMind is a **semi-autonomous research agent** with specialist sub-agents for **literature review**, **data analysis**, and **hypothesis generation**. You’ve built **ingestion and RAG** over **PubMed** (~**three years**), the **data agent validates** against **client experimental data**, and you’re experimenting with **agentic search** and **context management** for **long trajectories**.

You already run **multi-step tool orchestration**. You own prompts, **tenant boundaries**, integrations, and what each lane is allowed to touch. That’s the world we’re designing for.

**[SHOW]** **Your priorities** bullets.

**[SAY]**  
You’ve told us you care about **production reliability, latency, and structured outputs**; **migration complexity** and a **fair comparison** to OpenAI; clear **“why switch”** differentiation; and **speed of evaluation** without destabilizing the roadmap or existing customers. Everything in this deck should map back to those five concerns. If something doesn’t, tell me and we’ll skip it.

**[PAUSE]** “Does this match how you describe the product internally?”

---

## Slide 3 — Three breakpoints in NovaMind-shaped research (~2.5 min)

**[SAY]**  
NovaMind’s workflow is **literature parallel data → hypothesis → citation-checked deliverable**—not one long chat.

**Harness on this slide, not “later”:** the **Agent SDK harness** is **`query()`**, events, **agent definitions**, tools/MCP, hooks, structured outputs—the **productized loop**. The three breakpoints are **where** you need **Subagents, Sessions, Citations** inside that loop so the job stays **parallel, resumable, and passage-grounded**.

**Framing:** **next**—**primitives glossary**, **latency and routing per lane**, then **why Messages alone isn’t the whole job** (premise + code)—before structured outputs and the reliability arc.

**Three breakpoints**—follow the **`ResearchTask` lifecycle**:

1. **Parallel lanes** — Lit then data serialized or one fat parent thread → **walls** and brittle merges; **inside the harness:** **Subagents**, **max(lit, data)** when independent.

2. **Durable identity** — timeout/deploy → rerun dozens of pulls or lose audit spine; **inside the harness:** **`session_id`, resume.**

3. **Bounded synthesis** — PMIDs plausible in prose, passages wrong; **inside the harness:** **Citations** + your validators feeding Part 2 graders.

**[SHOW]** Table—read breakpoint column in **1→2→3** order; column three is **harness primitive**; walkthrough sentence as printed (**no** diagram).

**[SAY]**  
Part 2 measures these—we **name** each primitive **before** the deep primer so later slides read as **layers of one harness**, not unrelated features.

---

## Slide 4 — Part 1 · Primitives glossary (~2 min)

**[SAY]**  
Language for the rest of Part 1. One **`ResearchTask`** → one **`session_id`** → many tool turns.

**[SHOW]** Table—including **“problem it solves”** column.

**Models vs primitives:** model = **engine** (Opus/Sonnet/GPT‑5). Primitives = **frame**—whether the pipeline survives tenants, audit, and load. Upgrade the engine without the frame and you still fail.

**[SHOW]** Table—**Primitive** through **NovaMind use**.

**→ Skip** only if slide **3** landed fully and you’re time-pressed.

---

## Slide 5 — Latency and routing — model fit per lane (~2.75 min)

**[SAY]**  
**Frame:** One **`ResearchTask`** is **several chore types**—orchestration, retrieval, synthesis, packaged JSON—not one generic “IQ test.” Different chores favor **different model strengths**; **`model` per `AgentDefinition`** keeps that as **config**, not one global flagship.

**Opus** for **heavy synthesis**; **Sonnet** for **tool-heavy** coordinator/lit/data; **Haiku** for **fast routing** and light extract—then **freeze and measure** on **your** mix.

**[SAY]**  
**Problem:** customers care about **p95/p99** and **$/task**—not chat-bench wins. One model everywhere = over-pay Opus on routing or under-pay on hypothesis.

**With SDK:** **`AgentDefinition` per lane**; benchmark TTFT and tails on frozen end-to-end runs (Part 2).

**[SHOW]** **Claude family** line + **per-lane routing** table—coordinator ≠ hypothesis model class.

**[SAY]**  
Part 2 validates pairings on **your** IDs—this tees up **why per-lane model choice still isn’t enough** without the harness story on the **next** slides.

---

## Slide 6 — Harness vs model — premise + Messages burden (~2.75 min)

**[SAY]**  
**Problem:** govern the **whole system**—parallel lanes, dozens of tool rounds, tenant ACLs, audit—not just get a smarter completion.

**Reframe:** Messages API = “next turn in a **thread**.” NovaMind = “finish this **`ResearchTask`** across tools, lanes, tenants, and time.” Everything in that gap is **systems engineering**—you can chip it away with prompts, but you still own **the interpreter**.

**Without SDK:** you build the tool loop, routing, sessions, JSON enforcement on Messages API—every release.

**With SDK:** **`query()`**, subscribe to **events**; same family as Claude Code.

**Better flagship doesn’t fill the gap** — stronger SKUs sharpen **each turn**; **merges**, **retries**, **compaction**, and **where Hypothesis JSON is enforced** over a long run are still **your** design—not “we bought a bigger brain.”

**[SHOW]** Coordinator path + **four-step tool loop** + **two budget lines** table—then **Messages vs SDK ownership** table. Read **top → bottom** as one story.

**[SAY]**  
The loop is the same everywhere: **`tool_use`** → your MCP/process → **`tool_result`** → repeat → structured deliverable. On **Messages API** you own the **`while`**; on **Agent SDK** the library runs that loop.

**[SAY]**  
**Next slide** makes the split concrete in **a few lines** of code—you’re not cramming more primitives here on purpose.

---

## Slide 7 — Harness vs Messages API — code (~1.75 min)

**[SHOW]** Bridge line + side-by-side **code** — left **`while`** / **`messages.append`**; right **`query()`**, **`session_id`**, **`schema`**, **`hooks`**.

**[SAY]**  
**Left:** **`stop_reason`** doesn’t encode routing, merges, truncation, or audit—you implement that around **`execute_tool`** and **`messages`**. **Right:** the **`while`** moves into **`query()`**; **`hooks`**, **sessions**, **structured outputs**, **agents** are **configuration**, not another hand-rolled interpreter.

---

## Slide 8 — Structured outputs — enforcement with the Agent SDK (~2 min)

**[SAY]**  
This slide is **only** about **how the Agent SDK enforces** your **Hypothesis deliverable** schema—not benchmarks, not OpenAI **`strict`**, not eval design (Part 2 owns that).

**[SHOW]** **Without the harness** vs **With the Agent SDK** — post-step parse vs **`schema` on `query()`**.

**[SAY]**  
**[Structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)** sit on the **same `query()` path** as MCP: **schema on the job**, **typed JSON at handoffs** (lit / data / merge), **retries** that can target the step that broke the contract—not a final-turn scrape after **40** tool rounds.

**[SHOW]** Three bullets under **How enforcement shows up** + closing **What you ship** line.

---

## Slide 9 — Board mandate — model agnosticism (~1.5 min)

**[SAY]**  
**Problem:** board fears every new SKU forces a **rewrite** of prompts, routes, PubMed wiring.

**Without SDK:** vendor welded into architecture.

**With SDK:** stable graph; **`model` is a field**; frozen eval (Part 2) before swap.

**[SHOW]** Example: literature `model` id changes—MCP, hooks, schema unchanged. **Harness-level** agnosticism.

---

## Slide 10 — Subagents (~2 min)

**[SAY]**  
Coordinator = engagement lead. Subagent = consultant with their own notebook; parent gets a **one-page brief**, not the scratchpad.

**[SHOW]** Without vs with table; then mermaid.

**[SAY]**  
Reference pipeline: coordinator → **literature parallel data** → hypothesis → **citation audit**. That’s the shape Part 3 implements.

**→ Skip** deep dive on `AgentDefinition` fields—point to appendix.

---

## Slides 11–12 — Reliability A–B (~2 min total, or ~1 min combined in tight read)

### Slide 11 — Reliability (A) Citations (~1 min)

**[SAY]**  
**Problem:** plausible PMIDs in prose; QA reads summaries. **Without SDK:** prompt-only cites. **With SDK:** Citations + MCP corpus + Part 2 existence/passage/claim graders. WebFetch ≠ production PubMed.

### Slide 12 — Reliability (B) Thinking & compaction (~1 min)

**[SAY]**  
**Problem:** long PubMed runs → compress context → lose citation detail. **Without SDK:** silent evidence loss. **With SDK:** thinking as budget knob; **archive-before-compaction** via hooks.

**Tight read:** “Two reliability layers—citations and long-context discipline; tool policy lives on the **Hooks** slide next.”

---

## Slide 13 — Hooks (~1.5 min)

**[SAY]**  
**Problem:** untrusted paths/shell; prompts aren’t enforcement. **Without SDK:** hope + post-hoc logs. **With SDK:** PreToolUse deny sandbox escapes; PostToolUse audit rows for citation incidents.

**[SHOW]** Pattern bullets—sandbox + PubMed/MCP audit.

---

## Slide 14 — Sessions (~2 min)

**[SAY]**  
**Problem:** multi-hour jobs; deploy/timeout loses trace and forces PubMed replay. **Without SDK:** “new chat” summaries. **With SDK:** `session_id` + **resume** / **fork**. **Session ≠ token cache**—job identity for audit.

**[SHOW]** Problem / without / with / **what a session is** / **Operations** bullets (**resume** vs **fork**).

**[SAY]**  
**Resume** = same job, same evidence, no PubMed replay. **Fork** = new branch off the **same** retrieved corpus—try another hypothesis **without** touching the parent run already headed to the customer; promote only if you mean to.

---

## Slide 15 — MCP — data plane for PubMed, sponsor, and eval (~2.5 min)

**[SAY]**  
**Problem:** PHI/SQL in prompts; bespoke REST per squad; eval fixtures drift from prod. **Without SDK:** secrets in prompts; inconsistent tool shapes. **With SDK:** `mcp__server__action`; server-side auth; SDK routes `tool_use`.

Mental model + why not one-off REST (schemas, versioning, tenant ACLs).

**NovaMind servers:** PubMed ~3y RAG (not WebSearch for production), sponsor by `customer_id`, PMID verify, optional Braintrust MCP. **`pubmed@life-sciences`** = NLM demo; **your** regulated corpus stays custom MCP.

**[SHOW]** Problem / without / with + **Agent mental model** paragraph + **Why not REST** + **NovaMind-shaped servers** bullets (no diagram).

---

## Slide 16 — Agent Skills (~1.75 min)

**[SAY]**  
**Skills** = **Markdown-first** packs the agent **loads when needed**—not a 40-page system prompt on every call.

**Creating one is low ceremony:** **`SKILL.md`** under **`.claude/skills/<name>/`** in the **repo you already ship**—optional extra rubric or pattern files beside it. **Git review**, **no** new microservice to “enable” the skill.

**[SHOW]** Numbered **four-step** list on the slide.

**[SAY]**  
Same folder shape works from **Claude Code** through **Agent SDK**—compliance can review **one** `drug-discovery-research`-style pack; **tenant / TA** varies off the **`ResearchTask`**, not by copying the whole skill tree.

**→ Skip** if they’re not asking about **packaging SOPs** for multi-tenant rollout.

---

## —— Part 2 transition (~20 sec) ——

**[SAY]**  
Part 1 was **why the harness shape matters**. Part 2 is **how we measure the real risks** on frozen **`ResearchTask`** rows: **four failure modes → what to freeze → two arms → two Braintrust scorers → two-week plan (Sub-test A/B + attribution) → how to read results without averaging away the failure that matters**.

---

## Slide 17 — Part 2 Step 1 · Four failure modes (~2.25 min)

**[SHOW]** Four bold failure-mode headers + one paragraph each.

**[SAY]**  
Name what can go wrong **before** metrics—otherwise you optimize the wrong curve.

Walk **drift under tool load**, **citations that pass JSON but fail humans**, **long-context coherence** (often human-rubricked), and **p95 / tail** economics.

Close: **do not average** across modes—a 0.98 / 0.60 split is **diagnosable**, not “79%.”

---

## Slide 18 — Part 2 Step 2 · Freeze before you run (~2.5 min)

**[SHOW]** **`fixtures@v1`** stratification bullets + three freeze blocks (ground truth · MCP · scorers).

**[SAY]**  
**15–20** rows stratified: **5** high complexity, **5** medium, **5** known-failure (most credible signal), **3–5** adversarial.

**Tag v1**—never mutate mid-run; **`fixtures@v2`** ⇒ **rerun every arm**.

Ground truth **before** first run; **pinned MCP** stubs/replays; scorers **locked in code** (detailed next slide).

---

## Slide 19 — Part 2 Step 3 · The two arms — what each represents (~1.5 min)

**[SHOW]** **Arm 1 / Arm 2** bullets + optional **Gemini** line + monospace **tag** lines.

**[SAY]**  
**Arm 1** — **GPT‑5.1 Messages** baseline **as-shipped** (retry glue, re-prompt patches, post-hoc validators). **Honesty > vanity** — no “cleaned up” fake baseline.

**Arm 2** — **Agent SDK** parallel specialist build from Part 3 — **`session_id`**, **`citation_allowlist`**, **`audit_logger`**, typed merge.

Optional **Gemini** arm = same harness as Arm 2, **model** knob only.

Close: tag every run — `arm`, `model`, `research_task_id`.

---

## Slide 20 — Part 2 Step 4 · Scorers — citation grounding and time-to-valid (~2.5 min)

**[SHOW]** Intro bullets + **Citation grounding** + **Time-to-valid** blocks (Python snippets, targets) + **Braintrust** tagging line.

**[SAY]**  
**Lock both scorers before run 1** — post-hoc criteria = rationalization.

**Citation grounding** — non-empty **`passage`**, allowlisted PMID, passage ∈ abstract; **≥0.95** target; **<0.80** on any row = stop-ship.

**Time-to-valid** — wall clock to accepted **`HypothesisDeliverable`**; report **p50** and **p95** — tail is where parallel lanes and resume show up.

**`schema_violations_during_run`** and **Week 3** kill/resume are **trace / pilot** evidence—not a third or fourth Braintrust scorer.

**`research-pipeline-eval`** — tag **`arm`**, **`model`**, **`research_task_id`**, **`week`** for slices and root cause.

---

## Slide 21 — Part 2 Step 5 · Two-week execution (~3.25 min)

**[SHOW]** Pre-work block + **Week 1** / **Week 2** italic day strips + blockers list.

**[SAY]**  
**Pre-day-1** — lock **`fixtures@v1`**, ground truth, MCP stubs, warm-up **2–3** rows, **preflight** both arms.

**Week 1** — **Sub-test A** days 1–2; **literature-only Sub-test B** days 2–4 (citation scorer only—fix citations **early**); **day 5** full baseline **both** scorers—if numbers diverge from known Braintrust baselines, **stop**.

**Week 2** — full SDK pipeline (**both** scorers); **Day 4 attribution**; **Day 5** two-metric readout prep.

**Blockers** — flaky stubs, dishonest baseline, too-easy fixtures, **<0.80** literature citation—each has explicit **stop** rule on-slide.

---

## Slide 22 — Part 2 Step 6 · Read results + decision (~3.5 min)

**[SHOW]** Validate baseline bullet + “don’t average” + **two signals** + three outcomes + “not a migration vote.”

**[SAY]**  
Validate **GPT‑5.1** frozen-row scores vs existing Braintrust **before** deltas.

**Two signals** — citation ≥**0.95** + beat baseline on known-failures; **p95** time-to-valid ≤ baseline on **high-complexity**. **Do not average** the scorers.

**Outcomes A/B/C** — both signals green; **harness + per-lane `AgentDefinition.model`**; surgical extension **only** weak dimension.

Readout **informs** migration timeline—it **is not** the migration vote.

---

## —— Part 3 transition (~20 sec) ——

**[SAY]**  
Part 3 is the **parallel typed-handoff build** beside prod—**eleven slides**: **why this project first**, then **three structural problems** (sequential wall clock, context bloat, no durability), **pipeline in three beats** (graph + boundaries; subagents + trajectory schema; sessions + hooks), **schema contracts**, **four-week cadence in two beats**, **Week 4 outcomes A/B/C**. Engineers use **Appendix · Part 3 schema reference** for full Pydantic.

---

## Slide 23 — Part 3 · Recommended first project (~2 min)

**[SHOW]** Opening framing — **12 customers**, **three structural problems**, **frozen rows**, **not a POC**.

**[SAY]**  
Today = **one loop**, one transcript, sequential work. First project = **parallel specialist pipeline** on **Part 2** frozen **`ResearchTask`** rows—prod **GPT‑5.1** **unchanged**; evidence is **apples-to-apples** in Braintrust.

Close: **four weeks** → validated **Q2 template**, not a throwaway spike.

---

## Slide 24 — Part 3 · Problem 1 · Sequential execution (~1.75 min)

**[SHOW]** **sum vs max** intuition + coordinator **delegation not deep science**.

**[SAY]**  
Lit and data are **independent** but today run **in order** → wall ~ **`sum`** (**45+ min** class). **Not a smarter-model fix**—it's **shape**.

**Parallel subagents** → wall ~ **`max`**. Coordinator **starts both**, waits for **typed handoffs**, merges—**does not** ingest every raw PubMed turn.

---

## Slide 25 — Part 3 · Problem 2 · Context accumulation (~1.75 min)

**[SHOW]** **Mono transcript** vs **isolated lanes** + **typed JSON** only crosses boundaries.

**[SAY]**  
**30–40** tool returns in one parent → drift, empty **`passage`** strings, brittle merge—**Sub-test A ≠ Sub-test B**.

**Fix:** child contexts hold noise; **`LiteratureHandoff` / `DataHandoff`** are **schema objects**; hypothesis sees **contracts**, not forty abstracts.

---

## Slide 26 — Part 3 · Problem 3 · No durability (~1.75 min)

**[SHOW]** **Checkpoint / resume** + **audit spine** under **`session_id`**.

**[SAY]**  
Interrupt at minute **25** → today **replay ~40 PubMed** pulls. At multi-tenant scale, that's **not tail risk**—it's **planning**.

**Sessions:** **`resume(session_id)`** without redoing finished steps. **OTLP + `research_task_id`** answers compliance “what did the model **see**?” with **logs**, not vibes.

---

## Slide 27 — Part 3 · Pipeline design · Graph and boundaries (~1.5 min)

**[SHOW]** Pipeline **Mermaid** (ingest → coordinator → **parallel band** → merge → hypothesis → deliverable) + “each arrow = schema boundary.”

**[SAY]**  
Four agents, one graph—**diagnosable** failures because you know **which handoff** broke.

Bridge: next two slides map **four primitives** to **Part 2** scorers on the **same frozen rows**.

---

## Slide 28 — Part 3 · Pipeline design · Subagents and structured outputs (~1.75 min)

**[SHOW]** **Subagents** + **trajectory schema** bullets as printed.

**[SAY]**  
**Isolation + allowlists** → **citation grounding** scorer answers “does bounded context fix blur?”

**Every handoff validated** → **`schema_violations_during_run`** in the deliverable tells **trajectory** truth vs lucky final JSON (inspect in traces—not a Braintrust scorer).

---

## Slide 29 — Part 3 · Pipeline design · Sessions and hooks (~1.75 min)

**[SHOW]** **Checkpoints / resume** + **`citation_allowlist`** / **`audit_logger`** lines on-slide.

**[SAY]**  
**Week 3** kill/resume at **four** checkpoints proves durability; **Part 2** scores **time-to-valid** on uninterrupted runs.

**Allowlist before context** vs post-hoc QA; **OTLP** = compliance-grade “what the model saw.”

---

## Slide 30 — Part 3 · The schema architecture (~2.5 min)

**[SHOW]** **`EvidenceRow.passage`** + **`schema_violations_during_run`** snippets + appendix pointer.

**[SAY]**  
**Contracts before agent code** → merge is **mechanical**.

**Empty passage** = JSON-valid **lie**; **`schema_violations_during_run`** separates **lucky final JSON** from **clean trajectory**.

---

## Slide 31 — Part 3 · Four weeks · Weeks 1–2 (~2 min)

**[SHOW]** **Week 1** — short **bullets** (wire, 3–5 rows, exit, why one lane, MCP risk). **Week 2** — bullets (stack, exit, hard triad, timestamp risk).

**[SAY]**  
**Week 1** — prove **`LiteratureHandoff`** + MCP on **3–5** rows before stacking layers—**MCP flake vs model** instrumentation matters for attribution.

**Week 2** — **hardest**: both agents **start together**, wait for **both**, **`merge_confidence` defined**, partial-fail path doesn't throw away lit work—timestamp traces to catch “merge after first return” bug.

---

## Slide 32 — Part 3 · Four weeks · Weeks 3–4 (~2 min)

**[SHOW]** **Week 3** — checkpoint + hook **bullets** + exit + coverage risk. **Week 4** — dual-compare **bullets** + stop-ship line + honest baseline + risk.

**[SAY]**  
**Week 3** — **`resume`** at four kills; **`citation_allowlist`** + **`audit_logger`** to OTLP; enumerate **all** state transitions for checkpoint coverage.

**Week 4** — **analysis**: both pipelines on **`fixtures@v1`**, **two** Braintrust scorers + **four-configuration** attribution; **dishonest baseline** voids the readout.

---

## Slide 33 — Part 3 · Week 4 decision (~2.35 min)

**[SHOW]** Outcomes **A/B/C** prose (no funnel diagram on-slide).

**[SAY]**  
**A** — green signals → **Q2 template**, **literature-first** lane story. **B** — harness wins everywhere → **`AgentDefinition.model` per lane** = board **SKU agnosticism** now. **C** — one weak pillar → **add 5–10 targeted rows**, rerun **that scorer only**—**not a program reset**.

**Shared:** schemas/MCP/hooks/sessions **stay**—no throwaway four weeks.

---

## Slide 34 — Closing (~2 min)

**[SAY]**  
**Part 3 anchor:** **eleven-slide** parallel **typed-handoff** narrative + **Week 4** compares **GPT‑5.1 Messages** vs **Agent SDK** on frozen Braintrust rows—not a migration story by itself.

**OpenAI-only or Gemini-only** is coherent if **your** harness already delivers multi-agent isolation, citation-grade governance, and eval coverage at acceptable cost.

The strategic question: is it cheaper to **keep patching** custom orchestration, or adopt **Agent SDK primitives** Anthropic evolves as a product surface?

**Custom orchestration** means you own tool loops, audit hooks, session persistence, per-lane routing—that’s engineering, SRE, and compliance on top of token cost.

**Public benchmarks** are directional. **Your frozen eval rows and board rubric** should anchor go/no-go.

**Workflow + MCP + hooks** stay stable; GPT‑5, GPT‑5‑mini, Gemini 3, Claude are **engines per lane**—three-way frozen eval before any bet-the-company cutover.

**Claude Code** teams reuse hook/permission/tool-loop mental model—lift is MCP, ACLs, Hypothesis schema. **`pubmed@life-sciences`** demos are NLM-shaped; **your regulated corpus stays custom MCP.**

**[SAY]**  
Thank you. Happy to go deeper on any pillar, or schedule a working session on frozen task selection.

---

## Slides 35–37 — Appendices (backup only)

**→ Skip** in main meeting unless asked.

### Slide 35 — Appendix · Part 3 schema reference (full)

**[SAY]**  
Engineering appendix — full **Pydantic** shapes for the four handoff contracts; use when implementing, not in the exec read.

### Slide 36 — Built-in tools

**[SAY]**  
Quick reference: Read/Write/Edit/Glob/Grep for workspace; Bash for compute; WebSearch/WebFetch for open web. **PubMed production = your MCP**, not this table.

### Slide 37 — AgentDefinition reference

**[SAY]**  
`description`, `prompt`, tools allow/deny, `model`, `skills`—how you configure each lane. Engineering deep-dive material.

---

## Suggested paths

### ~15-minute exec read (~30 slides)

1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34
Skim or skip: 5, 11–12, 16, **35–37** (appendices — backup only)

### ~20-minute balanced read (≈30 slides)

Add: **11**, **12** after slide **16** if time allows.

### Full walkthrough (~35–45 min + Q&A)

All **37** slides at ~1–2 min each; spend extra on **6, 7, 8, 20, 21, 22, 24, 25, 26, 27, 28, 29, 33, 34**.

---

## Likely CEO/CTO questions (short answers)

| Question | Where to point |
| --- | --- |
| “Are you asking us to leave OpenAI?” | Slides **23**, **33**, **34** — **not a migration**; parallel pilot on frozen rows; Week 4 evidence |
| “What if GPT‑5 wins Sub-test A?” | Slide **21** — record honestly; decision is Sub-test B + **two** scorers (deck Part 2) |
| “How long to migrate production?” | Slides **31–33** + **34** — **four-week pilot** then **inventory-scale** cutover only with evidence |
| “What’s the minimum viable pilot?” | Slides **23–33** — parallel pipeline + four schemas + Week 4 Braintrust duel vs GPT‑5.1 |
| “What could go wrong?” | Slides **24–32** — wall-clock/context/durability risks; hooks/sessions in Weeks **3–4** |
| “What do you need from us?” | Slides **18–22** — frozen **`fixtures@v1`**, MCP owners, scorer sign-off; **33** decision forum |

---

## Rehearsal tip

Read this script **once aloud** with a timer on slides **1–37**. Cut any section where you hear yourself repeating **Slide 8** (structured-output enforcement) or **Slide 20** (Part 2 Step 4 scorers)—the deck already states Sub-test A/B and the go/no-go signals in **Step 5**.
