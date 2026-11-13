/**
 * spro sprint 2026-11c S18-k (T30, D61): words a block prints by itself — not from its props — follow the deck's
 * language. Every tier-1/2 block is laid out with its example props under `locale: vi`; an ASCII word of >= 4
 * letters in a text leaf that the props do not contain is an English word the block made up (a Gantt legend
 * "In progress / At risk" in a Vietnamese deck). The list is a ratchet: it may shrink, never grow.
 */
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import type { LayoutNode, SurfaceContext } from './types'
import { BUILT_IN_BLOCKS } from './library'
import { defaultBlockRegistry } from './validate-deck-spec'
import { resolveTokens } from './tokens'
import { createLayoutContext } from './layout/layout-child'
import { tableMetrics } from './layout/measure'

const registry = defaultBlockRegistry()
const SURFACE: SurfaceContext = { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false }

function texts(node: LayoutNode, out: string[] = []): string[] {
  const n = node as any
  if (n.k === 'text' && Array.isArray(n.lines)) out.push(n.lines.map((l: any) => l.text).join(' '))
  for (const c of n.children ?? []) texts(c, out)
  return out
}

function ownWords(type: string): string[] {
  const def = registry.get(type)!
  const props = { ...(def.defaults as Record<string, unknown>), ...(def.describe?.example?.props ?? {}) }
  const tokens = { ...resolveTokens(DEFAULT_DECK_THEME), locale: 'vi' } as any
  const ctx = createLayoutContext({ box: { width: 1200, height: 600 }, tokens, surface: SURFACE, registry, measureText: tableMetrics() })
  let tree: LayoutNode
  try {
    tree = def.layout(props as any, ctx)
  } catch {
    return []
  }
  const given = JSON.stringify(props).toLowerCase()
  // a leaf with Vietnamese letters is Vietnamese ("Đã xong"), whatever its ASCII syllables
  const VI_LETTERS = /[À-ỹĐđ]/
  const words = texts(tree).filter((t) => !VI_LETTERS.test(t)).flatMap((t) => t.match(/\b[A-Za-z]{4,}\b/g) ?? [])
  return [...new Set(words.filter((w) => !given.includes(w.toLowerCase())))]
}

// Measured 2026-11-13: after the scorecard and recap fixes no tier-1/2 block prints English words of its own
// under `vi`. Fix one → delete its line. A new block may not join.
const KNOWN: Record<string, string[]> = {}

describe('block words follow the deck language (S18-k)', () => {
  const found: Record<string, string[]> = {}
  for (const def of BUILT_IN_BLOCKS.filter((d) => d.aiTier === 1 || d.aiTier === 2)) {
    const w = ownWords(def.type)
    if (w.length) found[def.type] = w
  }

  it('no block prints English words of its own beyond the known list', () => {
    // eslint-disable-next-line no-console
    if (process.env.BLOCK_LOCALE_REPORT) console.log(JSON.stringify(found, null, 1))
    const fresh = Object.entries(found).filter(([t, ws]) => ws.some((w) => !(KNOWN[t] ?? []).includes(w)))
    expect(Object.fromEntries(fresh)).toEqual({})
  })
})
