/**
 * spro sprint 2026-11b S06-a — `spread` under a heading: the title and the body's top do not move
 * between slides, and a main block with a `fillPolicy` takes the room (`style.fill`, `fillLayout`).
 */
import { analyzeDeck } from './layout-report'
import type { BlockSpec, DeckSpec, SlideSpec } from './types'
import { slideQuality } from './pipeline/quality'
import { compileSlide } from './slide-compiler'
import { shapeToAuthoredBlock, BLOCK_PROP_KEY } from './shape-bridge'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'
import { TEST_TOKENS } from './parity-harness'

const T = (text: string): BlockSpec => ({ id: 't', type: 'tls.t.title', props: { text } })
const bullets = (n: number, words = 4): BlockSpec => ({
  id: 'b',
  type: 'tls.t.bullets',
  props: { items: Array.from({ length: n }, (_, i) => ({ text: `Point ${i + 1} ${'word '.repeat(words).trim()}` })) },
})
const body = (lines: number): BlockSpec => ({ id: 'p', type: 'tls.t.body', props: { text: 'A sentence of plain body text. '.repeat(lines * 3).trim() } })
const deck = (slides: SlideSpec[]): DeckSpec => ({ version: 1, id: 'q', title: 'q', theme: 'minimal-white', style: 'minimal', aspect: 'widescreen', slides }) as DeckSpec
const slide = (layout: string, region: string, blocks: BlockSpec[], valign: 'auto' | 'none' = 'auto'): SlideSpec => ({
  id: 's',
  layout,
  ...(valign === 'auto' ? { valign } : {}),
  regions: { title: [T('A heading')], [region]: blocks },
})

function report(s: SlideSpec) {
  return analyzeDeck(deck([s]))[0]
}
const titleTop = (s: SlideSpec) => slideQuality(report(s), { balance: true }).title?.y
const firstTop = (s: SlideSpec, id: string) => {
  const b = report(s).blocks.find((x) => x.id === id)!
  return Math.min(...b.text.map((t) => t.painted.y))
}

describe('S06-a title anchor', () => {
  const LAYOUTS: Array<[string, string]> = [
    ['timeline', 'timeline'],
    ['blank', 'content'],
    ['two-column', 'left'],
    ['split-60-40', 'left'],
    ['sidebar-title', 'content'],
    ['band', 'band'],
  ]
  it.each(LAYOUTS)("the title's painted top does not depend on the body (%s)", (layout, region) => {
    const tops = [2, 4, 7].map((n) => titleTop(slide(layout, region, [bullets(n)])))
    expect(new Set(tops).size).toBe(1)
  })

  it.each([
    ['timeline', 'timeline'],
    ['two-column', 'left'],
  ])('a list that fills its room starts at the same height under the title, whatever its length (%s)', (layout, region) => {
    const tops = [4, 6, 8].map((n) => firstTop(slide(layout, region, [bullets(n)]), 'b'))
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(8)
  })

  it('a list too short to use its room (one item) is centred in it, not left as a strip under the title', () => {
    const s = slide('timeline', 'timeline', [bullets(1)])
    const q = slideQuality(report(s), { balance: true })
    expect(Math.abs(q.bottomGap - q.topGap)).toBeLessThan(0.1)
  })

  it('the sidebar title sits at the top of its column', () => {
    const top = titleTop(slide('sidebar-title', 'content', [bullets(3)]))
    expect(top).toBe(titleTop(slide('timeline', 'timeline', [bullets(3)])))
  })
})

