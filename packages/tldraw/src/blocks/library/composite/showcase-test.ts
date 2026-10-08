/**
 * P7 — the test suite every showcase html block runs (not a spec itself; imported by the
 * block specs). Adds to `standardBlockSuite` (which includes the DOM/SVG parity probe):
 * template escaping, template/poster part parity, and the `animate()` contract on all paths
 * (reduced motion, subtle, expressive with the driver, expressive with a GSAP-like object).
 */

import type { BlockDefinition, BlockMotionRuntime, HtmlTemplateContext, LayoutNode } from '../../types'
import type { MotionDriver, MotionKeyframes, MotionOptions, MotionState } from '../../motion/driver'
import { standardBlockSuite, TEST_TOKENS } from '../text/standard-suite'
import { makeCtx } from '../layout/test-helpers'

export function tplCtx(width = 1728, height = 888): HtmlTemplateContext {
  return {
    esc: (s: string) =>
      String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    cssVar: (role: string) => `var(--tls-${role})`,
    box: { x: 0, y: 0, width, height },
    tokens: TEST_TOKENS,
  }
}

export function recordingDriver() {
  const plays: Array<{ target: Element; keyframes: MotionKeyframes; opts: MotionOptions }> = []
  const sets: Array<{ target: Element; state: MotionState }> = []
  const cancelled: number[] = []
  const driver: MotionDriver = {
    play(target, keyframes, opts) {
      plays.push({ target, keyframes, opts })
      if (opts.onUpdate) opts.onUpdate(1)
      const i = plays.length
      return { cancel: () => cancelled.push(i), finished: Promise.resolve() }
    },
    set(target, state) {
      sets.push({ target, state })
    },
    timeline() {
      return { cancel() {}, finished: Promise.resolve() }
    },
    cancelAll() {},
  }
  return { driver, plays, sets, cancelled }
}

/** A GSAP-shaped fake: records tweens, lets the test fire the timeline's onComplete. */
export function fakeGsap() {
  const tweens: Array<{ op: string; target: unknown; vars: unknown[] }> = []
  let onComplete: (() => void) | undefined
  let killed = 0
  const tl = {
    to: (target: unknown, ...vars: unknown[]) => (tweens.push({ op: 'to', target, vars }), tl),
    fromTo: (target: unknown, ...vars: unknown[]) => (tweens.push({ op: 'fromTo', target, vars }), tl),
    set: (target: unknown, ...vars: unknown[]) => (tweens.push({ op: 'set', target, vars }), tl),
    kill: () => {
      killed++
    },
  }
  const gsap = {
    timeline(vars?: Record<string, unknown>) {
      onComplete = vars?.onComplete as (() => void) | undefined
      return tl
    },
  }
  return {
    gsap,
    tweens,
    fire: () => onComplete?.(),
    killed: () => killed,
  }
}

function rt(driver: MotionDriver, extra: Partial<BlockMotionRuntime>, onComplete: () => void): BlockMotionRuntime {
  return {
    driver,
    timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'ease-out' },
    reducedMotion: false,
    onComplete,
    ...extra,
  }
}

function partsOf(node: LayoutNode, out = new Set<string>()): Set<string> {
  if (node.part && node.part !== 'root') out.add(node.part.replace(/\[\d+\]$/, ''))
  if (node.k === 'group') node.children.forEach((c) => partsOf(c, out))
  return out
}

const flush = () => new Promise((r) => setTimeout(r, 0))

export interface ShowcaseOpts {
  /** A text prop that is rendered verbatim (used for the escaping test). */
  textProp: string
  /** Extra props merged into defaults for the escaping test (e.g. a list item's field). */
  escapeProps?: (hostile: string) => Record<string, unknown>
  /** Forwarded to standardBlockSuite. */
  overflowProps?: Record<string, unknown>
  noCapacity?: boolean
}

