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
import { CHAIN_OVERLAP, presetToEffect, resolvePartMotion } from './resolve-motion'
import { countFormat, playBlockReveal, sectorClip } from './play-reveal'
import { DURATION_TOKENS, EASING_TOKENS } from './tokens'
import { AnimationEffect } from '~types'
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

// --- M1b ---------------------------------------------------------------------------

describe('M1b/E1 — chained presets chain', () => {
  it('quote-in: glyph pops, text staggers in, attribution fades — one step after another', () => {
    const recipe = { parts: ['glyph', 'text', 'attribution'], preset: 'quote-in' as const }
    const [glyph, text, attribution] = resolvePartMotion(undefined, recipe)
    expect([glyph.presetId, text.presetId, attribution.presetId]).toEqual(['pop', 'stagger-lines', 'fade'])
    const pop = Math.round(DURATION_TOKENS.fast * CHAIN_OVERLAP)
    const lines = Math.round(DURATION_TOKENS.verySlow * CHAIN_OVERLAP)
    expect([glyph.delayMs, text.delayMs, attribution.delayMs]).toEqual([0, pop, pop + lines])
    expect(glyph.keyframes).toEqual(MOTION_PRESETS.pop.keyframes)
  })

  it('parts past the end of the chain share the last step, one stagger apart', () => {
    const recipe = { parts: ['hub', 'spoke-a', 'spoke-b'], preset: 'radiate' as const }
    const [hub, a, b] = resolvePartMotion(undefined, recipe)
    expect([hub.presetId, a.presetId, b.presetId]).toEqual(['pop', 'stagger-children', 'stagger-children'])
    expect(b.delayMs - a.delayMs).toBe(DURATION_TOKENS.stagger)
    expect(a.staggerMs).toBe(DURATION_TOKENS.stagger)
  })

  it('a recipe part preset or a spec part override still wins over the chain', () => {
    const recipe = { parts: ['glyph', 'text'], preset: 'quote-in' as const, partMotion: { glyph: { preset: 'fade' as const } } }
    expect(resolvePartMotion(undefined, recipe).map((p) => p.presetId)).toEqual(['fade', 'stagger-lines'])
  })
})

describe('M1b/E2 — a part preset keeps its own easing', () => {
  it('a part playing pop bounces; the spec ease still wins', () => {
    const recipe = { parts: ['badge', 'label'], preset: 'fade-up' as const, partMotion: { badge: { preset: 'pop' as const } } }
    const [badge, label] = resolvePartMotion(undefined, recipe)
    expect(badge.easing).toBe(EASING_TOKENS.bounce)
    expect(label.easing).toBe(EASING_TOKENS.smoothOut)
    expect(resolvePartMotion({ preset: 'fade-up', ease: 'linear' }, recipe)[0].easing).toBe(EASING_TOKENS.linear)
  })

  it('draw presets ease out (J5)', () => {
    for (const id of ['draw-path', 'sweep']) expect([id, MOTION_PRESETS[id].easing]).toEqual([id, 'smoothOut'])
  })
})

describe('M1b/E7 — wipe-down', () => {
  it('is a clip-only top-down wipe with paired terms, a block-level wipe', () => {
    const cp = MOTION_PRESETS['wipe-down'].keyframes.clipPath!
    expect(cp).toEqual(['inset(0% 0% 100% 0%)', 'inset(0% 0% 0% 0%)'])
    expect(Object.keys(MOTION_PRESETS['wipe-down'].keyframes)).toEqual(['clipPath'])
    expect(presetToEffect('wipe-down')).toBe(AnimationEffect.Wipe)
  })
})

describe('M1b — count-up counts under GSAP', () => {
  it('onUpdate gets the eased ratio every frame and 1 at the end', async () => {
    let to: Record<string, unknown> = {}
    const tween = { ratio: 0.42, kill() {}, then: (cb?: () => void) => (Promise.resolve().then(() => cb && cb()), Promise.resolve()) }
    const gsap = {
      fromTo: (_t: unknown, _f: unknown, v: Record<string, unknown>) => ((to = v), tween),
      timeline: () => ({}) as GsapTimeline,
    } as unknown as GsapInstance
    const seen: number[] = []
    const h = createGsapDriver(gsap).play(document.createElement('div'), { opacity: [0, 1] }, { duration: 500, onUpdate: (p) => seen.push(p) })
    ;(to.onUpdate as () => void)()
    await h.finished
    expect(seen).toEqual([0.42, 1])
  })
})

