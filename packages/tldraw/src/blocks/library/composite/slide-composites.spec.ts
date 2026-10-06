/**
 * RV10: the slide composites (cover, hero, kinetic title, divider, agenda, objectives, closing, recap,
 * contact, Q and A, quiz) fit their box: the example at size.preferred and size.min, long and short
 * titles, every variant, 3 and 8 agenda items; layout-kind blocks name motion parts that exist.
 */

import { BlockRegistry } from '../../registry'
import { registerBuiltInBlocks } from '../index'
import { createLayoutContext } from '../../layout/layout-child'
import { TEST_TOKENS, TEST_SURFACE } from '../layout/test-helpers'
import { absoluteLeaves, assertContained, assertWellFormed } from '../text/standard-suite'
import { assertMotionTargetsExist } from '../diagram/diagram-test'
import type { BlockDefinition } from '../../types'

const reg = new BlockRegistry()
registerBuiltInBlocks(reg)

const ctx = (w: number, h: number) =>
  createLayoutContext({ box: { width: w, height: h }, tokens: TEST_TOKENS, surface: TEST_SURFACE, registry: reg, resolveAsset: (id: string) => id })

const TYPES = [
  'tls.c.hero',
  'tls.c.cover',
  'tls.c.kinetic-title',
  'tls.c.divider',
  'tls.c.agenda',
  'tls.c.objectives',
  'tls.c.closing',
  'tls.c.recap',
  'tls.c.contact',
  'tls.t.qa',
  'tls.c.quiz',
]
const def = (type: string) => reg.get(type) as BlockDefinition
const lay = (type: string, props: Record<string, unknown>, w: number, h: number) => {
  const d = def(type)
  return d.layout({ ...(d.defaults as any), ...props } as any, ctx(w, h))
}
/** Root box and every leaf inside the box (html blocks: the host fills the box, so only the root is checked). */
function expectFits(type: string, props: Record<string, unknown>, w: number, h: number) {
  const tree = lay(type, props, w, h)
  assertWellFormed(tree)
  expect([type, w, h, Math.round(tree.box.width) <= w + 2, Math.round(tree.box.height) <= h + 2]).toEqual([type, w, h, true, true])
  assertContained(tree, { width: w, height: h })
  return tree
}
const words = (n: number) => Array.from({ length: n }, (_, i) => ['Sampling', 'noise', 'and', 'the', 'limits', 'of', 'what', 'we', 'can', 'say', 'about', 'populations'][i % 12]).join(' ')

describe('slide composites: the example fits size.preferred and size.min', () => {
  for (const type of TYPES) {
    for (const which of ['preferred', 'min'] as const) {
      it(`${type} at size.${which}`, () => {
        const d = def(type)
        const [w, h] = d.size[which]
        expectFits(type, d.describe!.example.props as any, w, h)
      })
    }
  }
  it('size.min never exceeds size.preferred', () => {
    for (const type of TYPES) {
      const d = def(type)
      expect([type, d.size.min[0] <= d.size.preferred[0], d.size.min[1] <= d.size.preferred[1]]).toEqual([type, true, true])
    }
  })
})

describe('slide composites: title length extremes and variants stay in the box', () => {
  it('cover: 1 and 12 word titles in every variant at preferred', () => {
    const [w, h] = def('tls.c.cover').size.preferred
    for (const variant of ['centered', 'split', 'bleed']) {
      for (const title of ['Statistics', words(12)]) expectFits('tls.c.cover', { ...(def('tls.c.cover').describe!.example.props as any), variant, title }, w, h)
    }
  })

  it('divider: 1 and 12 word titles in every variant at preferred', () => {
    const [w, h] = def('tls.c.divider').size.preferred
    for (const variant of ['numeral', 'field', 'minimal']) {
      for (const title of ['Data', words(12)]) expectFits('tls.c.divider', { ...(def('tls.c.divider').describe!.example.props as any), variant, title }, w, h)
    }
  })

  it('kinetic title and hero: 1 and 12 word titles keep a host no taller than the box', () => {
    const [kw, kh] = def('tls.c.kinetic-title').size.preferred
    for (const title of ['Data', words(12)]) expectFits('tls.c.kinetic-title', { title, highlight: '' }, kw, kh)
    const [hw, hh] = [1920, 1080]
    for (const title of ['Data', words(12)]) expectFits('tls.c.hero', { title }, hw, hh)
  })

  it('agenda: 3 items use bigger type than 8; whenever capacity() says the items fit, the layout stays in the box', () => {
    const d = def('tls.c.agenda')
    const [w, h] = d.size.preferred
    const item = (i: number) => ({ title: `Topic number ${i + 1}`, note: 'A short note about it' })
    const sizeOf = (n: number) => {
      const tree = lay('tls.c.agenda', { items: Array.from({ length: n }, (_, i) => item(i)), current: 0 }, w, h)
      return (absoluteLeaves(tree).find((l) => l.part === 'item[1].title')!.node as any).style.size as number
    }
    expect(sizeOf(3)).toBeGreaterThanOrEqual(sizeOf(8))
    expect(sizeOf(3)).toBeGreaterThan(TEST_TOKENS.type.body.size)
    for (const n of [3, 4, 5, 6, 7, 8]) {
      const props = { items: Array.from({ length: n }, (_, i) => item(i)), current: 0 }
      if (d.capacity!({ ...(d.defaults as any), ...props } as any, { width: w, height: h }, ctx(w, h)).fits) expectFits('tls.c.agenda', props, w, h)
    }
    // 3 items always fit the preferred box
    expectFits('tls.c.agenda', { items: [0, 1, 2].map(item), current: 0 }, w, h)
  })
})

describe('slide composites: layout-kind motion recipes name real parts', () => {
  for (const type of ['tls.c.cover', 'tls.c.divider', 'tls.c.agenda', 'tls.c.objectives', 'tls.c.closing', 'tls.c.recap', 'tls.c.contact', 'tls.t.qa', 'tls.c.quiz']) {
    it(`${type}: parts exist, every drawn leaf is covered, the preset animates`, () => {
      const d = def(type)
      const withCtx = { ...d, layout: ((props: any) => d.layout(props, ctx(d.size.preferred[0], d.size.preferred[1]))) as BlockDefinition['layout'] }
      assertMotionTargetsExist(withCtx as BlockDefinition)
    })
  }
})
