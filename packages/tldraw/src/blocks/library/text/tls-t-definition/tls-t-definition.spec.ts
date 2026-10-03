/**
 * tls.t.definition — stacked vs inline geometry, meta line, toggles.
 */

import { tlsTDefinition } from './index'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf } from '../standard-suite'

const ctx = (w = 900, h = 400) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 900, h = 400) =>
  tlsTDefinition.layout({ ...(tlsTDefinition.defaults as any), ...props } as any, ctx(w, h))
const one = (tree: any, part: string) => leavesOf(tree, part).find((l) => l.part === part)!

standardBlockSuite(tlsTDefinition, { noCapacity: true })

describe('tls.t.definition', () => {
  it('stacked: term, meta, definition, example run down in order without overlap', () => {
    const tree = lay({})
    const order = ['term', 'meta', 'definition', 'example'].map((p) => one(tree, p))
    for (let i = 1; i < order.length; i++) expect(order[i].y).toBeGreaterThanOrEqual(order[i - 1].y + order[i - 1].height - 1)
    for (const l of [order[0], order[2]]) expect(l.x).toBe(0)
  })

  it('inline: definition sits right of the term and starts at the top', () => {
    const tree = lay({ layout: 'inline' })
    const term = one(tree, 'term')
    const def = one(tree, 'definition')
    expect(def.x).toBeGreaterThanOrEqual(term.x + term.width)
    expect(def.y).toBe(0)
    expect(one(tree, 'meta').x).toBeLessThan(def.x)
  })

  it('inline falls back to stacked in a narrow box', () => {
    const tree = lay({ layout: 'inline' }, 400, 600)
    expect(one(tree, 'definition').x).toBe(0)
  })

  it('pronunciation and part of speech share the meta line, pronunciation first', () => {
    const tree = lay({})
    const p = one(tree, 'pronunciation')
    const m = one(tree, 'meta')
    expect(m.x).toBeGreaterThan(p.x + p.width - 1)
    expect(Math.abs(m.y - p.y)).toBeLessThanOrEqual(1)
  })

  it('showPronunciation:false keeps the part of speech; empty meta adds no meta line', () => {
    const tree = lay({ showPronunciation: false })
    expect(leavesOf(tree, 'pronunciation')).toHaveLength(0)
    expect(leavesOf(tree, 'meta')).toHaveLength(1)
    const none = lay({ showPronunciation: false, partOfSpeech: '' })
    expect(leavesOf(none, 'meta')).toHaveLength(0)
    expect(one(none, 'definition').y).toBeLessThan(one(tree, 'definition').y)
  })

  it('showExample:false removes the example and its bar', () => {
    const tree = lay({ showExample: false })
    expect(leavesOf(tree, 'example')).toHaveLength(0)
    expect(leavesOf(tree, 'example.bar')).toHaveLength(0)
  })

  it('termTone picks accent or text', () => {
    const c = ctx()
    const colorOf = (tone: string) => (one(lay({ termTone: tone }), 'term').node as any).style.color
    expect(colorOf('accent')).toBe(c.resolveColor('accent').color)
    expect(colorOf('text')).toBe(c.resolveColor('text').color)
  })

  it('bold runs in the definition are preserved', () => {
    const def = one(lay({}), 'definition').node as any
    expect(def.lines.some((l: any) => l.runs?.some((r: any) => r.bold))).toBe(true)
  })
})