export function showcaseSuite(def: BlockDefinition, opts: ShowcaseOpts): void {
  standardBlockSuite(def, { noCapacity: opts.noCapacity, overflowProps: opts.overflowProps })

  const template = def.html!.template
  const animate = def.html!.animate!
  const mount = (props = def.defaults as Record<string, unknown>) => {
    const host = document.createElement('div')
    host.innerHTML = template(props as any, tplCtx(def.size.preferred[0], def.size.preferred[1]))
    // the viewer hides every part before animate()
    host.querySelectorAll<HTMLElement>('[data-part]').forEach((p) => (p.style.opacity = '0'))
    return host
  }

  describe(`${def.type} — showcase html contract`, () => {
    it('escapes every user string in the template', () => {
      const hostile = '<img src=x onerror=alert(1)>'
      const props = { ...(def.defaults as any), [opts.textProp]: hostile, ...(opts.escapeProps?.(hostile) ?? {}) }
      const html = template(props, tplCtx())
      expect(html).not.toContain('<img')
      expect(html).toContain('&lt;img')
    })

    it('template and poster declare the same part families', () => {
      const html = template(def.defaults as any, tplCtx(def.size.preferred[0], def.size.preferred[1]))
      const tpl = new Set(Array.from(html.matchAll(/data-part="([^"]+)"/g)).map((m) => m[1].replace(/\[\d+\]$/, '')))
      const pst = partsOf(def.poster!(def.defaults as any, makeCtx({ width: def.size.preferred[0], height: def.size.preferred[1] })))
      expect([...tpl].sort()).toEqual([...pst].sort())
      for (const p of def.motion.parts ?? []) expect(tpl.has(p.replace(/\[\*\]$/, ''))).toBe(true)
    })

    it('reduced motion: settles every part and completes once, at once', () => {
      const root = mount()
      const { driver, plays } = recordingDriver()
      const done = jest.fn()
      animate(root, rt(driver, { reducedMotion: true }, done))
      expect(done).toHaveBeenCalledTimes(1)
      expect(plays).toHaveLength(0)
      root.querySelectorAll<HTMLElement>('[data-part]').forEach((p) => expect(p.style.opacity).toBe(''))
    })

    it('subtle: one opacity-only fade per part, numbers already final, completes once', async () => {
      const root = mount()
      const before = root.textContent
      const { driver, plays } = recordingDriver()
      const done = jest.fn()
      animate(root, rt(driver, { style: 'subtle' }, done))
      const parts = root.querySelectorAll('[data-part]')
      expect(plays).toHaveLength(parts.length)
      for (const p of plays) expect(Object.keys(p.keyframes)).toEqual(['opacity'])
      expect(root.textContent).toBe(before)
      await flush()
      expect(done).toHaveBeenCalledTimes(1)
    })

    it('expressive without GSAP: driver choreography, never the root transform, completes once', async () => {
      const root = mount()
      const { driver, plays } = recordingDriver()
      const done = jest.fn()
      const dispose = animate(root, rt(driver, { style: 'expressive' }, done))
      // every part (or something inside it) gets its own choreography
      root.querySelectorAll('[data-part]').forEach((part) => {
        expect([part.getAttribute('data-part'), plays.some((p) => part === p.target || part.contains(p.target))]).toEqual([part.getAttribute('data-part'), true])
      })
      expect(plays.some((p) => p.keyframes.translate || p.keyframes.scale || p.keyframes.clipPath)).toBe(true)
      expect(plays.some((p) => p.target === root)).toBe(false)
      expect(root.style.transform).toBe('')
      await flush()
      expect(done).toHaveBeenCalledTimes(1)
      expect(typeof dispose).toBe('function')
    })

    it('missing style is treated as expressive (pre-P7 hosts)', () => {
      const root = mount()
      const { driver, plays } = recordingDriver()
      animate(root, rt(driver, {}, jest.fn()))
      expect(plays.some((p) => p.keyframes.translate || p.keyframes.scale || p.keyframes.clipPath)).toBe(true)
    })

    it('expressive with GSAP: one timeline, onComplete exactly once, disposer kills it', () => {
      const root = mount()
      const { driver, plays } = recordingDriver()
      const fake = fakeGsap()
      const done = jest.fn()
      const dispose = animate(root, rt(driver, { gsap: fake.gsap }, done)) as () => void
      expect(plays).toHaveLength(0)
      expect(fake.tweens.length).toBeGreaterThan(2)
      expect(fake.tweens.some((t) => t.target === root)).toBe(false)
      // A set() to opacity 1 at the start must not hit an element whose own fromTo hides it
      // first: the set would win at time 0 and show it early (seen in the browser).
      const els = (t: unknown): unknown[] => (Array.isArray(t) ? t : [t])
      const shown = fake.tweens.filter((t) => t.op === 'set' && (t.vars[0] as any)?.opacity === 1).flatMap((t) => els(t.target))
      const hidden = fake.tweens.filter((t) => t.op === 'fromTo' && (t.vars[0] as any)?.opacity === 0).flatMap((t) => els(t.target))
      expect(shown.filter((e) => hidden.includes(e))).toEqual([])
      expect(done).not.toHaveBeenCalled()
      fake.fire()
      fake.fire()
      expect(done).toHaveBeenCalledTimes(1)
      dispose()
      expect(fake.killed()).toBe(1)
    })

    it('recipe declares expressiveMs so chaining waits for the timeline', () => {
      expect(def.motion.expressiveMs).toBeGreaterThan(1000)
    })
  })
}
