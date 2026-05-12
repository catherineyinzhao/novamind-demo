/**
 * Scripted pipeline replay — semi-autonomous research agent (orchestrator) with parallel
 * Sonnet workers (literature review, data analysis, citation governance), merge + compaction,
 * hypothesis generation (structured JSON), citation pass, Braintrust eval on exported traces → prompt patch.
 * Observability (LangSmith / Braintrust) is modeled as export hooks after the scientific DAG completes.
 */

export type TreeNode = {
  id: string
  label: string
  type: 'lead' | 'mem' | 'orch' | 'lit' | 'exp' | 'gov' | 'merge' | 'hyp' | 'cite' | 'eval'
  status: 'idle' | 'run' | 'ok' | 'rej'
}

export type FeedEntry = {
  id: string
  variant: 'orch' | 'think' | 'tool' | 'text' | 'hyp' | 'compact' | 'eval'
  title: string
  body?: string
}

export type LaneKey =
  | 'lead'
  | 'orch'
  | 'lit'
  | 'exp'
  | 'gov'
  | 'merge'
  | 'hyp'
  | 'cite'
  | 'evalLoop'

export type LaneVisual = 'idle' | 'active' | 'done'

export type ArchState = Record<LaneKey, LaneVisual>

export type PipelineState = {
  tree: TreeNode[]
  feed: FeedEntry[]
  arch: ArchState
  scenarioHook: string
  parallelPhase:
    | 'idle'
    | 'lead'
    | 'fanout'
    | 'parallel'
    | 'merge'
    | 'hypothesis'
    | 'citation'
    | 'eval_feedback'
    | 'obs_export'
    | 'done'
  paLead: string
  paLit: string
  paExp: string
  paGov: string
  paMerge: string
  paHyp: string
  paCite: string
  paEval: string
  pfLead: number
  pfLit: number
  pfExp: number
  pfGov: number
  pfMerge: number
  pfHyp: number
  pfCite: number
  pfEval: number
  ctxPct: number
  ctxNote: string
  verified: string
  rejected: string
  pubmedCorpusQueries: string
  toolCalls: string
  compact: string
  summaryRounds: string
  /** Eval harness — Braintrust scorer runs on replayed trajectories (counter keys kept for minimal churn) */
  llmJudgeRuns: string
  rubricFailures: string
  promptRegistryVersion: string
  langsmithExportRows: string
  braintrustScoredSpans: string
}

export function initialPipelineState(): PipelineState {
  const idleArch: ArchState = {
    lead: 'idle',
    orch: 'idle',
    lit: 'idle',
    exp: 'idle',
    gov: 'idle',
    merge: 'idle',
    hyp: 'idle',
    cite: 'idle',
    evalLoop: 'idle',
  }
  return {
    tree: [],
    feed: [],
    arch: idleArch,
    scenarioHook:
      'Semi-autonomous **research agent**: an Opus-class **orchestrator** delegates specialist workers; **MCP** exposes corpus and experiment planes; **LangSmith** / **Braintrust** trace the DAG.\n\n- **Orchestrator** — plan, delegate boundaries, memory / checkpoint hooks\n- **Literature** — ingested PubMed (~3y), semantic retrieval + agentic search; PMID-grounded synthesis\n- **Data analysis** — client cohort / PDX summaries; maps claims to **supported** / **tension** / **gap**\n- **Citation governance** — PMID-only claims in parallel with lit + data\n- **Merge + compaction** — join transcripts; keep long trajectories coherent\n- **Hypothesis** — consumes handoffs as **schema-locked JSON** for downstream evals\n- **Eval loop** — exported rows + Braintrust scorers gate the next iteration',
    parallelPhase: 'idle',
    paLead: '—',
    paLit: '—',
    paExp: '—',
    paGov: '—',
    paMerge: '—',
    paHyp: '—',
    paCite: '—',
    paEval: '—',
    pfLead: 0,
    pfLit: 0,
    pfExp: 0,
    pfGov: 0,
    pfMerge: 0,
    pfHyp: 0,
    pfCite: 0,
    pfEval: 0,
    ctxPct: 0,
    ctxNote: '—',
    verified: '—',
    rejected: '—',
    pubmedCorpusQueries: '0',
    toolCalls: '0',
    compact: '0',
    summaryRounds: '0',
    llmJudgeRuns: '0',
    rubricFailures: '0',
    promptRegistryVersion: 'v0',
    langsmithExportRows: '0',
    braintrustScoredSpans: '0',
  }
}

