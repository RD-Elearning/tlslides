/** L03-B — contract of tls.a.true-false / flip-cards / reveal / fill-blank: standard suite, lint codes, interaction. */

import { tlsATrueFalse } from './tls-a-true-false'
import { tlsAFlipCards, lintFlip } from './tls-a-flip-cards'
import { tlsAReveal, lintReveal } from './tls-a-reveal'
import { tlsAFillBlank, lintFillBlank, answersOf, bankOf } from './tls-a-fill-blank'
import { lintTrueFalse } from './tls-a-true-false'
import { template as tfT } from './tls-a-true-false/template'
import { interact as tfI } from './tls-a-true-false/interact'
import { template as flT } from './tls-a-flip-cards/template'
import { interact as flI } from './tls-a-flip-cards/interact'
import { template as rvT } from './tls-a-reveal/template'
import { interact as rvI } from './tls-a-reveal/interact'
import { template as fbT } from './tls-a-fill-blank/template'
import { interact as fbI } from './tls-a-fill-blank/interact'
import { activityLabels } from '../../activity/labels'
import { makeCtx, TEST_TOKENS } from '../layout/test-helpers'
import { standardBlockSuite } from '../text/standard-suite'
import { registry } from '../composite/composite-test'
import type { ActivityRuntime, ActivityState, BlockDefinition } from '../../types'

const BLOCKS = [tlsATrueFalse, tlsAFlipCards, tlsAReveal, tlsAFillBlank]
const OVER: Record<string, Record<string, unknown>> = {
  'tls.a.true-false': { statements: Array.from({ length: 7 }, (_, i) => ({ text: `s${i}`, answer: i % 2 === 0 })) },
  'tls.a.flip-cards': { cards: Array.from({ length: 9 }, (_, i) => ({ front: `f${i}`, back: `b${i}` })) },
  'tls.a.reveal': { hints: ['1', '2', '3', '4'] },
  'tls.a.fill-blank': { text: '[[a]] [[b]] [[c]] [[d]] [[e]] [[f]]' },
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
  act(root, rt, p)
  const $ = (sel: string) => root.querySelector(sel) as HTMLButtonElement
  return { root, $, events, p, state: () => state }
}

describe('wave-1 activities — registration', () => {
  it('are live, learning, html-kind and declare their activity kind', () => {
    const kinds = BLOCKS.map((b) => [b.type, b.family, b.kind, b.category, b.activity?.kind])
    expect(kinds).toEqual([
      ['tls.a.true-false', 'live', 'html', 'learning', 'true-false'],
      ['tls.a.flip-cards', 'live', 'html', 'learning', 'flip'],
      ['tls.a.reveal', 'live', 'html', 'learning', 'reveal'],
      ['tls.a.fill-blank', 'live', 'html', 'learning', 'fill-blank'],
    ])
  })
  it('the poster height is the host node height', () => {
    for (const b of BLOCKS) {
      const p = b.describe!.example.props
      const node = b.layout(p as any, makeCtx(box, registry())) as any
      expect(node.k).toBe('host')
      expect(node.box.height).toBe(b.poster!(p, makeCtx(box, registry())).box.height)
    }
  })
})

describe('lint codes', () => {
  it('true-false', () => {
    expect(lintTrueFalse({ prompt: 'x', statements: [{ text: 'a', answer: true }] } as any).map((f) => f.rule)).toContain('activity/statements-count')
  })
  it('flip-cards', () => {
    expect(lintFlip({ cards: [{ front: 'a', back: 'b' }] } as any).map((f) => f.rule)).toContain('activity/cards-count')
    expect(lintFlip({ cards: [{ front: 'a', back: 'b' }, { front: 'A', back: 'c' }] } as any).map((f) => f.rule)).toContain('activity/cards-duplicate')
    expect(lintFlip({ cards: [{ front: 'a', back: '' }, { front: 'b', back: 'c' }] } as any).map((f) => f.rule)).toContain('activity/card-empty')
  })
  it('reveal', () => {
    expect(lintReveal({ prompt: 'q', answer: '' } as any).map((f) => f.rule)).toContain('activity/answer-empty')
    expect(lintReveal({ prompt: 'q', answer: 'a', hints: ['1', '2', '3', '4'] } as any).map((f) => f.rule)).toContain('activity/hints-count')
  })
  it('fill-blank', () => {
    expect(lintFillBlank({ prompt: 'q', text: 'no blanks' } as any).map((f) => f.rule)).toContain('activity/blank-count')
    expect(lintFillBlank({ prompt: 'q', text: 'a [[x]] b [[x]]' } as any).map((f) => f.rule)).toContain('activity/bank-duplicate')
    expect(lintFillBlank({ prompt: 'q', text: 'a [[one two three four]]' } as any).map((f) => f.rule)).toContain('activity/blank-long')
    expect(lintFillBlank({ prompt: 'q', text: 'Mã học phần là [[MAT103]], có [[04]] tín chỉ' } as any).map((f) => f.rule)).toContain('activity/blank-lookup')
    expect(lintFillBlank({ prompt: 'q', text: 'The [[median]] is the middle value' } as any).map((f) => f.rule)).not.toContain('activity/blank-lookup')
    expect(lintFillBlank(tlsAFillBlank.defaults as any)).toEqual([])
  })
})

