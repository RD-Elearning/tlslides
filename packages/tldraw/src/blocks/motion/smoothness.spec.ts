/**
 * M1 — shared motion engine faults (reviews/blocks/block-review/MOTION.md, S8/S14/S16/S26/J7).
 *
 * - S16: every clip-path tween pairs four `inset()` terms of one unit (presets, block code, and
 *   the GSAP driver normalises anything else).
 * - S14: grow presets scale one axis about a baseline origin; a recipe can set a per-part preset
 *   and origin; draw presets really draw a stroked path on (dash array = its length) and wipe a
 *   filled part in instead.
 * - S8: a driver `set()` is final — it stops older tweens of the same properties.
 * - S26: parts the viewer hid before `animate()` are revealed when the block completes, and
 *   every built-in html block reveals all its parts by itself.
 * - J7: under reduced motion an auto chain is shown at once.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { BlockDefinition, BlockMotionRuntime, BlockSpec } from '../types'
import type { MotionDriver, MotionKeyframes, MotionOptions, MotionState } from './driver'
import { MOTION_PRESETS, PRESET_IDS } from './presets'
import { normalizeClipPath, pairClipPath } from './clip-path'
import { createGsapDriver } from './gsap-driver'
import type { GsapInstance, GsapTimeline } from './gsap-driver'
import { resolvePartMotion } from './resolve-motion'
import { playBlockReveal } from './play-reveal'
import { hidePartsForAnimate, revealUntouchedParts, untouchedParts } from './animate-guard'
import { autoRunEnd } from '../../components/DeckViewer/motion-helpers'
import { BUILT_IN_BLOCKS } from '../library'
import { tplCtx } from '../library/composite/showcase-test'

// --- helpers -------------------------------------------------------------------

function recorder() {
  const plays: Array<{ target: Element; keyframes: MotionKeyframes; opts: MotionOptions }> = []
  const sets: Array<{ target: Element; state: MotionState }> = []
  const driver: MotionDriver = {
    play(target, keyframes, opts) {
      plays.push({ target, keyframes, opts })
      return { cancel() {}, finished: Promise.resolve() }
    },
    set(target, state) {
      sets.push({ target, state })
    },
    timeline() {
      return { cancel() {}, finished: Promise.resolve() }
    },
    cancelAll() {},
  }
  return { driver, plays, sets }
}

// Quoted string literals only (comments write `inset(…)` in backticks).
const INSET_LITERAL = /['"]inset\(([^)'"]*)\)['"]/g

function insetTermsOk(body: string): boolean {
  const t = body.trim().split(/\s+/)
  return t.length === 4 && t.every((x) => /^-?[\d.]+(%|px|em|rem)$/.test(x))
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) sourceFiles(p, out)
    else if (/\.tsx?$/.test(e.name) && !/\.spec\.tsx?$/.test(e.name)) out.push(p)
  }
  return out
}

// --- S16 -----------------------------------------------------------------------

describe('S16 — clip-path tweens pair equal terms', () => {
  it('pairClipPath writes both insets as four terms with matching units', () => {
    expect(pairClipPath('inset(0 100% 0 0)', 'inset(0)')).toEqual(['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)'])
    expect(pairClipPath('inset(100% 0 0 0)', 'inset(0 0 0 0)')).toEqual(['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'])
    expect(pairClipPath('inset(0 20px)', 'inset(0)')).toEqual(['inset(0% 20px 0% 20px)', 'inset(0% 0px 0% 0px)'])
    // not two insets: unchanged
    expect(pairClipPath('circle(0% at 50% 50%)', 'circle(100% at 50% 50%)')).toEqual(['circle(0% at 50% 50%)', 'circle(100% at 50% 50%)'])
    expect(normalizeClipPath('inset(0)')).toBe('inset(0% 0% 0% 0%)')
  })

  it('every preset clip pair is already paired', () => {
    for (const id of PRESET_IDS) {
      const cp = MOTION_PRESETS[id].keyframes.clipPath
      if (!cp) continue
      expect([id, pairClipPath(cp[0], cp[cp.length - 1])]).toEqual([id, [cp[0], cp[cp.length - 1]]])
    }
  })

  it('every inset() literal in blocks/ and components/ has four unit terms', () => {
    const root = path.join(__dirname, '..', '..')
    const bad: string[] = []
    for (const f of [...sourceFiles(path.join(root, 'blocks')), ...sourceFiles(path.join(root, 'components'))]) {
      if (f.endsWith('clip-path.ts')) continue
      const src = fs.readFileSync(f, 'utf8')
      for (const m of src.matchAll(INSET_LITERAL)) if (!insetTermsOk(m[1])) bad.push(`${path.relative(root, f)}: inset(${m[1]})`)
    }
    expect(bad).toEqual([])
  })
})

// --- GSAP driver: S8 / S14 / S16 ---------------------------------------------------

function stubGsap() {
  const calls: Array<{ target: unknown; from: Record<string, unknown>; to: Record<string, unknown> }> = []
  const kills: Array<{ target: unknown; props?: string }> = []
  const tween = { kill: jest.fn(), then: (cb?: () => void) => (cb && cb(), Promise.resolve()) }
  const gsap: GsapInstance = {
    fromTo(target, from, to) {
      calls.push({ target, from, to })
      return tween
    },
    timeline() {
      const tl: GsapTimeline = {
        fromTo(target, from, to) {
          calls.push({ target, from, to })
          return tl
        },
        play() {},
        pause() {},
        kill() {},
        then: () => Promise.resolve(),
        duration: () => 0,
      }
      return tl
    },
    killTweensOf(target, props) {
      kills.push({ target, props })
    },
  }
  return { gsap, calls, kills }
}

describe('GSAP driver', () => {
  it('S8: set() first kills older tweens of the same properties on the target', () => {
    const { gsap, kills, calls } = stubGsap()
    const el = document.createElement('div')
    createGsapDriver(gsap).set(el, { opacity: 0, translate: '0px 24px' })
    expect(kills).toEqual([{ target: el, props: 'opacity,x,y' }])
    expect(calls[0].to).toMatchObject({ opacity: 0, x: 0, y: 24, duration: 0, overwrite: 'auto' })
  })

  it('S14: one-axis scale and the origin reach GSAP', () => {
    const { gsap, calls } = stubGsap()
    const el = document.createElement('div')
    createGsapDriver(gsap).play(el, { scaleY: [0, 1] }, { duration: 400, origin: '50% 100%' })
    expect(calls[0].from).toMatchObject({ scaleY: 0, transformOrigin: '50% 100%' })
    expect(calls[0].to).toMatchObject({ scaleY: 1, transformOrigin: '50% 100%' })
  })

  it('S16: set() writes an inset as four terms', () => {
    const { gsap, calls } = stubGsap()
    createGsapDriver(gsap).set(document.createElement('div'), { clipPath: 'inset(0)' })
    expect(calls[0].to).toMatchObject({ clipPath: 'inset(0% 0% 0% 0%)' })
  })
})

// --- S14: presets, recipe parts, draw-on ------------------------------------------------

describe('S14 — grow from the baseline, draw strokes on', () => {
  it('grow presets scale one axis about their baseline', () => {
    expect(MOTION_PRESETS['grow-bars-y'].keyframes).toEqual({ scaleY: [0, 1] })
    expect(MOTION_PRESETS['grow-bars-y'].origin).toBe('50% 100%')
    expect(MOTION_PRESETS['grow-bars-x'].keyframes).toEqual({ scaleX: [0, 1] })
    expect(MOTION_PRESETS['grow-bars-x'].origin).toBe('0% 50%')
    expect(MOTION_PRESETS['grow-segments'].keyframes).toEqual({ scaleY: [0, 1] })
    expect(MOTION_PRESETS['grow-segments'].origin).toBe('50% 100%')
  })

  const recipe = {
    parts: ['bar', 'label'],
    preset: 'fade' as const,
    expressive: 'fade-up' as const,
    partMotion: { bar: { preset: 'grow-bars-x' as const, origin: '100% 50%' } },
  }

  it('a recipe part preset and origin apply when the block plays its showy preset', () => {
    const [bar, label] = resolvePartMotion({ preset: 'fade-up' }, recipe)
    expect(bar.presetId).toBe('grow-bars-x')
    expect(bar.keyframes).toEqual({ scaleX: [0, 1] })
    expect(bar.origin).toBe('100% 50%')
    expect(label.presetId).toBe('fade-up')
    expect(label.origin).toBeUndefined()
  })

  it('…and never under a spec-supplied fade (subtle) or a swapped preset', () => {
    for (const preset of ['fade', 'pop'] as const) {
      const [bar] = resolvePartMotion({ preset }, recipe)
      expect([preset, bar.presetId]).toEqual([preset, preset])
    }
    // a spec part override still wins
    const [bar] = resolvePartMotion({ preset: 'fade-up', parts: { bar: { preset: 'fade' } } }, recipe)
    expect(bar.presetId).toBe('fade')
  })

  const def = (preset: string, parts: string[]): BlockDefinition =>
    ({ type: 'test.m1', motion: { parts, preset } } as unknown as BlockDefinition)
  const spec = (preset: string): BlockSpec => ({ id: 'b', type: 'test.m1', props: {}, motion: { preset } } as BlockSpec)

  it('playBlockReveal passes the preset origin with a grow', () => {
    const el = document.createElement('div')
    el.innerHTML = '<div data-part="bar/0"></div><div data-part="bar/1"></div>'
    const { driver, plays, sets } = recorder()
    playBlockReveal(el, spec('grow-bars-y'), def('grow-bars-y', ['bar']), { driver, reducedMotion: false })
    const bars = plays.filter((p) => p.target !== el)
    expect(bars).toHaveLength(2)
    for (const b of bars) {
      expect(b.keyframes).toEqual({ scaleY: [0, 1] })
      expect(b.opts.origin).toBe('50% 100%')
    }
    expect(sets.filter((s) => s.target !== el).map((s) => s.state)).toEqual([{ scaleY: 0 }, { scaleY: 0 }])
  })

  it('draw-path draws a stroked path on with its real length', () => {
    const el = document.createElement('div')
    el.innerHTML = '<svg data-part="line"><path d="M0 0 L120 0" style="stroke: red; fill: none"></path></svg>'
    const p = el.querySelector('path') as unknown as SVGPathElement & { getTotalLength(): number }
    p.getTotalLength = () => 120
    const real = window.getComputedStyle
    const spy = jest.spyOn(window, 'getComputedStyle').mockImplementation((node: Element) => {
      if (node === (p as unknown as Element)) return { stroke: 'red', strokeWidth: '2', fill: 'none', fillOpacity: '1', strokeDasharray: 'none' } as CSSStyleDeclaration
      return real(node)
    })
    try {
      const { driver, plays, sets } = recorder()
      playBlockReveal(el, spec('draw-path'), def('draw-path', ['line']), { driver, reducedMotion: false })
      expect(p.style.strokeDasharray).toBe('120 120')
      expect(sets.find((s) => s.target === (p as unknown as Element))!.state).toEqual({ strokeDashoffset: '120' })
      expect(plays.find((x) => x.target === (p as unknown as Element))!.keyframes).toEqual({ strokeDashoffset: ['120', '0'] })
    } finally {
      spy.mockRestore()
    }
  })

  it('a draw preset on a part with no stroke wipes it in with an equal-term clip', () => {
    const el = document.createElement('div')
    el.innerHTML = '<div data-part="arc"></div>'
    const { driver, plays } = recorder()
    playBlockReveal(el, spec('sweep'), def('sweep', ['arc']), { driver, reducedMotion: false })
    const arc = plays.find((x) => x.target === el.querySelector('[data-part="arc"]'))!
    expect(arc.keyframes).toEqual({ clipPath: ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)'] })
  })
})

// --- S26 ---------------------------------------------------------------------------

/** A GSAP fake that applies each tween's end opacity at once and runs completion callbacks. */
function applyingGsap() {
  const targetsOf = (t: unknown): HTMLElement[] =>
    t instanceof Element ? [t as HTMLElement] : t && typeof (t as ArrayLike<unknown>).length === 'number' ? (Array.from(t as ArrayLike<unknown>).filter((x) => x instanceof Element) as HTMLElement[]) : []
  const apply = (t: unknown, vars?: Record<string, unknown>) => {
    if (!vars) return
    for (const el of targetsOf(t)) if (vars.opacity !== undefined) el.style.opacity = String(vars.opacity)
    try {
      ;(vars.onUpdate as (() => void) | undefined)?.()
      ;(vars.onComplete as (() => void) | undefined)?.()
    } catch {
      /* a callback reading a proxy the fake does not model */
    }
  }
  const timeline = (tlVars?: Record<string, unknown>) => {
    const tl: Record<string, unknown> = {}
    Object.assign(tl, {
      to: (t: unknown, v: Record<string, unknown>) => (apply(t, v), tl),
      from: (t: unknown) => (apply(t, { opacity: 1 }), tl),
      fromTo: (t: unknown, _f: unknown, v: Record<string, unknown>) => (apply(t, v), tl),
      set: (t: unknown, v: Record<string, unknown>) => (apply(t, v), tl),
      call: (fn: () => void) => (fn(), tl),
      add: () => tl,
      play: () => tl,
      pause: () => tl,
      kill: () => undefined,
      eventCallback: () => tl,
      duration: () => 0,
      then: (cb?: () => void) => (cb && cb(), Promise.resolve()),
    })
    Promise.resolve().then(() => (tlVars?.onComplete as (() => void) | undefined)?.())
    return tl
  }
  return {
    timeline,
    to: (t: unknown, v: Record<string, unknown>) => (apply(t, v), { kill() {} }),
    fromTo: (t: unknown, _f: unknown, v: Record<string, unknown>) => (apply(t, v), { kill() {} }),
    set: (t: unknown, v: Record<string, unknown>) => apply(t, v),
    killTweensOf: () => undefined,
  }
}

