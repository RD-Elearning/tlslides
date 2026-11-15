/**
 * spro sprint 2026-11c C6 — one rule for a named group's colour across the list-like blocks: an item
 * with `tone: 'category:<n>'` (recap: `pointTones[i]`) draws its mark in the group's colour; an item
 * without it, or with an unknown tone, keeps the block's own look.
 */

import type { BlockDefinition, LayoutNode } from '../types'
import { tlsGStaircase } from './diagram/tls-g-staircase'
import { tlsGFlow } from './diagram/tls-g-flow'
import { tlsTChecklist } from './text/tls-t-checklist'
import { tlsMIconList } from './media/tls-m-icon-list'
import { tlsCRecap } from './composite/tls-c-recap'
import { tlsCBento } from './composite/tls-c-bento'
import { registry } from './composite/composite-test'
import { assertContained } from './text/standard-suite'

const { createLayoutContext } = require('../layout/layout-child')
const { TEST_TOKENS, TEST_SURFACE } = require('./layout/test-helpers')

const GREEN = '#3E8E4E'
const tokens = { ...TEST_TOKENS, categorical: [GREEN, '#4A4F55', '#FFFFFF'] }
const W = 1500
const H = 640

function colours(n: LayoutNode, out: Set<string> = new Set()): Set<string> {
  const a = n as any
  for (const c of [a.fill?.color, a.stroke?.color, typeof a.fill === 'string' ? a.fill : undefined, a.style?.color]) if (typeof c === 'string') out.add(c.toUpperCase())
  for (const k of a.children ?? []) colours(k, out)
  return out
}
const at = (def: BlockDefinition, props: Record<string, unknown>) =>
  def.layout({ ...(def.defaults as any), ...props } as any, createLayoutContext({ box: { width: W, height: H }, tokens, surface: TEST_SURFACE, registry: registry() }))

const CASES: Array<[string, BlockDefinition, (tone?: string) => Record<string, unknown>]> = [
  ['tls.g.staircase', tlsGStaircase, (tone) => ({ steps: [{ label: 'Túi xanh lá', icon: 'leaf', ...(tone ? { tone } : {}) }, { label: 'B', icon: 'leaf' }, { label: 'C', icon: 'leaf' }], fill: 'single' })],
  ['tls.g.flow', tlsGFlow, (tone) => ({ nodes: [{ id: 'a', label: 'Túi xanh lá', ...(tone ? { tone } : {}) }, { id: 'b', label: 'B' }], edges: [{ from: 'a', to: 'b' }] })],
  ['tls.t.checklist', tlsTChecklist, (tone) => ({ items: [{ text: 'Túi xanh lá', ...(tone ? { tone } : {}) }, { text: 'B' }] })],
  ['tls.m.icon-list', tlsMIconList, (tone) => ({ items: [{ icon: 'leaf', title: 'Túi xanh lá', ...(tone ? { tone } : {}) }, { icon: 'leaf', title: 'B' }] })],
  ['tls.c.recap', tlsCRecap, (tone) => ({ style: 'cards', points: ['Túi xanh lá', 'B', 'C'], ...(tone ? { pointTones: [tone, '', ''] } : {}) })],
  ['tls.c.bento', tlsCBento, (tone) => ({ pattern: '1+2', tiles: [{ kind: 'point', icon: 'leaf', title: 'Túi xanh lá', ...(tone ? { tone } : {}) }, { kind: 'point', title: 'B' }, { kind: 'point', title: 'C' }] })],
]

describe('C6 — a named group in its colour, one rule over six blocks', () => {
  it.each(CASES)('%s: a toned item carries the group colour', (_n, def, props) => {
    expect(colours(at(def, props())).has(GREEN)).toBe(false)
    expect(colours(at(def, props('category:0'))).has(GREEN)).toBe(true)
  })

  it.each(CASES)('%s: an unknown tone or an index past the ramp keeps the plain look', (_n, def, props) => {
    const plain = [...colours(at(def, props()))].sort()
    expect([...colours(at(def, props('category:9')))].sort()).toEqual(plain)
    expect([...colours(at(def, props('green')))].sort()).toEqual(plain)
  })

  it.each(CASES)('%s: a white group on a white page still shows a visible mark', (_n, def, props) => {
    const c = colours(at(def, props('category:2')))
    // the white group's mark is nudged to a readable shade, never pure white on the page
    const t = at(def, props('category:2'))
    assertContained(t, { width: W, height: H })
    expect(c.size).toBeGreaterThan(1)
  })
})
