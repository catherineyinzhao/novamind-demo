import { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'

let mermaidConfigured = false

function ensureMermaidConfig() {
  if (mermaidConfigured) return
  mermaidConfigured = true
  // Palette aligned with src/styles/tokens.css (cream / surf / ink / stone / terra) — literals because Mermaid does not resolve CSS var().
  const cream = '#f5f4ef'
  const surf = '#edebe3'
  const surf2 = '#e4e0d6'
  const sand = '#e8e5dc'
  const ink = '#1a1915'
  const stone = '#7a7870'

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    themeVariables: {
      background: cream,
      mainBkg: surf,
      secondaryColor: surf2,
      tertiaryColor: cream,
      primaryColor: surf,
      primaryTextColor: ink,
      primaryBorderColor: sand,
      secondaryBorderColor: sand,
      lineColor: stone,
      textColor: ink,
      labelTextColor: ink,
      titleColor: ink,
      nodeBorder: sand,
      clusterBkg: surf2,
      edgeLabelBackground: cream,
      actorBkg: surf,
      actorBorder: sand,
      actorTextColor: ink,
      signalColor: stone,
      sequenceNumberColor: ink,
    },
    flowchart: {
      curve: 'basis',
      padding: 14,
      useMaxWidth: true,
      htmlLabels: true,
    },
  })
}

function MermaidDiagramInner({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reactId = useId().replace(/:/g, '')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ensureMermaidConfig()
    const el = containerRef.current
    if (!el) return

    const id = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 9)}`
    let cancelled = false
    el.replaceChildren()

    void mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = svg
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : String(e)
        setErr(msg)
      })

    return () => {
      cancelled = true
    }
  }, [chart, reactId])

  if (err) {
    return (
      <div className="leadership-pres-mermaid leadership-pres-mermaid--err" role="img" aria-label="Diagram error">
        <span className="leadership-pres-mermaid-err-lbl">Could not render diagram</span>
        <pre className="leadership-pres-mermaid-err-pre">{err}</pre>
      </div>
    )
  }

  return <div ref={containerRef} className="leadership-pres-mermaid" aria-hidden={false} />
}

/**
 * Renders a Mermaid diagram from source (used inside markdown ` ```mermaid ` fences).
 */
export function MermaidDiagram({ chart }: { chart: string }) {
  const trimmed = String(chart).trim()
  if (!trimmed) {
    return (
      <div className="leadership-pres-mermaid leadership-pres-mermaid--err" role="img" aria-label="Diagram error">
        <span className="leadership-pres-mermaid-err-lbl">Empty diagram</span>
      </div>
    )
  }

  return <MermaidDiagramInner key={trimmed} chart={trimmed} />
}
