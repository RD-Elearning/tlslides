/**
 * tls.a.choice — contract: poster (quiz geometry, no answer), template (one real button per option,
 * escaping), interaction (instant / confirm / multi, retry, show-answer, state survives a re-mount),
 * lint (every invalid case has an `activity/*` code).
 */

import { tlsAChoice, lintChoice, poster, type ChoiceBlockProps } from './index'
import { template } from './template'
import { interact } from './interact'
import { activityLabels } from '../../../activity/labels'
import { seededOrder } from '../../../activity/shuffle'
import { makeCtx, TEST_TOKENS } from '../../layout/test-helpers'
import { standardBlockSuite } from '../../text/standard-suite'
import { hasPart, registry } from '../../composite/composite-test'
import type { ActivityRuntime, ActivityState } from '../../../types'

standardBlockSuite(tlsAChoice, { withRegistry: true, overflowProps: { options: ['a', 'b', 'c', 'd', 'e', 'f'] } })

const EX = tlsAChoice.describe!.example.props as ChoiceBlockProps
const box = { width: 1500, height: 900 }

function mount(props: Partial<ChoiceBlockProps> = {}, rtOver: Partial<ActivityRuntime> = {}, saved?: ActivityState) {
  const p = { ...EX, ...props } as ChoiceBlockProps
  const ctx = makeCtx(box, registry())
  const post = poster(p, ctx)
  const root = document.createElement('div')
  root.innerHTML = template(p, { esc: (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), cssVar: (r) => `var(--tls-${r})`, box, tokens: TEST_TOKENS, poster: post })
  let state: ActivityState | undefined = saved
  const events: any[] = []
  const rt: ActivityRuntime = { submit: 'instant', labels: activityLabels('vi'), getState: () => state, setState: (s) => (state = s), emit: (e) => events.push(e), reducedMotion: true, ...rtOver }
  const dispose = interact(root, rt, p)
  const $ = (sel: string) => root.querySelector(sel) as HTMLButtonElement
  const opt = (i: number) => root.querySelector(`[data-act="option"][data-i="${i}"]`) as HTMLButtonElement
  return { root, rt, events, dispose, $, opt, state: () => state }
}

describe('tls.a.choice — block', () => {
  it('is a live, learning, html-kind activity', () => {
    expect(tlsAChoice.family).toBe('live')
    expect(tlsAChoice.kind).toBe('html')
    expect(tlsAChoice.category).toBe('learning')
    expect(tlsAChoice.activity).toEqual({ kind: 'choice', answers: 'single' })
  })

  it('the poster never shows the answer or the explanation, and keeps room for the live footer', () => {
    const t = poster(EX, makeCtx(box, registry()))
    expect(hasPart(t, 'answer')).toBe(false)
    expect(hasPart(t, 'explanation')).toBe(false)
    const quiz = poster({ ...EX, explanation: undefined }, makeCtx(box, registry()))
    expect(t.box.height).toBeGreaterThan(quiz.box.height)
    // the host node's box height is the poster's honest height
    const node = tlsAChoice.layout(EX as any, makeCtx(box, registry())) as any
    expect(node.k).toBe('host')
    expect(node.box.height).toBe(t.box.height)
  })

  it('shuffle helper is deterministic and never the identity when asked', () => {
    expect(seededOrder(6, 'b1')).toEqual(seededOrder(6, 'b1'))
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) expect(seededOrder(4, id, true)).not.toEqual([0, 1, 2, 3])
  })
})

describe('tls.a.choice — template', () => {
  it('renders one real button per option, lettered, and escapes user text', () => {
    const m = mount({ options: ['<b>x</b>', 'two', 'three'], answer: [1] })
    const opts = m.root.querySelectorAll('button[data-act="option"]')
    expect(opts).toHaveLength(3)
    opts.forEach((b) => expect((b as HTMLButtonElement).type).toBe('button'))
    expect(m.root.innerHTML).not.toContain('<b>x</b>')
    expect(m.root.querySelector('[data-activity="choice"]')).not.toBeNull()
    expect(m.root.querySelector('[aria-live="polite"]')).not.toBeNull()
    expect(m.opt(0).textContent).toContain('A')
  })
})

