/**
 * tls.c.team — grid arithmetic, frame, bio toggle, depth (4 and inside a container), capacity.
 */

import { tlsCTeam, buildTeam, colsFor } from './index'
import { standardBlockSuite, leavesOf, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { makeCtx } from '../../layout/test-helpers'
import { depthOk, layoutAt, hasPart, registry } from '../composite-test'
import { lintParts } from '../_kit'

const person = (i: number) => ({ image: i % 2 ? '/demo/portrait-1.svg' : '', name: `Member Number ${i}`, role: `Role ${i}`, bio: 'A short biography that runs over a couple of lines.' })
const PEOPLE = (n: number) => Array.from({ length: n }, (_, i) => person(i + 1))

standardBlockSuite(tlsCTeam, { withRegistry: true, overflowProps: { people: PEOPLE(9) } })

describe('tls.c.team', () => {
  it('is a group-scope people composite pointing at profile-card and avatar-group', () => {
    expect(tlsCTeam.scope).toBe('group')
    expect(tlsCTeam.category).toBe('people')
    expect(tlsCTeam.describe!.avoid).toContain('tls.c.profile-card')
  })

  it('auto columns: 2->2, 3->3, 4->4, 5-6->3, 7-8->4; explicit cols are capped to the count', () => {
    expect([2, 3, 4, 5, 6, 7, 8].map((n) => colsFor(n, 'auto'))).toEqual([2, 3, 4, 3, 3, 4, 4])
    expect(colsFor(2, '4')).toBe(2)
    expect(colsFor(8, '2')).toBe(2)
  })

  it('build() reference tree is 4 deep (grid, card, stack, leaf) and 3 with a plain frame; the layout is 1 deep', () => {
    for (const n of [2, 4, 8]) {
      for (const card of ['card', 'plain']) depthOk(tlsCTeam, buildTeam, { people: PEOPLE(n), card }, 1500, 900)
    }
  })

  it('works nested inside a card (depth 1 start) without a depth overflow', async () => {
    const reg = registry()
    const ctx = makeCtx({ width: 1500, height: 700 }, reg)
    const t = ctx.layoutChild({ id: 'c', type: 'tls.l.card', props: { padding: 'md', children: [{ id: 't', type: 'tls.c.team', props: { people: PEOPLE(4) } }] } }, { x: 0, y: 0, width: 1500, height: 700 })
    expect(lintParts(t)).toEqual([])
  })

  it('places every member in its cell: rows and columns follow the grid', () => {
    const t = layoutAt(tlsCTeam, { people: PEOPLE(6), card: 'card' }, 1500, 800)
    const cards = leavesOf(t, 'card')
    expect(cards).toHaveLength(6)
    const xs = [...new Set(cards.map((c) => Math.round(c.x)))]
    const ys = [...new Set(cards.map((c) => Math.round(c.y)))]
    expect(xs).toHaveLength(3)
    expect(ys).toHaveLength(2)
    for (const c of cards) expect(c.height).toBeCloseTo(cards[0].height, 3)
  })

  it('card: plain draws no panel; card: card draws one per person', () => {
    expect(hasPart(layoutAt(tlsCTeam, { people: PEOPLE(3), card: 'plain' }, 1500, 800), 'card')).toBe(false)
    expect(leavesOf(layoutAt(tlsCTeam, { people: PEOPLE(3), card: 'card' }, 1500, 800), 'card')).toHaveLength(3)
  })

  it('showBio false removes exactly the bios and shrinks the cells', () => {
    const on = layoutAt(tlsCTeam, { people: PEOPLE(3), showBio: true }, 1500, 800)
    const off = layoutAt(tlsCTeam, { people: PEOPLE(3), showBio: false }, 1500, 800)
    expect(hasPart(on, 'bio')).toBe(true)
    expect(hasPart(off, 'bio')).toBe(false)
    expect(hasPart(off, 'person')).toBe(true)
    expect(leavesOf(off, 'card')[0].height).toBeLessThan(leavesOf(on, 'card')[0].height)
  })

  it('shows every name; people without a bio get none; empty names are dropped', () => {
    const t = layoutAt(tlsCTeam, { people: [{ name: 'Ada' }, { name: 'Bao', bio: 'Hi there.' }, { name: '' }] }, 1500, 800)
    const names = leavesOf(t, 'person').filter((l) => l.k === 'text').map((l) => (l.node as any).lines[0].text)
    expect(names).toContain('Ada')
    expect(names).toContain('Bao')
    expect(leavesOf(t, 'card')).toHaveLength(2)
    expect(leavesOf(t, 'bio')).toHaveLength(1)
  })

  it('stays inside the box with 8 people (preferred and a tall box) and keeps text apart', () => {
    for (const card of ['card', 'plain']) {
      const t = layoutAt(tlsCTeam, { people: PEOPLE(8), card }, 1500, 900)
      assertContained(t, { width: 1500, height: 900 })
      assertNoTextOverlap(t)
    }
  })

  it('intrinsicSize grows with the number of rows; capacity flags more than 8 people', () => {
    const ctx = makeCtx({ width: 1500, height: 900 }, registry())
    const a = tlsCTeam.intrinsicSize!({ people: PEOPLE(3) } as any, ctx)
    const b = tlsCTeam.intrinsicSize!({ people: PEOPLE(8) } as any, ctx)
    expect(b.height).toBeGreaterThan(a.height)
    expect(tlsCTeam.capacity!({ people: PEOPLE(9) } as any, { width: 1500, height: 900 }, ctx).fits).toBe(false)
  })
})