describe('S06-a spread and S06-b fill', () => {
  const reg = new BlockRegistry()
  registerBuiltInBlocks(reg)
  const tokens = TEST_TOKENS
  const frame = { width: 1920, height: 1080 }
  const meta = (s: SlideSpec, id: string) => {
    const r = compileSlide(s, frame, tokens, reg)
    const sh = r.shapes.find((x) => (x.props[BLOCK_PROP_KEY] as { id?: string }).id === id)!
    return { shape: sh, meta: sh.props[BLOCK_PROP_KEY] as { filled?: boolean; style?: { fill?: boolean } } }
  }

  it('a list main under a heading is filled; the decompiler returns the authored block', () => {
    const { shape, meta: m } = meta(slide('timeline', 'timeline', [bullets(4)]), 'b')
    expect(m.filled).toBe(true)
    expect(m.style?.fill).toBe(true)
    expect(shapeToAuthoredBlock(shape)?.style).toBeUndefined()
  })

  it('no fill without valign auto, without a heading, or for a block with no fillPolicy', () => {
    expect(meta(slide('timeline', 'timeline', [bullets(4)], 'none'), 'b').meta.filled).toBeUndefined()
    const untitled: SlideSpec = { id: 's', layout: 'blank', valign: 'auto', regions: { content: [bullets(4)] } }
    expect(meta(untitled, 'b').meta.filled).toBeUndefined()
    expect(meta(slide('timeline', 'timeline', [body(2)]), 'p').meta.filled).toBeUndefined()
  })

  it('4 short items in a full region reach down the slide (bottomGap ≤ 0.15) at a larger type', () => {
    const s = slide('timeline', 'timeline', [bullets(4)])
    const q = slideQuality(report(s), { balance: true })
    expect(q.bottomGap).toBeLessThanOrEqual(0.15)
    const unfilled = slideQuality(analyzeDeck(deck([{ ...s, valign: undefined }]))[0], { balance: true })
    expect(q.bodyLead).toBeGreaterThan(unfilled.bodyLead)
  })

  it('a long list keeps its type and still shows whole', () => {
    const s = slide('timeline', 'timeline', [bullets(8, 12)])
    const r = report(s)
    expect(r.findings.filter((f) => f.code.startsWith('text/') && f.severity !== 'info')).toEqual([])
  })

  it('a list with a takeaway under it: the list takes the room, the takeaway keeps its height', () => {
    const takeaway: BlockSpec = { id: 'k', type: 'tls.t.takeaway', props: { text: 'What to remember.' } }
    const s = slide('timeline', 'timeline', [bullets(3), takeaway])
    const r = report(s)
    const list = r.blocks.find((b) => b.id === 'b')!
    const tk = r.blocks.find((b) => b.id === 'k')!
    expect(tk.box.y).toBeGreaterThan(list.box.y + list.box.height - 1)
    expect(tk.box.y + tk.box.height).toBeLessThanOrEqual(r.regions.timeline.y + r.regions.timeline.height + 1)
  })
})

describe('S06-D activities fill their room', () => {
  const choice: BlockSpec = { id: 'q', type: 'tls.a.choice', props: { prompt: 'Which one?', options: ['Water, air, warmth', 'Only sunlight', 'Only good soil'], answer: [0] } }
  const tf: BlockSpec = { id: 'q', type: 'tls.a.true-false', props: { prompt: 'True or false?', statements: [{ text: 'Seeds need water.', answer: true }, { text: 'Seeds need soil only.', answer: false }] } }
  it.each([['choice', choice], ['true-false', tf]])('a short %s reaches down the slide at a larger type', (_, block) => {
    const s = slide('timeline', 'timeline', [block])
    const filled = slideQuality(report(s), { balance: true })
    const plain = slideQuality(report({ ...s, regions: { ...s.regions, timeline: [{ ...block, style: { fill: false } }] } }), { balance: true })
    expect(filled.bottomGap).toBeLessThan(plain.bottomGap)
    const sizes = (r: ReturnType<typeof report>) => r.blocks.filter((b) => b.id === 'q').flatMap((b) => b.text.map((t) => t.fontSize * (t.scale || 1)))
    const plainReport = report({ ...s, regions: { ...s.regions, timeline: [{ ...block, style: { fill: false } }] } })
    expect(Math.min(...sizes(report(s)))).toBeGreaterThan(Math.min(...sizes(plainReport)))
    expect(report(s).findings.filter((f) => f.severity !== 'info' && (f.code.startsWith('text/') || f.code.startsWith('overlap')))).toEqual([])
  })
})