describe('flip-cards', () => {
  it('a card flips and "flip all" flips every card; state is saved', () => {
    const m = mount(tlsAFlipCards, flT, flI)
    const cards = m.root.querySelectorAll('[data-act="flip"]')
    ;(cards[0] as HTMLButtonElement).click()
    expect(cards[0].getAttribute('aria-pressed')).toBe('true')
    expect(cards[1].getAttribute('aria-pressed')).toBe('false')
    m.$('[data-act="flipall"]').click()
    expect([...cards].every((c) => c.getAttribute('aria-pressed') === 'true')).toBe(true)
    expect(m.state()?.picked).toHaveLength(cards.length)
  })
})

describe('reveal', () => {
  it('hint shows hints one by one, show reveals the answer, retry hides it', () => {
    const m = mount(tlsAReveal, rvT, rvI, { hints: ['h1', 'h2'] })
    const hints = [...m.root.querySelectorAll<HTMLElement>('[data-hint]')]
    expect(hints.every((h) => h.hidden)).toBe(true)
    m.$('[data-act="hint"]').click()
    expect(hints.map((h) => h.hidden)).toEqual([false, true])
    m.$('[data-act="show"]').click()
    expect(m.$('[data-part="answer"]').dataset.shown).toBe('true')
    expect(m.events.map((e) => e.type)).toEqual(['revealed'])
    m.$('[data-act="retry"]').click()
    expect(m.$('[data-part="answer"]').dataset.shown).toBe('false')
  })
})

describe('true-false', () => {
  it('check is enabled only when every statement has a verdict, then marks rows', () => {
    const m = mount(tlsATrueFalse, tfT, tfI)
    const n = (m.p.statements as any[]).length
    expect(m.$('[data-act="check"]').disabled).toBe(true)
    for (let i = 0; i < n; i++) (m.root.querySelector(`[data-act="statement"][data-i="${i}"][data-v="${(m.p.statements as any[])[i].answer ? 1 : 0}"]`) as HTMLButtonElement).click()
    expect(m.$('[data-act="check"]').disabled).toBe(false)
    m.$('[data-act="check"]').click()
    expect([...m.root.querySelectorAll<HTMLElement>('[data-row]')].every((r) => r.dataset.state === 'correct')).toBe(true)
    expect(m.events[0]).toMatchObject({ type: 'answered', correct: true })
  })
})

describe('fill-blank', () => {
  it('parses blanks, a chip fills the first empty blank, check scores, show fills the answers', () => {
    expect(answersOf('a [[x]] b [[y]]')).toEqual(['x', 'y'])
    expect(bankOf(tlsAFillBlank.defaults as any).sort()).toEqual(['mean', 'median', 'mode'])
    const m = mount(tlsAFillBlank, fbT, fbI)
    const chip = (w: string) => m.root.querySelector(`[data-act="chip"][data-w="${w}"]`) as HTMLButtonElement
    chip('mode').click()
    chip('mean').click()
    m.$('[data-act="check"]').click()
    expect(m.events[0]).toMatchObject({ type: 'answered', correct: false })
    m.$('[data-act="show"]').click()
    expect([...m.root.querySelectorAll('[data-act="blank"]')].map((b) => b.textContent)).toEqual(['median', 'mean'])
  })
})
