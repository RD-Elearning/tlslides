/**
 * AC4 — the deck card surface (`DeckTokens.surface` → `cardPaint`, ai-curation §6 AC4): every
 * card-like block paints its neutral cards through one helper; with no surface nothing changes;
 * each surface kind draws what it says; glass and hard shadow keep DOM/SVG parity.
 */
import { assertParity, PROBE_TOKENS, TEST_SURFACE } from '../../parity-harness'
import { createLayoutContext } from '../../layout'
import { layoutBlock } from '../../layout/layout-child'
import { registerBuiltInBlocks } from '../index'
import { BlockRegistry } from '../../registry'
import { resolveTokens } from '../../tokens'
import { cardCssFromPoster, cardNodes, cardPaint } from './_kit'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import type { LayoutNode, ResolvedTokens, StyleSurface } from '../../types'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)

const ADOPTERS: Array<[string, Record<string, unknown>, [number, number]]> = [
  ['tls.c.cards', {}, [1500, 420]],
  ['tls.c.feature-grid', { cell: 'card' }, [1200, 420]],
  ['tls.c.kpi-row', { tile: 'card' }, [1600, 300]],
  ['tls.d.pricing', {}, [1280, 700]],
  ['tls.c.team', {}, [1500, 520]],
  ['tls.c.comparison', { style: 'cards' }, [1500, 500]],
  ['tls.c.testimonial', {}, [1200, 520]],
  ['tls.l.card', { children: [{ id: 'b', type: 'tls.t.body', props: { text: 'Inside a card.' } }] }, [600, 300]],
]

const withSurface = (surface?: Partial<StyleSurface>): ResolvedTokens => resolveTokens(DEFAULT_DECK_THEME, surface ? { surface } : undefined)
const props = (type: string, extra: Record<string, unknown>) => ({ ...(registry.get(type)!.describe?.example?.props as object), ...extra })
const tree = (type: string, extra: Record<string, unknown>, [w, h]: [number, number], tokens: ResolvedTokens): LayoutNode =>
  layoutBlock(registry.get(type)!, props(type, extra), createLayoutContext({ box: { width: w, height: h }, tokens, surface: TEST_SURFACE, registry }))
const rects = (n: LayoutNode): Array<LayoutNode & { k: 'rect' }> => {
  const out: Array<LayoutNode & { k: 'rect' }> = []
  const walk = (x: LayoutNode): void => {
    if (x.k === 'group') x.children.forEach(walk)
    else if (x.k === 'host' && x.poster) walk(x.poster)
    else if (x.k === 'rect') out.push(x)
  }
  walk(n)
  return out
}

describe('AC4 cardPaint', () => {
  const ctx = (surface?: Partial<StyleSurface>, luminance = 1) =>
    createLayoutContext({ box: { width: 100, height: 100 }, tokens: withSurface(surface), surface: { ...TEST_SURFACE, luminance } })
  const base = { fill: { type: 'solid' as const, color: '#eeeeee' } }

  it('no deck surface: the block keeps its own look', () => {
    const cp = cardPaint(ctx(), base)
    expect(cp).toEqual({ fill: base.fill, stroke: undefined, surface: base.fill, styled: false })
  })

  it('each surface kind', () => {
    expect(cardPaint(ctx({ card: 'filled', stroke: 'hairline', shadow: 1 }), base)).toMatchObject({ fill: base.fill, stroke: { width: 2 }, shadow: 1, styled: true })
    const outline = cardPaint(ctx({ card: 'outline' }), base)
    expect(outline.fill).toBeUndefined()
    expect(outline.stroke!.width).toBe(2)
    const ghost = cardPaint(ctx({ card: 'ghost', stroke: 'bold' }), base)
    expect(ghost.fill).toBeUndefined()
    expect(ghost.stroke).toBeUndefined()
    expect(ghost.topRule!.width).toBe(3)
    expect(cardPaint(ctx({ card: 'raised' }), base).shadow).toBe(2)
    const darkGlass = cardPaint(ctx({ card: 'glass', shadow: 1 }, 0.02), base)
    expect(darkGlass.fill).toEqual({ type: 'solid', color: 'rgba(255,255,255,0.12)' })
    expect(darkGlass.stroke!.color).toBe('rgba(255,255,255,0.35)')
    expect(cardPaint(ctx({ card: 'glass' }, 0.9), base).fill).toEqual({ type: 'solid', color: 'rgba(255,255,255,0.55)' })
    // text on an unfilled or translucent card resolves against what is behind the block
    expect(darkGlass.surface).toEqual(TEST_SURFACE.behind)
    expect(cardPaint(ctx({ card: 'filled', shadow: 'hard', stroke: 'bold' }), base)).toMatchObject({ shadow: 'hard', stroke: { width: 3 } })
  })

  it('cardNodes: one rect (fill, border, shadow), a ghost card only its rule', () => {
    const box = { x: 0, y: 0, width: 200, height: 100 }
    const n = cardNodes(cardPaint(ctx({ card: 'filled', shadow: 'hard', stroke: 'bold' }), base), box, 8, 'card')
    expect(n).toHaveLength(1)
    expect(n[0]).toMatchObject({ k: 'rect', part: 'card', radius: 8, shadow: 'hard' })
    const g = cardNodes(cardPaint(ctx({ card: 'ghost', stroke: 'hairline' }), base), box, 8, 'card')
    expect(g).toEqual([{ k: 'rect', box: { x: 0, y: 0, width: 200, height: 2 }, part: 'card.rule', fill: expect.anything() }])
    expect(cardNodes(cardPaint(ctx({ card: 'ghost' }), base), box)).toEqual([])
  })

  it('cardCssFromPoster: fill, inset border, shadow, glass blur, ghost rule', () => {
    const glass = cardNodes(cardPaint(ctx({ card: 'glass', shadow: 1 }, 0.02), base), { x: 0, y: 0, width: 10, height: 10 }, 24, 'card')
    const css = cardCssFromPoster({ k: 'group', box: { x: 0, y: 0, width: 10, height: 10 }, children: glass }, 'card')!
    expect(css).toContain('background:rgba(255,255,255,0.12);')
    expect(css).toContain('backdrop-filter:blur(18px)')
    expect(css).toContain('inset 0 0 0 2px rgba(255,255,255,0.35)')
    expect(css).toContain('0px 6px 8px')
    expect(css).toContain('border-radius:24px;')
    expect(cardCssFromPoster(undefined, 'card')).toBeUndefined()
    expect(cardCssFromPoster({ k: 'group', box: { x: 0, y: 0, width: 1, height: 1 }, children: [] }, 'card')).toBe('')
  })
})