describe('M1b — sweep from 12 o’clock, bars from the zero line', () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 }
  it('sectorClip: empty at 0, no clip at 1, a quarter passes 12 and 3 o’clock', () => {
    expect(sectorClip(100, 50, rect, 0)).toMatch(/^polygon\(50\.000% 50\.000%, 50\.000% -?[\d.]+%, 50\.000% -?[\d.]+%\)$/)
    expect(sectorClip(100, 50, rect, 1)).toBe('')
    const q = sectorClip(100, 50, rect, 0.25)
    const pts = q.slice(8, -1).split(', ')
    expect(pts.length).toBe(4) // centre, 12 o'clock, 1:30, 3 o'clock
    expect(parseFloat(pts[pts.length - 1].split(' ')[1])).toBeCloseTo(50, 3) // ends level with the centre
  })

  it('a filled sweep part is clipped to an empty sector and opened by a proxy tween', () => {
    const el = document.createElement('div')
    el.innerHTML = '<div data-part="slice/0"></div><div data-part="slice/1"></div>'
    const parts = Array.from(el.querySelectorAll<HTMLElement>('[data-part]'))
    for (const p of parts) p.getBoundingClientRect = () => ({ left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0, toJSON() {} })
    const { driver, plays, sets } = recorder()
    const def = { type: 'test.m1b', motion: { parts: ['slice'], preset: 'sweep' } } as unknown as BlockDefinition
    playBlockReveal(el, { id: 'b', type: 'test.m1b', props: {}, motion: { preset: 'sweep' } } as BlockSpec, def, { driver, reducedMotion: false })
    for (const p of parts) {
      expect(sets.find((x) => x.target === p)!.state.clipPath).toMatch(/^polygon\(50\.000% 50\.000%/)
    }
    const proxies = plays.filter((x) => x.opts.onUpdate && !parts.includes(x.target as HTMLElement) && x.target !== el)
    expect(proxies).toHaveLength(2)
    proxies[0].opts.onUpdate!(1)
    expect(parts[0].style.clipPath).toBe('')
  })

  it('a bar hanging below the zero line grows down from it', () => {
    const el = document.createElement('div')
    el.innerHTML = '<div data-part="bar/0"></div><div data-part="bar/1"></div><div data-part="bar/2"></div>'
    const geo = [
      { top: 20, height: 80 }, // positive: bottom at 100
      { top: 60, height: 40 }, // positive
      { top: 100, height: 30 }, // negative: top on the zero line
    ]
    Array.from(el.querySelectorAll<HTMLElement>('[data-part]')).forEach((b, i) => {
      Object.defineProperty(b, 'offsetTop', { value: geo[i].top })
      Object.defineProperty(b, 'offsetLeft', { value: i * 50 })
      Object.defineProperty(b, 'offsetHeight', { value: geo[i].height })
      Object.defineProperty(b, 'offsetWidth', { value: 40 })
      Object.defineProperty(b, 'offsetParent', { value: el })
    })
    const { driver, plays } = recorder()
    const def = { type: 'test.m1b', motion: { parts: ['bar'], preset: 'grow-bars-y' } } as unknown as BlockDefinition
    playBlockReveal(el, { id: 'b', type: 'test.m1b', props: {}, motion: { preset: 'grow-bars-y' } } as BlockSpec, def, { driver, reducedMotion: false })
    expect(plays.filter((p) => p.target !== el).map((p) => p.opts.origin)).toEqual(['50% 100%', '50% 100%', '50% 0%'])
  })
})

