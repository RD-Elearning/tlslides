/**
 * spro enhance PLAN.md L5 — content grows into the space: a balanced slide whose content floats in
 * its page is compiled again with one larger text scale; a full slide and an authored slide stay.
 */
import { analyzeDeck } from '../layout-report'
import { compileSlide } from '../slide-compiler'
import { shapeToAuthoredBlock, shapeToBlock } from '../shape-bridge'
import { BlockRegistry } from '../registry'
import { registerBuiltInBlocks } from '../library'
import { TEST_TOKENS } from '../parity-harness'
import type { BlockSpec, DeckSpec, SlideSpec } from '../types'



const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const FRAME = { width: 1920, height: 1080 }
const T: BlockSpec = { id: 't', type: 'tls.t.title', props: { text: 'Three ways to walk a tree' } }
const list = (n: number, text = 'Visit the node, then its children'): BlockSpec => ({
  id: 'l',
  type: 'tls.t.bullets',
  props: { items: Array.from({ length: n }, (_, i) => ({ text: `${text} ${i + 1}` })) },
})
const slide = (body: BlockSpec[], valign?: 'auto'): SlideSpec => ({ id: 's', layout: 'title-content', ...(valign ? { valign } : {}), regions: { title: [T], content: body } }) as SlideSpec
const deck = (s: SlideSpec): DeckSpec => ({ version: 1, id: 'q', title: 'q', theme: 'minimal-white', style: 'minimal', aspect: 'widescreen', slides: [s] }) as DeckSpec
const fonts = (s: SlideSpec) => {
  const r = analyzeDeck(deck(s))[0]
  return r.blocks.flatMap((b) => b.text.map((t) => ({ region: b.region, size: Math.round(t.fontSize * (t.scale || 1)) })))
}
const grownOf = (s: SlideSpec) =>
  compileSlide(s, FRAME, TEST_TOKENS, registry).shapes.map((sh) => [(sh.props.$block as { id?: string }).id, (sh.props.$block as { grown?: number }).grown])
const grownIds = (s: SlideSpec) => grownOf(s).filter(([, g]) => g !== undefined).map(([id]) => id)

describe('growText (L5)', () => {
  it('a short list on a balanced slide grows, the title stays', () => {
    const plain = fonts(slide([list(3)]))
    const grown = fonts(slide([list(3)], 'auto'))
    const body = (f: typeof plain) => Math.max(...f.filter((x) => x.region !== 'title').map((x) => x.size))
    const title = (f: typeof plain) => Math.max(...f.filter((x) => x.region === 'title').map((x) => x.size))
    expect(body(grown)).toBeGreaterThan(body(plain) * 1.05)
    expect(title(grown)).toBe(title(plain))
    expect(grownIds(slide([list(3)], 'auto'))).toEqual(['l'])
  })

  it('one scale for the whole body: the slide keeps its count of text sizes', () => {
    const body: BlockSpec[] = [list(2), { id: 'k', type: 'tls.t.takeaway', props: { text: 'Pre-order visits the root first.' } }]
    const count = (s: SlideSpec) => new Set(fonts(s).map((f) => f.size)).size
    expect(grownIds(slide(body, 'auto')).sort()).toEqual(['k', 'l'])
    expect(count(slide(body, 'auto'))).toBe(count(slide(body)))
  })

  it('a full slide and a slide that is not judged on balance compile as authored', () => {
    expect(grownIds(slide([list(14, 'A longer item that takes most of the width of the content region')], 'auto'))).toEqual([])
    expect(grownIds(slide([list(3)]))).toEqual([])
    const off = compileSlide(slide([list(3)], 'auto'), FRAME, TEST_TOKENS, registry, { growText: false })
    expect(off.shapes.every((sh) => (sh.props.$block as { grown?: number }).grown === undefined)).toBe(true)
  })

  it('a short row of cards that spans the width but floats in the height grows (review 2026-10-24)', () => {
    const card = (i: number): BlockSpec => ({
      id: `c${i}`,
      type: 'tls.l.card',
      props: { children: [{ id: `h${i}`, type: 'tls.t.subtitle', props: { text: `Pillar ${i}` } }, { id: `p${i}`, type: 'tls.t.body', props: { text: 'One short line of detail.' } }] },
    })
    const row: BlockSpec = { id: 'r', type: 'tls.l.row', props: { gap: 'lg', children: [card(1), card(2), card(3)] } }
    expect(grownIds(slide([row], 'auto'))).toEqual(['r'])
  })

  it('the decompiler returns the authored style; renderers keep the scale', () => {
    const shape = compileSlide(slide([{ ...list(3), style: { align: 'start' } }], 'auto'), FRAME, TEST_TOKENS, registry).shapes.find((sh) => (sh.props.$block as { id?: string }).id === 'l')!
    expect(shapeToBlock(shape)?.style?.textScale).toBeGreaterThan(1)
    expect(shapeToAuthoredBlock(shape)?.style).toEqual({ align: 'start' })
  })
})

describe('growText leaves html blocks alone', () => {
  it('a slide with a big-stat compiles as authored', () => {
    const stat: BlockSpec = { id: 'k', type: 'tls.c.big-stat', props: { value: 34.7, label: 'Error rate' } }
    expect(grownIds(slide([stat, list(2)], 'auto'))).toEqual([])
  })
})
