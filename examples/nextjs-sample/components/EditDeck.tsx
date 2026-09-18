'use client'

import { useEffect, useRef, useState } from 'react'
import React from 'react'
import type { DeckSpec, TldrawApp, CompileFinding, DecompileFinding, DeckFinding } from '@tlslides/tldraw'
import {
  Tldraw,
  deckSpecToDocument,
  documentToDeckSpec,
  BlockRegistry,
  registerBuiltInBlocks,
  validateDeckSpec,
} from '@tlslides/tldraw'
import Link from 'next/link'

interface EditDeckProps {
  deckId: string
}

interface SpecSummary {
  slides: Array<{
    id: string
    layout: string
    regions: Record<string, number>
    free: number
  }>
}

function summarizeSpec(spec: DeckSpec): SpecSummary {
  return {
    slides: spec.slides.map((slide) => {
      const regionSummary: Record<string, number> = {}
      Object.entries(slide.regions || {}).forEach(([name, blocks]) => {
        regionSummary[name] = blocks ? blocks.length : 0
      })
      const freeBlocks = (slide as any).free?.length || 0
      return {
        id: slide.id,
        layout: slide.layout,
        regions: regionSummary,
        free: freeBlocks,
      }
    }),
  }
}

function SpecComparison({ before, after }: { before: SpecSummary; after: SpecSummary }) {
  return (
    <div
      style={{
        display: 'grid',
        // Two equal columns that actually fit the panel: `flex: 1` + `minWidth: 200px` on each
        // child overflowed a narrow sidebar and clipped the Output column off the right edge.
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        overflowY: 'auto',
        overflowX: 'hidden',
        maxHeight: '300px',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0066cc' }}>Input Spec</div>
        {before.slides.map((slide) => (
          <div key={slide.id} style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
            <div style={{ fontWeight: 'bold' }}>{slide.id}</div>
            <div>layout: {slide.layout}</div>
            {Object.entries(slide.regions).map(([name, count]) => (
              <div key={name} style={{ color: count === 0 ? '#999' : '#000' }}>
                {name}: {count}
              </div>
            ))}
            {slide.free > 0 && <div style={{ color: '#ff6b6b' }}>free[]: {slide.free}</div>}
          </div>
        ))}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0066cc' }}>Output Spec</div>
        {after.slides.map((slide) => {
          const beforeIdx = before.slides.findIndex((s) => s.id === slide.id)
          const beforeSlide = beforeIdx >= 0 ? before.slides[beforeIdx] : undefined
          const changed =
            beforeSlide &&
            (JSON.stringify(beforeSlide.regions) !== JSON.stringify(slide.regions) ||
              beforeSlide.free !== slide.free)
          return (
            <div
              key={slide.id}
              style={{
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: changed ? '1px solid #ff6b6b' : '1px solid #eee',
                backgroundColor: changed ? 'rgba(255, 107, 107, 0.05)' : 'transparent',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{slide.id}</div>
              <div>layout: {slide.layout}</div>
              {Object.entries(slide.regions).map(([name, count]) => {
                const beforeCount = beforeSlide?.regions[name] || 0
                const regionChanged = beforeCount !== count
                return (
                  <div
                    key={name}
                    style={{
                      color: regionChanged ? '#ff6b6b' : count === 0 ? '#999' : '#000',
                      fontWeight: regionChanged ? 'bold' : 'normal',
                    }}
                  >
                    {name}: {count}
                    {beforeCount !== count && ` (was ${beforeCount})`}
                  </div>
                )
              })}
              {slide.free > 0 && (
                <div style={{ color: '#ff6b6b', fontWeight: beforeSlide?.free !== slide.free ? 'bold' : 'normal' }}>
                  free[]: {slide.free}
                  {beforeSlide && beforeSlide.free !== slide.free && ` (was ${beforeSlide.free})`}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FindingsList({
  compileFindings,
  decompileFindings,
  validationFindings,
}: {
  compileFindings: CompileFinding[]
  decompileFindings: DecompileFinding[]
  validationFindings: DeckFinding[]
}) {
  const formatLocation = (f: any) => {
    if ('path' in f && f.path) {
      return f.path
    }
    if ('slideId' in f && f.slideId) {
      const parts = [f.slideId]
      if ('region' in f && f.region) parts.push(f.region)
      if (f.blockId) parts.push(f.blockId)
      return parts.join(' / ')
    }
    return '(root)'
  }

  const allFindings: Array<{ type: string; level: string; rule: string; location: string; message: string; suggestion?: string }> = [
    ...compileFindings.map((f) => ({ type: 'compile', level: f.level, rule: f.rule, location: formatLocation(f), message: f.message, suggestion: f.suggestion })),
    ...decompileFindings.map((f) => ({ type: 'decomp', level: f.level, rule: f.rule, location: formatLocation(f), message: f.message })),
    ...validationFindings.map((f) => ({ type: 'validation', level: f.level, rule: f.rule, location: formatLocation(f), message: f.message, suggestion: f.suggestion })),
  ]

  if (allFindings.length === 0) {
    return (
      <div style={{ fontSize: '12px', color: '#27ae60' }}>
        ✓ No issues found
      </div>
    )
  }

  return (
    <div style={{ fontSize: '11px', fontFamily: 'monospace', maxHeight: '200px', overflow: 'auto' }}>
      {allFindings.map((f, idx) => (
        <div key={idx} style={{ marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #eee' }}>
          <div style={{ color: f.level === 'error' ? '#f5222d' : '#ff9800', fontWeight: 'bold' }}>
            [{f.type}] {f.level}: {f.rule}
          </div>
          <div style={{ color: '#666', fontSize: '10px' }}>{f.location}</div>
          <div style={{ color: '#000' }}>{f.message}</div>
          {f.suggestion && (
            <div style={{ color: '#0066cc', marginTop: '2px' }}>→ {f.suggestion}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function EditDeck({ deckId }: EditDeckProps) {
  const [spec, setSpec] = useState<DeckSpec | null>(null)
  const [inputSummary, setInputSummary] = useState<SpecSummary | null>(null)
  const [outputSummary, setOutputSummary] = useState<SpecSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [compileFindings, setCompileFindings] = useState<CompileFinding[]>([])
  const [decompileFindings, setDecompileFindings] = useState<DecompileFinding[]>([])
  const [validationFindings, setValidationFindings] = useState<DeckFinding[]>([])
  const appRef = useRef<TldrawApp | null>(null)

  const registry = React.useMemo(() => {
    const r = new BlockRegistry()
    registerBuiltInBlocks(r)
    return r
  }, [])

  // Fetch deck on mount
  // Compile once per spec, not once per render. Two things went wrong here before:
  // `deckSpecToDocument(spec)` ran in the render body, handing `<Tldraw>` a brand-new
  // `TDDocument` identity on every pass, and `setCompileFindings(...)` was called *during*
  // render, which is a setState-in-render loop — React bailed out with "Too many re-renders".
  const compiled = React.useMemo(
    () => (spec ? deckSpecToDocument(spec) : null),
    [spec]
  )

  React.useEffect(() => {
    setCompileFindings(compiled ? compiled.findings : [])
  }, [compiled])

  /**
   * Frame the slide once the deck is actually on screen.
   *
   * Two earlier attempts did nothing, both for timing reasons worth writing down. `zoomToFit()`
   * in `onMount` is a no-op: `TldrawApp` ignores it until the renderer has reported real bounds
   * at least once (`hasKnownViewport`), and `onMount` fires before that. Deferring it by one
   * `requestAnimationFrame` still lost, because `<Tldraw document>` applies the document *after*
   * mount and `deckSpecToDocument` writes `camera: { point: [0,0], zoom: 1 }` into every
   * pageState — so the load resets whatever the fit had just done, and the deck opens on the
   * top-left corner of a 1920x1080 page at 100%.
   *
   * A short timeout after the document lands is the honest fix at this layer. The tidier one is
   * for `deckSpecToDocument` to leave the camera alone, which is a package change.
   */
  React.useEffect(() => {
    if (!compiled) return
    const id = window.setTimeout(() => appRef.current?.zoomToFit(), 120)
    return () => window.clearTimeout(id)
  }, [compiled])

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/decks/${deckId}`)
        if (!response.ok) {
          throw new Error('Failed to load deck')
        }
        const data = (await response.json()) as DeckSpec
        setSpec(data)
        setInputSummary(summarizeSpec(data))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setSpec(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDeck()
  }, [deckId])

  const handleSave = async () => {
    if (!appRef.current) {
      setSaveError('Editor not ready')
      return
    }

    try {
      setSaving(true)
      setSaveError(null)

      const { spec: outSpec, findings: decompileFnds } = documentToDeckSpec(appRef.current.document)
      const validationFnds = validateDeckSpec(outSpec)

      setDecompileFindings(decompileFnds)
      setValidationFindings(validationFnds)
      setOutputSummary(summarizeSpec(outSpec))

      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outSpec),
      })

      if (!response.ok) {
        throw new Error('Failed to save deck')
      }

      setSpec(outSpec)
      setInputSummary(summarizeSpec(outSpec))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const handleReload = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/decks/${deckId}`)
      if (!response.ok) {
        throw new Error('Failed to reload deck')
      }
      const data = (await response.json()) as DeckSpec
      setSpec(data)
      setInputSummary(summarizeSpec(data))
      setOutputSummary(null)
      setDecompileFindings([])
      setValidationFindings([])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Loading…
      </div>
    )
  }

  if (error || !spec) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div>Error: {error || 'Failed to load deck'}</div>
        <Link href="/" style={{ color: '#0066cc', textDecoration: 'underline' }}>
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#fff' }}>
      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Tldraw
            document={compiled!.document}
            blockRegistry={registry}
            onMount={(app) => {
              appRef.current = app
              // Hide the thumbnail strip (F5 chrome finding) so it doesn't cover the slide.
              app.setSetting('showDeck', () => false)
            }}
          />
        </div>
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f5f5f5',
            borderTop: '1px solid #ddd',
            fontSize: '11px',
            color: '#666',
          }}
        >
          {spec.title} ({spec.slides.length} slides)
        </div>
      </div>

      {/* Save Panel */}
      <div
        style={{
          width: '350px',
          backgroundColor: '#fff',
          borderLeft: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleReload}
            disabled={saving}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Reload
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px', backgroundColor: '#fafafa' }}>
          {saveError && (
            <div style={{ color: '#f5222d', marginBottom: '16px', fontSize: '12px' }}>
              Error: {saveError}
            </div>
          )}

          {inputSummary && outputSummary && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>
                Round-trip Comparison
              </div>
              <SpecComparison before={inputSummary} after={outputSummary} />
            </div>
          )}

          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>
              Findings
            </div>
            <FindingsList
              compileFindings={compileFindings}
              decompileFindings={decompileFindings}
              validationFindings={validationFindings}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
