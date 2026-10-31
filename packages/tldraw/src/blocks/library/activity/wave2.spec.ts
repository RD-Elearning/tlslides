/** L03-C — contract of tls.a.match / order / sort / timer: standard suite, lint codes, interaction. */

import { tlsAMatch, lintMatch, rightOrder } from './tls-a-match'
import { tlsAOrder, lintOrder, displayOrder as orderOf } from './tls-a-order'
import { tlsASort, lintSort } from './tls-a-sort'
import { tlsATimer, lintTimer, clock } from './tls-a-timer'
import { template as mT } from './tls-a-match/template'
import { interact as mI } from './tls-a-match/interact'
import { template as oT } from './tls-a-order/template'
import { interact as oI } from './tls-a-order/interact'
import { template as sT } from './tls-a-sort/template'
import { interact as sI } from './tls-a-sort/interact'
import { template as tT } from './tls-a-timer/template'
import { interact as tI } from './tls-a-timer/interact'
import { activityLabels } from '../../activity/labels'
import { makeCtx, TEST_TOKENS } from '../layout/test-helpers'
import { standardBlockSuite } from '../text/standard-suite'
import { registry } from '../composite/composite-test'
import type { ActivityRuntime, ActivityState, BlockDefinition } from '../../types'

const BLOCKS = [tlsAMatch, tlsAOrder, tlsASort, tlsATimer]
const OVER: Record<string, Record<string, unknown>> = {
  'tls.a.match': { pairs: Array.from({ length: 7 }, (_, i) => ({ left: `l${i}`, right: `r${i}` })) },
  'tls.a.order': { items: Array.from({ length: 8 }, (_, i) => `i${i}`) },
  'tls.a.sort': { items: Array.from({ length: 10 }, (_, i) => ({ text: `t${i}`, bin: i % 2 })) },
  'tls.a.timer': { label: 'x'.repeat(200) },
}
for (const b of BLOCKS) standardBlockSuite(b, { withRegistry: true, overflowProps: OVER[b.type] })

const box = { width: 1500, height: 900 }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function mount(def: BlockDefinition, tpl: any, act: any, props: any = {}) {
  const p = { ...(def.describe!.example.props as object), ...props }
  const post = def.poster!(p, makeCtx(box, registry()))
  const root = document.createElement('div')
  root.innerHTML = tpl(p, { esc, cssVar: (r: string) => `var(--tls-${r})`, box, tokens: TEST_TOKENS, poster: post })
  let state: ActivityState | undefined
  const events: any[] = []
  const rt: ActivityRuntime = { submit: 'confirm', labels: activityLabels('en'), getState: () => state, setState: (s) => (state = s), emit: (e) => events.push(e), reducedMotion: true }
  const dispose = act(root, rt, p)
  const $ = (sel: string) => root.querySelector(sel) as HTMLButtonElement
  return { root, $, events, p, dispose, state: () => state }
}

describe('wave-2 activities — registration', () => {
  it('are live, learning, html-kind and declare their activity kind', () => {
    expect(BLOCKS.map((b) => [b.type, b.family, b.kind, b.category, b.activity?.kind])).toEqual([
      ['tls.a.match', 'live', 'html', 'learning', 'match'],
      ['tls.a.order', 'live', 'html', 'learning', 'order'],
      ['tls.a.sort', 'live', 'html', 'learning', 'sort'],
      ['tls.a.timer', 'live', 'html', 'learning', 'timer'],
    ])
  })
  it('order is never displayed already in order; shuffles are deterministic', () => {
    for (const n of [3, 4, 5, 6, 7]) {
      const items = Array.from({ length: n }, (_, i) => `item ${i}`)
      expect(orderOf({ prompt: '', items })).not.toEqual(items.map((_, i) => i))
      expect(orderOf({ prompt: '', items })).toEqual(orderOf({ prompt: '', items }))
    }
    expect(rightOrder(tlsAMatch.defaults as any)).not.toEqual([0, 1, 2])
  })
})

describe('lint codes', () => {
  it('match', () => {
    expect(lintMatch({ prompt: 'q', pairs: [{ left: 'a', right: 'b' }] } as any).map((f) => f.rule)).toContain('activity/pairs-count')
    expect(lintMatch({ prompt: 'q', pairs: [{ left: 'a', right: 'b' }, { left: 'A', right: 'c' }] } as any).map((f) => f.rule)).toContain('activity/lefts-duplicate')
    expect(lintMatch({ prompt: 'q', pairs: [{ left: 'a', right: 'b' }, { left: 'c', right: 'B' }] } as any).map((f) => f.rule)).toContain('activity/rights-duplicate')
    expect(lintMatch(tlsAMatch.defaults as any)).toEqual([])
  })
  it('order', () => {
    expect(lintOrder({ prompt: 'q', items: ['a', 'b'] } as any).map((f) => f.rule)).toContain('activity/items-count')
    expect(lintOrder({ prompt: 'q', items: ['a', 'b', 'A'] } as any).map((f) => f.rule)).toContain('activity/items-duplicate')
    expect(lintOrder(tlsAOrder.defaults as any)).toEqual([])
  })
  it('sort', () => {
    const base = tlsASort.defaults as any
    expect(lintSort({ ...base, bins: ['x'] }).map((f) => f.rule)).toContain('activity/bins-count')
    expect(lintSort({ ...base, items: base.items.map((x: any) => ({ ...x, bin: 0 })) }).map((f) => f.rule)).toContain('activity/bin-unused')
    expect(lintSort({ ...base, items: [...base.items.slice(0, 2), { text: 'z', bin: 5 }] }).map((f) => f.rule)).toContain('activity/bin-out-of-range')
    expect(lintSort(base)).toEqual([])
  })
  it('timer', () => {
    expect(lintTimer({ label: 'x', seconds: 2 }).map((f) => f.rule)).toContain('activity/timer-range')
    expect(lintTimer({ label: 'x', seconds: 1000 }).map((f) => f.rule)).toContain('activity/timer-range')
    expect(lintTimer(tlsATimer.defaults as any)).toEqual([])
    expect(clock(125)).toBe('02:05')
  })
})