function applyingDriver(): MotionDriver {
  return {
    play(target, keyframes) {
      const op = keyframes.opacity
      if (op && op.length) (target as HTMLElement).style.opacity = String(op[op.length - 1])
      return { cancel() {}, finished: Promise.resolve() }
    },
    set(target, state) {
      if (state.opacity !== undefined) (target as HTMLElement).style.opacity = String(state.opacity)
    },
    timeline() {
      return { cancel() {}, finished: Promise.resolve() }
    },
    cancelAll() {},
  }
}

describe('S26 — parts hidden before animate() always end visible', () => {
  it('revealUntouchedParts fades in only the parts animate() never touched', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    root.innerHTML = '<div data-part="quote"><span data-part="word/0"></span></div><div data-part="name"></div>'
    const hidden = hidePartsForAnimate(root)
    expect(hidden.map((p) => p.style.opacity)).toEqual(['0', '0', '0'])
    // an animate() that only tweens the word and the name
    ;(root.querySelector('[data-part="word/0"]') as HTMLElement).style.opacity = '1'
    ;(root.querySelector('[data-part="name"]') as HTMLElement).style.opacity = '1'
    const { driver, plays } = recorder()
    const revealed = revealUntouchedParts(hidden, driver)
    expect(revealed.map((p) => p.getAttribute('data-part'))).toEqual(['quote'])
    expect(plays[0].keyframes).toEqual({ opacity: [0, 1] })
    root.remove()
  })

  const htmlBlocks = BUILT_IN_BLOCKS.filter((d) => d.kind === 'html' && d.html?.animate)

  it('there are html blocks with animate() to check', () => {
    expect(htmlBlocks.length).toBeGreaterThan(0)
  })

  for (const def of htmlBlocks) {
    for (const withGsap of [true, false]) {
      it(`${def.type} reveals every part it was handed hidden (${withGsap ? 'gsap' : 'driver'} path)`, async () => {
        const root = document.createElement('div')
        document.body.appendChild(root)
        const props = JSON.parse(JSON.stringify(def.describe?.example?.props ?? def.defaults ?? {}))
        root.innerHTML = def.html!.template(props, tplCtx())
        const hidden = hidePartsForAnimate(root)
        let done = false
        const rt: BlockMotionRuntime = {
          driver: applyingDriver(),
          ...(withGsap ? { gsap: applyingGsap() } : {}),
          timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'ease-out' },
          reducedMotion: false,
          style: 'expressive',
          onComplete: () => {
            done = true
          },
        }
        const dispose = def.html!.animate!(root, rt)
        for (let i = 0; i < 5 && !done; i++) await Promise.resolve()
        const left = untouchedParts(hidden).map((p) => p.getAttribute('data-part'))
        expect([def.type, left]).toEqual([def.type, []])
        if (typeof dispose === 'function') dispose()
        root.remove()
      })
    }
  }
})

// --- J7 ----------------------------------------------------------------------------

describe('J7 — reduced motion shows an auto chain at once', () => {
  it('autoRunEnd extends through consecutive auto steps only', () => {
    const steps = [{ auto: true }, { auto: true }, { auto: false }, { auto: true }]
    expect(autoRunEnd(steps, 0)).toBe(2)
    expect(autoRunEnd(steps, 2)).toBe(2)
    expect(autoRunEnd(steps, 3)).toBe(4)
    expect(autoRunEnd([], 0)).toBe(0)
  })
})