export type ReplayTick = { ms: number; patch: (s: PipelineState) => void }

export const PIPELINE_REPLAY: ReplayTick[] = [
  {
    ms: 100,
    patch: (s) => {
      s.parallelPhase = 'lead'
      s.arch.lead = 'active'
      s.arch.orch = 'idle'
      s.tree = [{ id: 'lr1', label: 'research_orchestrator.policy_plan', type: 'lead', status: 'run' }]
      s.paLead = 'Planning'
      s.pfLead = 12
      s.ctxPct = 3
      s.ctxNote = 'Extended thinking · effort scaling heuristics'
    },
  },
  {
    ms: 260,
    patch: (s) => {
      s.feed.push({
        id: 'f00',
        variant: 'think',
        title: 'Thinking · Orchestrator (Opus-class)',
        body:
          'Token budget for planning pass: reason about **delegate boundaries** — **literature review** only touches PubMed via `query_pubmed_corpus`; **data analysis** only `fetch_experiment_summary`; **hypothesis generation** must emit **schema-locked JSON**. Eval dimensions: **citation_alignment** (PMIDs trace to tool returns), **structured_output_valid**, **tool_efficiency**. Target **100K+** live window: keep synthesis + last tool packs hot; push raw retrieval blobs to LangSmith / Braintrust for Braintrust scorers.',
      })
      s.pfLead = 48
    },
  },
  {
    ms: 280,
    patch: (s) => {
      s.tree.push({ id: 'mem1', label: 'memory.persist_plan', type: 'mem', status: 'run' })
      s.feed.push({
        id: 'f01',
        variant: 'tool',
        title: 'tool_use · memory · write_research_checkpoint',
        body: JSON.stringify(
          {
            path: 'artifacts/research_plan.json',
            summary_tokens: 420,
            orchestrator_model: 'claude-opus-4-7',
            worker_models: {
              literature_review: 'claude-sonnet-4-5',
              data_analysis: 'claude-sonnet-4-5',
              citation_governance: 'claude-sonnet-4-5',
            },
            subagent_briefs: [
              'literature review: PubMed RAG + agentic search',
              'data analysis: client cohort validation',
              'citation governance: PMID-only citations',
            ],
            langsmith: 'child_runs_per_phase: true',
            braintrust: 'nested_spans + scorer_ids',
            note: 'Claude Messages API: tools + JSON surfaces map cleanly to Braintrust experiments and LangSmith dataset rows',
          },
          null,
          2,
        ),
      })
      s.toolCalls = '1'
      s.pfLead = 88
    },
  },
  {
    ms: 240,
    patch: (s) => {
      const lr = s.tree.find((x) => x.id === 'lr1')
      const mem = s.tree.find((x) => x.id === 'mem1')
      if (lr) lr.status = 'ok'
      if (mem) mem.status = 'ok'
      s.arch.lead = 'done'
      s.paLead = 'Done'
      s.pfLead = 100
      s.parallelPhase = 'fanout'
      s.arch.lead = 'done'
      s.arch.orch = 'active'
      s.tree.push({ id: 'o1', label: 'orchestrator.delegate_subagents', type: 'orch', status: 'run' })
      s.paLit = 'Queued'
      s.paExp = 'Queued'
      s.paGov = 'Queued'
      s.pfLit = 5
      s.pfExp = 5
      s.pfGov = 5
      s.ctxPct = 8
      s.ctxNote = 'Parallel subagent contexts · token budget fan-out'
    },
  },
  {
    ms: 220,
    patch: (s) => {
      s.feed.push({
        id: 'f0',
        variant: 'orch',
        title: 'Pattern · Opus orchestrator → Sonnet workers',
        body:
          'Why Claude SDK fits: **reliable tool_use + streaming** for long multi-turn workers, **structured outputs** for hypothesis JSON, and **extended contexts** so orchestrator rationale can ride alongside handoff digests. The research agent spends tokens on policy; **literature review** and **data analysis** stay parallelizable. LangSmith tree mirrors this split (parent plan + child LLM spans).',
      })
    },
  },
  {
    ms: 300,
    patch: (s) => {
      s.feed.push({
        id: 'f0b',
        variant: 'orch',
        title: 'Orchestrator · parallel batch tool dispatch',
        body:
          'Issue three tool bundles in one wall-clock wave: **literature review**, **data analysis**, and **citation governance** each get bounded `tool_use` budgets. Mirrors parallel subagents cutting latency while the orchestrator keeps **context management** rules explicit.',
      })
    },
  },
  {
    ms: 320,
    patch: (s) => {
      s.parallelPhase = 'parallel'
      s.arch.orch = 'done'
      s.arch.lit = 'active'
      s.arch.exp = 'active'
      s.arch.gov = 'active'
      s.tree.push(
        { id: 'l1', label: 'literature_review.pubmed_rag', type: 'lit', status: 'run' },
        { id: 'e1', label: 'data_analysis.client_cohort', type: 'exp', status: 'run' },
        { id: 'g1', label: 'citation_governance.verify_pmids', type: 'gov', status: 'run' },
      )
      const o = s.tree.find((x) => x.id === 'o1')
      if (o) o.status = 'ok'
      s.paLit = 'Running'
      s.paExp = 'Running'
      s.paGov = 'Running'
      s.pfLit = 28
      s.pfExp = 22
      s.pfGov = 18
      s.ctxPct = 24
      s.ctxNote = 'Isolated scratch contexts · interleaved thinking after tools'
    },
  },
  {
    ms: 280,
    patch: (s) => {
      s.feed.push({
        id: 'f2',
        variant: 'tool',
        title: 'tool_use · literature · query_pubmed_corpus',
        body: JSON.stringify(
          {
            agent: 'literature_review',
            store: 'ingested_pubmed_external',
            query: 'sotorasib acquired resistance STK11 LKB1 NSCLC',
            max_results: 12,
            strategy: 'start wide → narrow (agent queries corpus outside context window)',
          },
          null,
          2,
        ),
      })
      s.pubmedCorpusQueries = '3'
      s.toolCalls = '4'
      s.pfLit = 62
    },
  },
  {
    ms: 240,
    patch: (s) => {
      s.feed.push({
        id: 'f3',
        variant: 'tool',
        title: 'tool_use · experimental · cohort_ic50_slice',
        body: JSON.stringify(
          {
            agent: 'data_analysis',
            cohort: 'novamind-kras-g12c-pdx',
            arms: ['sotorasib', 'sotorasib+MEKi'],
            metric: 'best_response_weeks',
          },
          null,
          2,
        ),
      })
      s.toolCalls = '7'
      s.pfExp = 58
    },
  },
  {
    ms: 260,
    patch: (s) => {
      s.feed.push({
        id: 'f4',
        variant: 'tool',
        title: 'tool_use · citation_governance · verify_citations_batch',
        body: JSON.stringify(
          {
            agent: 'citation_governance',
            pmids: ['demo-903214', 'demo-771902'],
            policy: 'humana_biotech_internal_v3',
          },
          null,
          2,
        ),
      })
      s.toolCalls = '11'
      s.verified = '8'
      s.pfGov = 55
    },
  },
  {
    ms: 280,
    patch: (s) => {
      s.feed.push({
        id: 'f5',
        variant: 'think',
        title: 'Thinking · data_analysis',
        body:
          'Interleaved thinking after tool results: cross-check IC50 deltas vs MET mentions · flag STK11 IHC gaps before returning pack to merge.',
      })
      s.pfExp = 82
    },
  },
  {
    ms: 260,
    patch: (s) => {
      const lit = s.tree.find((x) => x.id === 'l1')
      const exp = s.tree.find((x) => x.id === 'e1')
      const gov = s.tree.find((x) => x.id === 'g1')
      if (lit) lit.status = 'ok'
      if (exp) exp.status = 'ok'
      if (gov) gov.status = 'ok'
      s.arch.lit = 'done'
      s.arch.exp = 'done'
      s.arch.gov = 'done'
      s.paLit = 'Done'
      s.paExp = 'Done'
      s.paGov = 'Done'
      s.pfLit = 100
      s.pfExp = 100
      s.pfGov = 100
      s.ctxPct = 72
      s.ctxNote = 'Hot contexts · merge + compaction next'
    },
  },
  {
    ms: 320,
    patch: (s) => {
      s.parallelPhase = 'merge'
      s.arch.merge = 'active'
      s.tree.push({ id: 'm1', label: 'merge.join_and_compact', type: 'merge', status: 'run' })
      s.paMerge = 'Reducing'
      s.pfMerge = 30
      s.feed.push({
        id: 'f6',
        variant: 'orch',
        title: 'Merge · join + dedupe tool transcripts',
        body:
          'Join on trace ids; carry forward verbatim citation spans; collapse redundant retrieval blobs. **Context engineering**: smallest token set that preserves auditability for **hypothesis generation** and downstream Braintrust rows.',
      })
    },
  },
  {
    ms: 380,
    patch: (s) => {
      s.feed.push({
        id: 'f7',
        variant: 'compact',
        title: 'Context engineering · compaction pass',
        body:
          'Analogous to Agent SDK compaction + external session logs: summaries rotate into durable artifacts; raw tool payloads referenced by id unless needed for **Braintrust scorers**. Prevents context rot while keeping eval-relevant evidence for **long trajectories**.',
      })
      s.compact = '2'
      s.summaryRounds = '4'
      s.ctxPct = 34
      s.ctxNote = 'Post-compaction · retained: plan + citations + cohort deltas'
      s.pfMerge = 100
      s.paMerge = 'Done'
      const m = s.tree.find((x) => x.id === 'm1')
      if (m) m.status = 'ok'
      s.arch.merge = 'done'
    },
  },
  {
    ms: 360,
    patch: (s) => {
      s.parallelPhase = 'hypothesis'
      s.arch.hyp = 'active'
      s.tree.push({ id: 'h1', label: 'hypothesis_generation.structured_json', type: 'hyp', status: 'run' })
      s.paHyp = 'Running'
      s.pfHyp = 22
      s.feed.push({
        id: 'f8',
        variant: 'think',
        title: 'Thinking · hypothesis_generation',
        body:
          'Ground ranked hypotheses only on merged **literature review** + **data analysis** packs · attach suggested validation experiments per row for **Braintrust** regression cases.',
      })
    },
  },
  {
    ms: 400,
    patch: (s) => {
      s.feed.push({
        id: 'f9',
        variant: 'hyp',
        title: 'Structured output · hypothesis_generation.json',
        body: JSON.stringify(
          {
            hypotheses: [
              {
                rank: 1,
                mechanism: 'MAPK feedback rebound',
                evidence: ['lit:MET amp', 'cohort: combo SD'],
                braintrust_task: 'task-bio-042',
              },
              {
                rank: 2,
                mechanism: 'Secondary KRAS allele',
                evidence: ['lit:WGS', 'cite:verified PMID'],
                braintrust_task: 'task-bio-043',
              },
              {
                rank: 3,
                mechanism: 'Lineage plasticity / STK11 loss',
                evidence: ['lit:immune', 'cohort:IHC gap'],
                braintrust_task: 'task-bio-044',
              },
            ],
            audit: { compaction_passes: 2, parallel_subagents: 3 },
          },
          null,
          2,
        ),
      })
      s.pfHyp = 90
      s.ctxPct = 41
    },
  },
  {
    ms: 320,
    patch: (s) => {
      const h = s.tree.find((x) => x.id === 'h1')
      if (h) h.status = 'ok'
      s.arch.hyp = 'done'
      s.paHyp = 'Done'
      s.pfHyp = 100
      s.parallelPhase = 'citation'
      s.arch.cite = 'active'
      s.tree.push({ id: 'c1', label: 'citation_agent.resolve_spans', type: 'cite', status: 'run' })
      s.paCite = 'Running'
      s.pfCite = 25
      s.feed.push({
        id: 'f9b',
        variant: 'orch',
        title: 'CitationAgent · post-synthesis pass',
        body:
          'Post-**hypothesis generation** pass: map each claim to PubMed spans and cohort table rows before traces export. Keeps **citation_alignment** scorers honest in Braintrust.',
      })
    },
  },
  {
    ms: 380,
    patch: (s) => {
      s.feed.push({
        id: 'f9c',
        variant: 'tool',
        title: 'tool_use · citation · attach_evidence_spans',
        body: JSON.stringify(
          { claims: 14, resolved: 14, unresolved: 0, export: 'citation_manifest.jsonl' },
          null,
          2,
        ),
      })
      s.toolCalls = '14'
      s.pfCite = 100
      s.paCite = 'Done'
      const c = s.tree.find((x) => x.id === 'c1')
      if (c) c.status = 'ok'
      s.arch.cite = 'done'
    },
  },
  {
    ms: 340,
    patch: (s) => {
      s.parallelPhase = 'eval_feedback'
      s.arch.evalLoop = 'active'
      s.tree.push({ id: 'ev1', label: 'braintrust_eval.langsmith_trajectory', type: 'eval', status: 'run' })
      s.paEval = 'Scoring'
      s.pfEval = 30
      s.feed.push({
        id: 'f9d',
        variant: 'eval',
        title: 'Braintrust eval · scorers on LangSmith-exported transcript',
        body:
          'Replay the full **trajectory** (messages + tool I/O) as dataset rows. **Braintrust** runs scorers for **structured JSON schema**, **PMID / citation alignment**, and **tool_efficiency**. A scorer failure blocks promote until the **prompt / tool registry** or ingestion heuristic is patched — not by changing model weights mid-session.',
      })
      s.llmJudgeRuns = '1'
      s.rubricFailures = '1'
    },
  },
  {
    ms: 360,
    patch: (s) => {
      s.feed.push({
        id: 'f9e',
        variant: 'eval',
        title: 'Prompt / tool registry · patch proposal',
        body: JSON.stringify(
          {
            change_id: 'PR-nova-rag-12',
            diff:
              'Tie-break PubMed hits toward primary literature when semantic scores tie; normalize PDX arm labels before cohort join so data_analysis and literature_review handoffs stay aligned',
            source: 'braintrust_experiment + LangSmith trace replay',
            prompt_registry: 'v0 → v1',
          },
          null,
          2,
        ),
      })
      s.promptRegistryVersion = 'v1'
      s.pfEval = 85
    },
  },
  {
    ms: 300,
    patch: (s) => {
      const ev = s.tree.find((x) => x.id === 'ev1')
      if (ev) ev.status = 'ok'
      s.arch.evalLoop = 'done'
      s.paEval = 'Done'
      s.pfEval = 100
      s.parallelPhase = 'obs_export'
      s.feed.push({
        id: 'f9f',
        variant: 'orch',
        title: 'Observability · how traces inform the **next** run',
        body:
          '**LangSmith**: compare runs and child LLM spans for the same scientific wave. **Braintrust**: experiments + span scores + promotion gates keyed off those exports. Neither replaces evals — they make failures legible so prompt, **agentic search**, and ingestion tweaks compound across **long trajectories**.',
      })
      s.langsmithExportRows = '3'
      s.braintrustScoredSpans = '6'
    },
  },
  {
    ms: 320,
    patch: (s) => {
      s.parallelPhase = 'done'
      s.rejected = '0'
      s.ctxNote =
        'Checkpoint carries corpus slice id + cohort version for next wave · agentic search budget unchanged'
      s.feed.push({
        id: 'f10',
        variant: 'text',
        title: 'Long trajectories · research checkpoints',
        body:
          'NovaMind chains many **scientific waves** across days: each session starts from **write_research_checkpoint** artifacts (plan hash, last PubMed ingestion slice, cohort version id) so the orchestrator **does not re-hydrate** the full ~3y corpus into context. Delta prompts + **compaction** keep the live window for **hypothesis generation** while traces hold recoverable detail.',
      })
    },
  },
  {
    ms: 280,
    patch: (s) => {
      s.feed.push({
        id: 'f11',
        variant: 'text',
        title: 'Domain packs · progressive disclosure',
        body:
          'Internal **oncology + resistance** SOPs and **citation policy** ship as lean manifests first; full playbooks load only after modality classification hits. That pattern cuts wrong-tool calls in **literature review** and preserves window for **structured hypothesis JSON** — the same progressive disclosure idea as Agent Skills, tuned for NovaMind’s regulated narratives.',
      })
    },
  },
]