describe('M3 — charts: labels wait for their marks, grows follow the geometry, counts keep their format', () => {
  /** Bars laid out with explicit layout boxes (jsdom has no layout). */
  function bars(geo: Array<{ x: number; y: number; w: number; h: number }>) {
    const el = document.createElement('div')
    el.innerHTML = geo.map((_, i) => `<div data-part="bar[${i}]"></div>`).join('')
    Array.from(el.querySelectorAll<HTMLElement>('[data-part]')).forEach((b, i) => {
      Object.defineProperty(b, 'offsetTop', { value: geo[i].y })
      Object.defineProperty(b, 'offsetLeft', { value: geo[i].x })
      Object.defineProperty(b, 'offsetHeight', { value: geo[i].h })
      Object.defineProperty(b, 'offsetWidth', { value: geo[i].w })
      Object.defineProperty(b, 'offsetParent', { value: el })
    })
    return el
  }
  const grow = (el: HTMLElement, preset: string) => {
    const { driver, plays } = recorder()
    const def = { type: 'test.m3', motion: { parts: ['bar[*]'], preset } } as unknown as BlockDefinition
    playBlockReveal(el, { id: 'b', type: 'test.m3', props: {}, motion: { preset } } as BlockSpec, def, { driver, reducedMotion: false })
    return plays.filter((p) => p.target !== el)
  }

  it('a recipe part delay replaces its index stagger; its own stagger paces its elements', () => {
    const recipe = {
      parts: ['bar[*]', 'value[*]'],
      preset: 'stagger-children',
      partMotion: { 'bar[*]': { preset: 'grow-bars-y', stagger: 60 }, 'value[*]': { preset: 'fade', delay: 300, stagger: 60 } },
    } as const
    const [bar, value] = resolvePartMotion({ preset: 'stagger-children' }, recipe as never)
    expect([bar.delayMs, bar.staggerMs]).toEqual([0, 60])
    expect([value.delayMs, value.staggerMs]).toEqual([300, 60])
    // a spec delay shifts both; a spec part override still wins (its delay + the index stagger, as before)
    const shifted = resolvePartMotion({ preset: 'stagger-children', delay: 100, parts: { 'value[*]': { delay: 50 } } }, recipe as never)
    expect(shifted.map((p) => p.delayMs)).toEqual([100, 50 + 40])
    // under subtle (a spec fade) the recipe's parts play the fade, no delays of their own
    expect(resolvePartMotion({ preset: 'fade' }, recipe as never).map((p) => [p.presetId, p.delayMs])).toEqual([
      ['fade', 0],
      ['fade', 0],
    ])
  })

  it('a vertical grow on bars that share one height grows them along x, from their left edge', () => {
    const plays = grow(bars([{ x: 0, y: 0, w: 300, h: 20 }, { x: 0, y: 40, w: 180, h: 20 }, { x: 0, y: 80, w: 90, h: 20 }]), 'grow-bars-y')
    expect(plays.map((p) => Object.keys(p.keyframes))).toEqual([['scaleX'], ['scaleX'], ['scaleX']])
    expect(plays.map((p) => p.opts.origin)).toEqual(['0% 50%', '0% 50%', '0% 50%'])
  })

  it('columns that share one width keep the vertical grow from the baseline', () => {
    const plays = grow(bars([{ x: 0, y: 20, w: 40, h: 80 }, { x: 50, y: 60, w: 40, h: 40 }]), 'grow-bars-y')
    expect(plays.map((p) => Object.keys(p.keyframes))).toEqual([['scaleY'], ['scaleY']])
    expect(plays.map((p) => p.opts.origin)).toEqual(['50% 100%', '50% 100%'])
  })

  it('waterfall: a step down hangs from the level before it, a step up grows from it', () => {
    // start 100 (0..100 on a zero line at y=100), +30 (floats 70..40), -15 (hangs 40..55), total 115
    const plays = grow(
      bars([
        { x: 0, y: 0, w: 40, h: 100 },
        { x: 50, y: -30, w: 40, h: 30 },
        { x: 100, y: -30, w: 40, h: 15 },
        { x: 150, y: -15, w: 40, h: 115 },
      ]),
      'grow-bars-y'
    )
    expect(plays.map((p) => p.opts.origin)).toEqual(['50% 100%', '50% 100%', '50% 0%', '50% 100%'])
  })

  it('stacked segments grow about the zero line, one column at a time (no gap opens in a stack)', () => {
    // column 0: a base segment 50..100 and a top segment 20..50; column 1: one segment 30..100
    const plays = grow(bars([{ x: 0, y: 50, w: 40, h: 50 }, { x: 50, y: 30, w: 40, h: 70 }, { x: 0, y: 20, w: 40, h: 30 }]), 'grow-segments')
    expect(plays.map((p) => p.opts.origin)).toEqual(['50% 100%', '50% 100%', '50% 266.67%'])
    expect(plays.map((p) => Object.keys(p.keyframes))).toEqual([['scaleY'], ['scaleY'], ['scaleY']])
    const stagger = MOTION_PRESETS['grow-segments'].staggerMs!
    expect(plays.map((p) => p.opts.delay)).toEqual([0, stagger, 0])
  })

  it('a horizontal stack grows from its left zero line, one row at a time', () => {
    const plays = grow(bars([{ x: 0, y: 0, w: 60, h: 20 }, { x: 60, y: 0, w: 30, h: 20 }, { x: 0, y: 40, w: 80, h: 20 }]), 'grow-segments')
    expect(plays.map((p) => Object.keys(p.keyframes))).toEqual([['scaleX'], ['scaleX'], ['scaleX']])
    expect(plays.map((p) => p.opts.origin)).toEqual(['0% 50%', '-200% 50%', '0% 50%'])
  })

  it('countFormat keeps the prefix, suffix, grouping and decimals of the target', () => {
    expect(countFormat('1,250')(0.5)).toBe('625')
    expect(countFormat('1,250')(0.9)).toBe('1,125')
    expect(countFormat('$4.2M')(0.5)).toBe('$2.1M')
    expect(countFormat('$4.25M')(0)).toBe('$0.00M')
    expect(countFormat('+30%')(0.5)).toBe('+15%')
    expect(countFormat('-3.2%')(0.5)).toBe('-1.6%')
    expect(countFormat('12,5 %')(1)).toBe('12,5 %')
    expect(countFormat('1.250.000 đ')(0.5)).toBe('625.000 đ')
    expect(countFormat('n/a')(0.5)).toBe('n/a')
  })

  it('count-up counts on tabular figures and ends on the exact text with the authored style', () => {
    const el = document.createElement('div')
    el.innerHTML = '<div data-part="value"><div>1,250</div></div>'
    const line = el.querySelector('[data-part="value"] > div') as HTMLElement
    const { driver, plays } = recorder()
    const def = { type: 'test.m3', motion: { parts: ['value'], preset: 'count-up' } } as unknown as BlockDefinition
    playBlockReveal(el, { id: 'b', type: 'test.m3', props: {}, motion: { preset: 'count-up' } } as BlockSpec, def, { driver, reducedMotion: false })
    const counter = plays.find((p) => p.opts.onUpdate)!
    counter.opts.onUpdate!(0.5)
    expect(line.textContent).toBe('625')
    expect(line.style.fontVariantNumeric).toBe('tabular-nums')
    counter.opts.onUpdate!(1)
    expect(line.textContent).toBe('1,250')
    expect(line.style.fontVariantNumeric).toBe('')
  })
})

