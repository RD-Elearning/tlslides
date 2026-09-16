'use client'

import * as React from 'react'
import { BlockRegistry, createBlockComponents } from '@tlslides/tldraw'
import type { BlockDefinition, BlockSpec } from '@tlslides/tldraw'
import {
  probeRects,
  probeTextAndLines,
  probeMediaAndIcons,
} from '@tlslides/tldraw'

// Phase 18 demo wiring for the sample app.
//
// This exists to make the block foundations *observable* in a real Next.js host, not just in the
// jest suite: a `BlockSpec` (plain JSON, no coordinates and no React) goes through
// `blockToShape` into a `ComponentShape`, and the registry resolves its `componentId` back to a
// React component that the canvas renders.
//
// The "Add P18 block" demo now registers probe blocks (from @tlslides/tldraw) with real
// layout() functions. When ComponentUtil sees a matching BlockDefinition in the BlockRegistry,
// it renders through renderNodeToDom — the real layout engine — instead of the grey placeholder.

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

/** A BlockRegistry with probe blocks that have real layout() functions.
 *  These render through renderNodeToDom instead of the grey placeholder. */
export const liveBlockRegistry = new BlockRegistry()
liveBlockRegistry.register(probeRects)
liveBlockRegistry.register(probeTextAndLines)
liveBlockRegistry.register(probeMediaAndIcons)

/** A nested spec, used by the "Add P18 block" button. Now uses a probe block (probe.rects)
 *  with real layout rendering instead of a placeholder. */
export const demoSpec: BlockSpec = {
  type: 'probe.rects',
  id: 'demo-rects',
  props: {},
  style: { surface: 'surfaceAlt', tone: 'filled', radius: 'lg' },
  motion: { preset: 'fade-in', order: 1, duration: 500 },
}
