/**
 * spro creative CR2 — the design moves library (`moves.ts`): well formed, and every move builds a
 * sample slide from its default blocks (main block's example in the move's first layout) that
 * validates and has no oracle error in four styles. Poster moves wait for the poster gate profile
 * (CR7a): their sample is checked for validation only.
 */

import { registerBuiltInBlocks } from './library'
import { BlockRegistry } from './registry'
import { DESIGN_MOVES, findMove, movesFor, movesOfBlock } from './moves'
import { findDesign } from './patterns'
import { SLIDE_LAYOUTS } from './slide-layouts'
import { resolveTokens } from './tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { validateDeckSpec } from './validate-deck-spec'
import { analyzeDeck } from './layout-report'
import { getDeckStyle } from './styles'
import { FRAME_ROLES, RELATIONS } from './types'
import type { BlockSpec, DeckSpec, SlideSpec } from './types'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const tokens = resolveTokens(DEFAULT_DECK_THEME)
const STYLES = ['minimal', 'doodle', 'editorial', 'gradient']

function regionsOf(layoutId: string): Array<[string, number]> {
  const layout = SLIDE_LAYOUTS.find((l) => l.id === layoutId)!
  return Object.entries(layout.compile({ width: 1920, height: 1080 }, tokens)).map(([k, b]) => [k, b.width * b.height])
}

/** The move's sample: the main block in the largest region, a title in `title`, a short body in
 *  every other region. */
export function moveSample(id: string): SlideSpec {
  const m = findMove(id)!
  const ex = registry.get(m.main[0])!.describe!.example!
  const regions = regionsOf(m.layouts[0]).filter(([k]) => k !== 'title' && k !== 'attribution')
  const big = [...regions].sort((a, b) => b[1] - a[1])[0][0]
  const out: Record<string, BlockSpec[]> = {}
  for (const [name] of regionsOf(m.layouts[0])) {
    if (name === 'title') out.title = [{ id: 't', type: 'tls.t.title', props: { text: 'A sample slide' } } as BlockSpec]
    else if (name === big) out[name] = [{ ...ex, id: 'main' }]
    else out[name] = [{ id: `b-${name}`, type: 'tls.t.body', props: { text: 'One short line that goes with it.' } } as BlockSpec]
  }
  return { id: `m-${id}`, layout: m.layouts[0], regions: out } as SlideSpec
}

describe('creative CR2 design moves', () => {
  it('has 30 content and 32 frame moves with unique ids', () => {
    expect(DESIGN_MOVES.filter((m) => m.kind === 'content')).toHaveLength(36) // spro creative CR13: + 6 wave-2/3 moves
    expect(DESIGN_MOVES.filter((m) => m.kind === 'frame')).toHaveLength(32)
    expect(new Set(DESIGN_MOVES.map((m) => m.id)).size).toBe(DESIGN_MOVES.length)
    for (const r of FRAME_ROLES) expect([r, movesFor(r).length >= 3]).toEqual([r, true])
    expect(movesOfBlock('tls.g.cycle')).toEqual(expect.arrayContaining(['diagram-hero', 'loop']))
  })

  for (const m of DESIGN_MOVES) {
    it(`"${m.id}" names real layouts, AI-eligible blocks, relations and a fallback recipe`, () => {
      for (const l of m.layouts) expect([l, !!SLIDE_LAYOUTS.find((x) => x.id === l)]).toEqual([l, true])
      for (const t of [...m.main, ...(m.support ?? [])]) {
        const def = registry.get(t)
        expect([t, !!def && !def.editorOnly]).toEqual([t, true])
      }
      for (const r of m.relations) expect(RELATIONS).toContain(r)
      expect([m.fallbackRecipe, !!findDesign(m.fallbackRecipe)]).toEqual([m.fallbackRecipe, true])
      expect(m.when.length).toBeGreaterThan(8)
    })
  }

  for (const m of DESIGN_MOVES) {
    it(`"${m.id}" builds a sample slide from its default blocks in ${STYLES.join(', ')}`, () => {
      const slide = moveSample(m.id)
      const bad: string[] = []
      for (const style of STYLES) {
        const deck = { version: 1, id: 'moves', title: 'Moves', theme: getDeckStyle(style)!.palettes[0].id, style, aspect: 'widescreen', slides: [slide] } as DeckSpec
        for (const f of validateDeckSpec(deck, registry)) if (f.level === 'error') bad.push(`${style} validate ${f.rule}`)
        if (m.intent === 'poster') continue // the poster gate profile lands in CR7a
        for (const f of analyzeDeck(deck, { registry })[0].findings) if (f.severity === 'error') bad.push(`${style} ${f.code}`)
      }
      expect(bad).toEqual([])
    })
  }
})
