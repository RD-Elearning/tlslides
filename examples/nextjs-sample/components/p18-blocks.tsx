'use client'

import * as React from 'react'
import { BlockRegistry, createBlockComponents } from '@tlslides/tldraw'
import type { BlockDefinition, BlockSpec } from '@tlslides/tldraw'

// Phase 18 demo wiring for the sample app.
//
// This exists to make the block foundations *observable* in a real Next.js host, not just in the
// jest suite: a `BlockSpec` (plain JSON, no coordinates and no React) goes through
// `blockToShape` into a `ComponentShape`, and the registry resolves its `componentId` back to a
// React component that the canvas renders.
//
// What it deliberately does NOT do is render a finished-looking block. P18 ships types, the
// registry and the shape bridge — the layout engine and the DOM/SVG renderers are P20. So
// `createBlockComponents` returns a labelled placeholder per block, and that placeholder is the
// honest state of the system today. Once P20 lands, these same definitions render for real with
// no change to the document, which is the whole point of storing a spec rather than pixels.

function def(type: string, name: string, family: BlockDefinition['family']): BlockDefinition {
  return {
    type,
    name,
    family,
    tier: 'A',
    summary: `${name} — placeholder until P20's renderer lands.`,
    keywords: [name.toLowerCase()],
    schema: {},
    defaults: {},
    size: { preferred: [480, 260], min: [160, 90] },
    // Required by the contract, and unused until P20: nothing calls `layout()` yet, because the
    // renderer that consumes a LayoutNode does not exist. Returning an empty group keeps the
    // definition valid without pretending to lay anything out.
    layout: () => ({ k: 'group', box: { x: 0, y: 0, width: 0, height: 0 }, children: [] }),
    motion: { default: 'fade', parts: {} },
  } as BlockDefinition
}

export const p18Registry = new BlockRegistry()
p18Registry.register(def('tls.t.title', 'Title', 'text'))
p18Registry.register(def('tls.d.kpi', 'KPI tile', 'data'))
p18Registry.register(def('tls.g.timeline-h', 'Timeline', 'diagram'))
p18Registry.register(def('tls.l.split', 'Split', 'layout'))

/** The registry in the shape `<Tldraw components={...}>` expects, merged with this app's own
 *  hand-written Phase 5 blocks so both mechanisms coexist on one canvas. */
export const p18Components = createBlockComponents(p18Registry)

/** A nested spec, used by the "Add P18 block" button. Two levels deep, with style and motion —
 *  all of which survive the round trip into the document and back out. */
export const demoSpec: BlockSpec = {
  type: 'tls.l.split',
  id: 'demo-split',
  props: { ratio: '3:7', gutter: 'xl' },
  style: { surface: 'surfaceAlt', tone: 'filled', radius: 'lg' },
  motion: { preset: 'split-in', order: 1, duration: 500 },
  children: [
    { type: 'tls.t.title', props: { text: 'Margin fell on infrastructure' } },
    { type: 'tls.d.kpi', props: { label: 'Gross margin', value: '61%', delta: -3 } },
  ],
}
