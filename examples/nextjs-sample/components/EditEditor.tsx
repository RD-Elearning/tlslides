'use client'

import * as React from 'react'
import { Tldraw, TldrawApp } from '@tlslides/tldraw'
import type { DeckSpec, TDDocument } from '@tlslides/tldraw'
import { documentToDeckSpec } from '@tlslides/tldraw'
import { deckSpecToDocument } from './deck-spec-utils'
import { blockComponents } from './blocks'
import { liveBlockRegistry } from './p18-blocks'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Sample DeckSpec — the "input" the user edits and round-trips                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

const SAMPLE_DECK_SPEC: DeckSpec = {
  version: 1,
  id: 'edit-demo',
  title: 'Edit Demo',
  theme: 'mono-grid',
  aspect: 'widescreen',
  slides: [
    {
      id: 'slide-1',
      layout: 'title-content',
      regions: {
        title: [
          {
            type: 'tls.t.title',
            id: 'block-title-1',
            props: { text: 'Hello World' },
          },
        ],
        content: [
          {
            type: 'tls.d.kpi',
            id: 'block-kpi-1',
            props: { label: 'Revenue', value: '$1.2M' },
          },
        ],
      },
    },
    {
      id: 'slide-2',
      layout: 'blank',
      regions: {},
      free: [
        {
          block: {
            type: 'tls.d.kpi',
            id: 'block-kpi-free',
            props: { label: 'Free block', value: '42' },
          },
          box: { x: 100, y: 100, width: 300, height: 200 },
        },
      ],
    },
  ],
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Diff rendering                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

interface DiffEntry {
  path: string
  type: 'added' | 'removed' | 'changed'
  before?: unknown
  after?: unknown
}

/**
 * Compute a shallow structural diff between two JSON values, limited to top-level
 * and one level deep for arrays (slides, blocks).
 */
function computeDiff(
  original: unknown,
  restored: unknown,
  path = ''
): DiffEntry[] {
  const entries: DiffEntry[] = []

  if (original === restored) return entries
  if (typeof original !== typeof restored) {
    entries.push({ path: path || '(root)', type: 'changed', before: original, after: restored })
    return entries
  }
  if (original === null || restored === null || original === undefined || restored === undefined) {
    if (original !== restored) {
      entries.push({ path: path || '(root)', type: 'changed', before: original, after: restored })
    }
    return entries
  }

  if (typeof original !== 'object' || typeof restored !== 'object') {
    if (JSON.stringify(original) !== JSON.stringify(restored)) {
      entries.push({ path: path || '(root)', type: 'changed', before: original, after: restored })
    }
    return entries
  }

  // Both are arrays
  if (Array.isArray(original) && Array.isArray(restored)) {
    const maxLen = Math.max(original.length, restored.length)
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`
      if (i >= original.length) {
        entries.push({ path: itemPath, type: 'added', after: restored[i] })
      } else if (i >= restored.length) {
        entries.push({ path: itemPath, type: 'removed', before: original[i] })
      } else {
        entries.push(...computeDiff(original[i], restored[i], itemPath))
      }
    }
    return entries
  }

  // Both are objects
  const allKeys = new Set([...Object.keys(original as Record<string, unknown>), ...Object.keys(restored as Record<string, unknown>)])
  for (const key of allKeys) {
    const itemPath = path ? `${path}.${key}` : key
    if (!(key in (original as Record<string, unknown>))) {
      entries.push({ path: itemPath, type: 'added', after: (restored as Record<string, unknown>)[key] })
    } else if (!(key in (restored as Record<string, unknown>))) {
      entries.push({ path: itemPath, type: 'removed', before: (original as Record<string, unknown>)[key] })
    } else {
      entries.push(
        ...computeDiff(
          (original as Record<string, unknown>)[key],
          (restored as Record<string, unknown>)[key],
          itemPath
        )
      )
    }
  }

  return entries
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Component                                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

export default function EditEditor() {
  const appRef = React.useRef<TldrawApp | null>(null)

  // Pre-compile the DeckSpec into a TDDocument (the "addDeckFromSpec" step).
  const [compiledDoc] = React.useState<TDDocument>(() => deckSpecToDocument(SAMPLE_DECK_SPEC))

  // Diff state — populated when the user clicks Save.
  const [diffEntries, setDiffEntries] = React.useState<DiffEntry[]>([])
  const [saved, setSaved] = React.useState(false)

  const onMount = React.useCallback(
    (app: TldrawApp) => {
      appRef.current = app

      // Expose for visual harness.
      ;(window as unknown as { tlapp: TldrawApp }).tlapp = app

      // Load the pre-compiled document.
      app.deck.loadDeck(compiledDoc)
    },
    [compiledDoc]
  )

  /**
   * Save button handler: call documentToDeckSpec on the live document, compute
   * the diff against the original DeckSpec, and display it.
   */
  const handleSave = React.useCallback(() => {
    const app = appRef.current
    if (!app) return

    const { spec: restoredSpec } = documentToDeckSpec(app.document)

    // Compute diff between original DeckSpec and the round-tripped one.
    const entries = computeDiff(SAMPLE_DECK_SPEC, restoredSpec)
    setDiffEntries(entries)
    setSaved(true)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 8,
          borderBottom: '1px solid #ddd',
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        <strong>Edit Mode — DeckSpec round-trip demo</strong>
        <button
          id="save-deck-spec"
          data-testid="save-deck-spec"
          onClick={handleSave}
          style={{ marginLeft: 16, padding: '6px 16px', cursor: 'pointer' }}
        >
          Save (round-trip)
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: diffEntries.length === 0 ? '#16a34a' : '#d97706' }}>
            {diffEntries.length === 0
              ? '✓ Round-trip is lossless — no diff'
              : `⚠ ${diffEntries.length} difference(s) found`}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Diff panel */}
        <div
          style={{
            width: 360,
            flexShrink: 0,
            borderRight: '1px solid #ddd',
            padding: 12,
            overflowY: 'auto',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 13,
          }}
        >
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Round-trip diff</h3>
          {diffEntries.length === 0 ? (
            <p style={{ color: '#666' }}>
              Click <strong>Save (round-trip)</strong> to decompile the live document back
              into a DeckSpec and compare with the input.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {diffEntries.map((entry, i) => (
                <li
                  key={`${entry.path}-${i}`}
                  style={{
                    padding: '6px 8px',
                    marginBottom: 4,
                    borderRadius: 4,
                    background:
                      entry.type === 'added'
                        ? '#dcfce7'
                        : entry.type === 'removed'
                        ? '#fee2e2'
                        : '#fef3c7',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{entry.path}</div>
                  <div style={{ fontSize: 12 }}>
                    {entry.type === 'added' && (
                      <span style={{ color: '#16a34a' }}>+ {JSON.stringify(entry.after)}</span>
                    )}
                    {entry.type === 'removed' && (
                      <span style={{ color: '#dc2626' }}>- {JSON.stringify(entry.before)}</span>
                    )}
                    {entry.type === 'changed' && (
                      <>
                        <span style={{ color: '#dc2626' }}>- {JSON.stringify(entry.before)}</span>
                        <br />
                        <span style={{ color: '#16a34a' }}>+ {JSON.stringify(entry.after)}</span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor canvas */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <Tldraw onMount={onMount} components={blockComponents} blockRegistry={liveBlockRegistry} />
        </div>
      </div>
    </div>
  )
}