describe('match', () => {
  it('pairs by clicking left then right; check scores; show fills the answers', () => {
    const m = mount(tlsAMatch, mT, mI)
    const L = (i: number) => m.root.querySelector(`[data-act="left"][data-i="${i}"]`) as HTMLButtonElement
    const R = (i: number) => m.root.querySelector(`[data-act="right"][data-i="${i}"]`) as HTMLButtonElement
    expect(m.$('[data-act="check"]').disabled).toBe(true)
    for (let i = 0; i < 3; i++) {
      L(i).click()
      R((i + 1) % 3).click() // all wrong on purpose
    }
    expect(m.$('[data-act="check"]').disabled).toBe(false)
    m.$('[data-act="check"]').click()
    expect(m.events[0]).toMatchObject({ type: 'answered', correct: false })
    m.$('[data-act="show"]').click()
    expect(L(0).dataset.state).toBe('missed')
    m.$('[data-act="retry"]').click()
    for (let i = 0; i < 3; i++) {
      L(i).click()
      R(i).click()
    }
    m.$('[data-act="check"]').click()
    expect(m.events.at(-1)).toMatchObject({ type: 'answered', correct: true })
  })
})

describe('order', () => {
  it('numbers items in click order; correct sequence scores right; clicking again removes', () => {
    const m = mount(tlsAOrder, oT, oI)
    const it = (i: number) => m.root.querySelector(`[data-act="item"][data-i="${i}"]`) as HTMLButtonElement
    it(2).click()
    expect(it(2).querySelector('.tlsa-badge')!.textContent).toBe('1')
    it(2).click()
    expect(it(2).querySelector('.tlsa-badge')!.hasAttribute('hidden')).toBe(true)
    for (let i = 0; i < 4; i++) it(i).click()
    m.$('[data-act="check"]').click()
    expect(m.events[0]).toMatchObject({ type: 'answered', correct: true })
    expect(m.state()?.picked).toEqual([0, 1, 2, 3])
  })
})

describe('sort', () => {
  it('click an item then a bin assigns it; wrong answers are marked', () => {
    const m = mount(tlsASort, sT, sI)
    const items = (m.p.items as any[])
    const item = (i: number) => m.root.querySelector(`[data-act="item"][data-i="${i}"]`) as HTMLButtonElement
    const bin = (b: number) => m.root.querySelector(`[data-act="bin"][data-b="${b}"]`) as HTMLButtonElement
    items.forEach((_, i) => {
      item(i).click()
      bin(i === 0 ? 1 : items[i].bin).click() // item 0 into the wrong bin
    })
    m.$('[data-act="check"]').click()
    expect(m.events[0]).toMatchObject({ type: 'answered', correct: false })
    expect(item(0).dataset.state).toBe('wrong')
    expect(item(1).dataset.state).toBe('correct')
  })
})

describe('timer', () => {
  it('counts down, stops, and shows time-up at zero', () => {
    jest.useFakeTimers()
    const m = mount(tlsATimer, tT, tI, { seconds: 5 })
    const face = m.$('[data-part="clock"]')
    expect(face.textContent).toBe('00:05')
    m.$('[data-act="start"]').click()
    jest.advanceTimersByTime(2000)
    expect(face.textContent).toBe('00:03')
    m.$('[data-act="stop"]').click()
    jest.advanceTimersByTime(5000)
    expect(face.textContent).toBe('00:03')
    m.$('[data-act="start"]').click()
    jest.advanceTimersByTime(4000)
    expect(face.textContent).toBe('00:00')
    expect(face.dataset.state).toBe('up')
    m.dispose()
    jest.useRealTimers()
  })
})

describe('activity tour fixture', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tour = require('../../__fixtures__/activity-tour.json')
  it('has one slide per activity block and every block is lint-clean', () => {
    const blocks = tour.slides.map((s: any) => s.regions.timeline[0])
    expect(blocks.map((b: any) => b.type)).toEqual(['choice', 'true-false', 'flip-cards', 'reveal', 'fill-blank', 'match', 'order', 'sort', 'timer'].map((t) => 'tls.a.' + t))
    const reg = registry()
    for (const b of blocks) expect(reg.get(b.type)!.lint!(b.props, makeCtx(box, reg))).toEqual([])
  })
})