describe.each(ADOPTERS)('AC4 %s adopts the deck surface', (type, extra, size) => {
  it('no surface: same tree as before (no shadow, no glass)', () => {
    const t = tree(type, extra, size, PROBE_TOKENS)
    expect(rects(t).some((r) => r.shadow)).toBe(false)
  })

  it('glass: translucent cards with a hairline and a shadow', () => {
    const t = tree(type, extra, size, withSurface({ card: 'glass', shadow: 1 }))
    const glass = rects(t).filter((r) => r.fill?.type === 'solid' && /^rgba\(255,255,255/.test(r.fill.color))
    expect(glass.length).toBeGreaterThan(0)
    for (const r of glass) expect(r.shadow).toBe(1)
  })

  it('filled + bold + hard: hard shadows in the border colour', () => {
    const t = tree(type, extra, size, withSurface({ card: 'filled', stroke: 'bold', shadow: 'hard' }))
    expect(rects(t).filter((r) => r.shadow === 'hard' && r.stroke?.width === 3).length).toBeGreaterThan(0)
  })

  it('ghost: no card fill left (the testimonial, card-less by default, adds none)', () => {
    const plain = rects(tree(type, extra, size, PROBE_TOKENS)).length
    const ghost = rects(tree(type, extra, size, withSurface({ card: 'ghost' }))).length
    if (type === 'tls.c.testimonial') {
      expect(ghost).toBe(plain)
      expect(rects(tree(type, extra, size, withSurface({ card: 'filled' }))).length).toBe(plain + 1)
    } else expect(ghost).toBeLessThan(plain)
  })

  it.each([
    ['glass', { card: 'glass', shadow: 1 }],
    ['hard', { card: 'filled', stroke: 'bold', shadow: 'hard' }],
  ] as const)('DOM and SVG agree with the %s surface (parity probe)', async (_n, surface) => {
    const [w, h] = size
    // tls.c.kpi-row: probed without a registry, like its own spec (the known nested-tile issue,
    // tls-c-kpi-row.spec "with a registry (known issue)"): the row geometry and its card groups.
    const reg = type === 'tls.c.kpi-row' ? {} : { registry }
    await assertParity(registry.get(type)!, props(type, extra), { width: w, height: h }, undefined, { ...reg, tokens: { ...PROBE_TOKENS, surface: { stroke: 'none', ...surface } as StyleSurface } })
  }, 30000)
})

describe('AC4 DeckTokens.surface resolution', () => {
  const { deckSpecTokens, mergeDeckTokens } = require('../../styles') as typeof import('../../styles')
  it('a style surface is DeckTokens.surface under DeckSpec.tokens.surface', () => {
    expect(deckSpecTokens({ style: 'gradient' })!.surface).toEqual({ card: 'filled', stroke: 'hairline', shadow: 1 })
    expect(deckSpecTokens({ style: 'gradient', tokens: { surface: { card: 'glass' } } })!.surface).toEqual({ card: 'glass', stroke: 'hairline', shadow: 1 })
    expect(mergeDeckTokens(undefined, { surface: { shadow: 'hard' } })!.surface).toEqual({ shadow: 'hard' })
  })
  it('resolveTokens fills the missing fields; no surface stays absent', () => {
    expect(resolveTokens(DEFAULT_DECK_THEME, { surface: { card: 'outline' } }).surface).toEqual({ card: 'outline', stroke: 'none', shadow: 0 })
    expect(resolveTokens(DEFAULT_DECK_THEME).surface).toBeUndefined()
  })
})
