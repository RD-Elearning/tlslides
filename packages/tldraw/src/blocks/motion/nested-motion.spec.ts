/**
 * CMP3 (F11) — nested motion: a child's own data reveal plays inside its container's stagger,
 * only under the container's showy preset; the stagger cap (T2); settle; nested heroes in the lint.
 */

import * as React from 'react'
import { render } from '@testing-library/react'
import type { BlockSpec } from '../types'
import type { MotionDriver, MotionHandle, MotionKeyframes, MotionOptions, MotionState } from './driver'
import { playBlockReveal, settleBlockParts, cappedStagger, STAGGER_CAP_MS, authoredChildIds } from './play-reveal'
import { renderNodeToDom } from '../render-dom'
import { defaultBlockRegistry } from '../validate-deck-spec'
import { createLayoutContext, layoutBlock } from '../layout/layout-child'
import { resolveTokens } from '../tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { analyzeSlide } from '../layout-report'

const reg = defaultBlockRegistry()
const tokens = resolveTokens(DEFAULT_DECK_THEME)

function recorder() {
  const play: Array<{ target: Element; keyframes: MotionKeyframes; opts: MotionOptions }> = []
  const set: Array<{ target: Element; state: MotionState }> = []
  const driver: MotionDriver = {
    play(target, keyframes, opts): MotionHandle {
      play.push({ target, keyframes, opts })
      if (opts.onUpdate) opts.onUpdate(1)
      return { cancel() {}, finished: Promise.resolve() }
    },
    set(target, state) {
      set.push({ target, state })
    },
    timeline(): MotionHandle {
      return { cancel() {}, finished: Promise.resolve() }
    },
    cancelAll() {},
  }
  return { driver, play, set }
}

const card = (id: string, value: string): BlockSpec => ({
  id,
  type: 'tls.l.card',
  props: { children: [{ id: `${id}-n`, type: 'tls.t.hero-number', props: { value, unit: 'growth' } }, { id: `${id}-b`, type: 'tls.t.body', props: { text: 'Revenue grew in every region.' } }] },
})
const grid: BlockSpec = { id: 'g', type: 'tls.l.grid', props: { columns: 2, rows: 1, children: [card('c1', '42%'), card('c2', '1.2M')] } }

function mount(spec: BlockSpec, w = 1600, h = 500): HTMLElement {
  const def = reg.get(spec.type)!
  const ctx = createLayoutContext({ box: { width: w, height: h }, tokens, surface: { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false }, registry: reg })
  const node = layoutBlock(def, spec.props as Record<string, unknown>, ctx)
  const { container } = render(React.createElement('div', null, renderNodeToDom(node)))
  return container.firstElementChild as HTMLElement
}

describe('CMP3 nested motion', () => {
  it('the DOM marks each nested block wrapper with its id and type', () => {
    const el = mount(grid)
    const ids = Array.from(el.querySelectorAll('[data-nested-id]')).map((e) => `${e.getAttribute('data-nested-id')}:${e.getAttribute('data-nested-type')}`)
    expect(ids).toEqual(expect.arrayContaining(['c1:tls.l.card', 'c1-n:tls.t.hero-number', 'c2-n:tls.t.hero-number']))
    expect([...authoredChildIds(grid)].sort()).toEqual(['c1', 'c1-b', 'c1-n', 'c2', 'c2-b', 'c2-n'])
  })

  it('expressive: each hero number counts up inside its card, starting with the card in the stagger', () => {
    const el = mount(grid)
    const { driver, play } = recorder()
    playBlockReveal(el, { ...grid, motion: { preset: 'stagger-children' } }, reg.get('tls.l.grid')!, { driver, reducedMotion: false })
    const values = Array.from(el.querySelectorAll('[data-part="value"]'))
    expect(values).toHaveLength(2)
    const countUps = play.filter((p) => values.includes(p.target) && p.opts !== undefined)
    expect(countUps.length).toBe(2)
    const cardStart = (id: string) => play.find((p) => p.target === el.querySelector(`[data-nested-id="${id}"]`))?.opts.delay ?? 0
    const valueStart = (i: number) => countUps.find((p) => p.target === values[i])!.opts.delay ?? 0
    expect(valueStart(0)).toBeGreaterThanOrEqual(cardStart('c1'))
    expect(valueStart(1)).toBeGreaterThanOrEqual(cardStart('c2'))
    expect(valueStart(1)).toBeGreaterThan(valueStart(0))
    // the numbers end on their authored text (static output = final frame)
    expect(values.map((v) => v.textContent)).toEqual(['42%', '1.2M'])
  })

  it('subtle (fade) and reduced motion play nothing nested', () => {
    const el = mount(grid)
    const values = Array.from(el.querySelectorAll('[data-part="value"]'))
    const a = recorder()
    playBlockReveal(el, { ...grid, motion: { preset: 'fade' } }, reg.get('tls.l.grid')!, { driver: a.driver, reducedMotion: false })
    expect(a.play.some((p) => values.includes(p.target))).toBe(false)
    const b = recorder()
    playBlockReveal(el, { ...grid, motion: { preset: 'stagger-children' } }, reg.get('tls.l.grid')!, { driver: b.driver, reducedMotion: true })
    expect(b.play).toHaveLength(0)
  })

  it('settle puts nested parts at rest too', () => {
    const el = mount(grid)
    const { driver, set } = recorder()
    settleBlockParts(el, { ...grid, motion: { preset: 'stagger-children' } }, reg.get('tls.l.grid')!, driver)
    const values = Array.from(el.querySelectorAll('[data-part="value"]'))
    expect(values.every((v) => set.some((s) => s.target === v && s.state.opacity === 1))).toBe(true)
  })

  it('T2: a family\'s whole stagger is capped at 300 ms', () => {
    expect(cappedStagger(40, 3)).toBe(40)
    expect(cappedStagger(40, 21)).toBe(STAGGER_CAP_MS / 20)
    expect(cappedStagger(40, 1)).toBe(40)
  })

  it('the oracle counts nested heroes under expressive (3 count-ups in cards > 2)', () => {
    const three: BlockSpec = { id: 'g', type: 'tls.l.grid', props: { columns: 3, rows: 1, children: [card('c1', '42%'), card('c2', '1.2M'), card('c3', '7')] } }
    const slide = (motionStyle: 'expressive' | 'subtle') => ({ id: 's', layout: 'blank', motionStyle, regions: { content: [three] } })
    const heroes = (r: ReturnType<typeof analyzeSlide>) => r.findings.filter((f) => f.code === 'motion/too-many-heroes')
    const ex = heroes(analyzeSlide(slide('expressive') as any, { motionStyle: 'expressive' }))
    expect(ex).toHaveLength(1)
    expect(ex[0].blockIds).toEqual(['g/c1/c1-n', 'g/c2/c2-n', 'g/c3/c3-n'])
    expect(heroes(analyzeSlide(slide('subtle') as any, { motionStyle: 'subtle' }))).toHaveLength(0)
  })
})