describe('tls.a.choice — interaction', () => {
  it('instant: the click gives the result; correct marks the option and shows the explanation', () => {
    const m = mount()
    expect(m.$('[data-act="check"]').hidden).toBe(true)
    m.opt(1).click()
    expect(m.opt(1).dataset.state).toBe('correct')
    expect(m.$('[data-part="feedback"]').textContent).toBe('Chính xác!')
    expect(m.$('[data-part="explanation"]').hidden).toBe(false)
    expect(m.events).toEqual([{ type: 'answered', kind: 'choice', correct: true }])
    expect(m.opt(0).disabled).toBe(true)
  })

  it('instant: a wrong pick marks it, offers "Hiện đáp án" and "Làm lại"; show-answer marks the right one', () => {
    const m = mount()
    m.opt(0).click()
    expect(m.opt(0).dataset.state).toBe('wrong')
    expect(m.$('[data-part="feedback"]').textContent).toBe('Chưa đúng')
    expect(m.$('[data-act="show"]').hidden).toBe(false)
    expect(m.$('[data-part="explanation"]').hidden).toBe(true)
    m.$('[data-act="show"]').click()
    expect(m.opt(1).dataset.state).toBe('missed')
    expect(m.$('[data-part="explanation"]').hidden).toBe(false)
    m.$('[data-act="retry"]').click()
    expect([0, 1, 2].map((i) => m.opt(i).dataset.state)).toEqual(['idle', 'idle', 'idle'])
    expect(m.opt(0).disabled).toBe(false)
    expect(m.events.map((e) => e.type)).toEqual(['answered', 'revealed', 'retried'])
  })

  it('confirm: a click selects, "Kiểm tra" evaluates', () => {
    const m = mount({ submit: 'confirm' })
    expect(m.$('[data-act="check"]').disabled).toBe(true)
    m.opt(2).click()
    expect(m.opt(2).getAttribute('aria-pressed')).toBe('true')
    expect(m.opt(2).dataset.state).toBe('idle')
    m.opt(1).click() // a single answer: the pick moves
    expect(m.opt(2).getAttribute('aria-pressed')).toBe('false')
    expect(m.$('[data-act="check"]').disabled).toBe(false)
    m.$('[data-act="check"]').click()
    expect(m.opt(1).dataset.state).toBe('correct')
  })

  it('the deck default decides when the block has no `submit`; the block wins when it has one', () => {
    expect(mount({}, { submit: 'confirm' }).$('[data-act="check"]').hidden).toBe(false)
    expect(mount({ submit: 'instant' }, { submit: 'confirm' }).$('[data-act="check"]').hidden).toBe(true)
  })

  it('multiple: always needs "Kiểm tra"; all correct picks and no wrong one are required', () => {
    const m = mount({ multiple: true, answer: [0, 2], options: ['a', 'b', 'c', 'd'] })
    m.opt(0).click()
    expect(m.opt(0).dataset.state).toBe('idle')
    m.$('[data-act="check"]').click()
    expect(m.$('[data-part="feedback"]').textContent).toBe('Chưa đúng') // one of two
    m.$('[data-act="retry"]').click()
    m.opt(0).click()
    m.opt(2).click()
    m.$('[data-act="check"]').click()
    expect(m.$('[data-part="feedback"]').textContent).toBe('Chính xác!')
    expect([0, 2].map((i) => m.opt(i).dataset.state)).toEqual(['correct', 'correct'])
  })

  it('retry and show-answer can be switched off; why shows for the picked option', () => {
    const m = mount({ retry: false, showAnswer: false, why: ['no', 'yes', 'no'] })
    m.opt(0).click()
    expect(m.$('[data-act="retry"]').hidden).toBe(true)
    expect(m.$('[data-act="show"]').hidden).toBe(true)
    expect(m.$('[data-part="feedback"]').textContent).toContain('no')
  })

  it('state survives leaving the slide (a re-mount with the saved state) and English labels follow the locale', () => {
    const a = mount()
    a.opt(0).click()
    a.dispose()
    const b = mount({}, {}, a.state())
    expect(b.opt(0).dataset.state).toBe('wrong')
    expect(b.opt(0).disabled).toBe(true)
    expect(mount({}, { labels: activityLabels('en') }).$('[data-act="show"]').textContent).toBe('Show answer')
  })

  it('dispose removes the listener', () => {
    const m = mount()
    m.dispose()
    m.opt(1).click()
    expect(m.opt(1).dataset.state).toBe('idle')
  })
})

describe('tls.a.choice — lint', () => {
  const rules = (p: Partial<ChoiceBlockProps>) => lintChoice({ ...EX, ...p } as ChoiceBlockProps).map((f) => f.rule)
  it('accepts the example', () => expect(rules({})).toEqual([]))
  it('rejects every invalid case with an activity/* error', () => {
    expect(rules({ answer: [] })).toContain('activity/no-answer')
    expect(rules({ answer: [9] })).toContain('activity/answer-out-of-range')
    expect(rules({ answer: [-1] })).toContain('activity/answer-out-of-range')
    expect(rules({ answer: [1, 1], multiple: true })).toContain('activity/answer-duplicate')
    expect(rules({ answer: [0, 1] })).toContain('activity/answer-count')
    expect(rules({ answer: [0, 1], multiple: true })).toEqual([])
    expect(rules({ options: ['Same', ' same ', 'x'], answer: [0] })).toContain('activity/options-duplicate')
    expect(rules({ why: ['a'] })).toContain('activity/why-length')
    for (const f of lintChoice({ ...EX, answer: [9] } as ChoiceBlockProps)) expect(f.level).toBe('error')
  })
})