describe('M3 — every entrance preset ends at rest (J3)', () => {
  it('no non-ambient preset ends off its rest state', () => {
    for (const id of PRESET_IDS) {
      const p = MOTION_PRESETS[id]
      if (p.isAmbient) continue
      const kf = p.keyframes
      const last = <T,>(a?: T[]) => (a ? a[a.length - 1] : undefined)
      if (kf.opacity) expect([id, last(kf.opacity)]).toEqual([id, 1])
      if (kf.translate) expect([id, String(last(kf.translate)).trim().split(/\s+/).every((t) => parseFloat(t) === 0)]).toEqual([id, true])
      if (kf.scale) expect([id, last(kf.scale)]).toEqual([id, 1])
      if (kf.scaleX) expect([id, last(kf.scaleX)]).toEqual([id, 1])
      if (kf.scaleY) expect([id, last(kf.scaleY)]).toEqual([id, 1])
    }
  })
})

describe('M3 — split-in: a pair enters from both sides and settles at rest', () => {
  it('the first part slides in from the left, the second from the right, both end at 0', () => {
    const recipe = { parts: ['left', 'right', 'third'], preset: 'split-in' }
    const [l, r, t] = resolvePartMotion({ preset: 'split-in' }, recipe as never)
    expect(l.keyframes.translate).toEqual([`-${24}px 0`, '0 0'])
    expect(r.keyframes.translate).toEqual([`${24}px 0`, '0 0'])
    expect(t.keyframes.translate).toEqual([`-${24}px 0`, '0 0'])
    expect(MOTION_PRESETS['split-in'].keyframes.translate).toEqual(['-24px 0', '0 0'])
  })
})
