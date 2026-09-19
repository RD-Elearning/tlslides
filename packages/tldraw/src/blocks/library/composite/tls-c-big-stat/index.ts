/**
 * tls.c.big-stat — one enormous headline number with a label and context
 * line (kind: 'html').
 *
 * A block author writes an HTML template plus a schema and a short description,
 * and gets a block that the editor and the viewer render as real DOM, the SVG
 * path renders as a still (via poster), the digest describes, and
 * validateDeckSpec checks.
 *
 * The `layout()` function is auto-generated: it returns a single host node
 * filling the box with `render: def.type` and `poster: def.poster(props, ctx)`.
 * The host renderer is derived from the `html` object.
 *
 * Signature motion: count-up with easing; the label slides in from under the
 * number. When `rt.gsap` is present, uses a GSAP timeline. Otherwise falls
 * back to the motion driver with `onUpdate(progress)` for the count-up — never
 * writing intermediate values back into props.
 */

import type { BlockDefinition, LayoutContext, LayoutNode, BlockMotionRuntime } from '../../../types'
import { schema, defaults } from './schema'
import { poster } from './poster'
import { template } from './template'
import { motion } from './motion'
import { createLayoutContext } from '../../../layout/layout-child'
import { resolveTokens } from '../../../tokens'
import { BUILT_IN_DECK_THEMES } from '../../../../state/shapes/shared/deck-theme'

/** Summary for the AI: what this block is and when to use it. */
const BIG_STAT_SUMMARY =
  'Big number slide. One enormous headline metric with a short label ' +
  'and optional context line. Use for KPIs, milestones, and hero stats.'

/**
 * Auto-generated `layout()` for `kind: 'html'` blocks. Returns a single host
 * node filling the box. The poster supplies geometry for the compiler and SVG
 * export; the host renderer supplies the live DOM.
 */
function bigStatLayout(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as import('./schema').BigStatProps
  const posterNode = poster(p, ctx)
  return {
    k: 'host',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'root',
    render: 'tls.c.big-stat',
    poster: posterNode,
  } as LayoutNode
}

/**
 * Derive `size.preferred` from the poster of the defaults. Builds a reference
 * LayoutContext at 1920-wide with the default theme's tokens and calls poster()
 * to get the real intrinsic height.
 */
function derivePreferredSize(): [number, number] {
  const REFERENCE_WIDTH = 1920
  const REFERENCE_HEIGHT = 1080
  const theme = BUILT_IN_DECK_THEMES[0]
  const tokens = resolveTokens(theme)
  const ctx = createLayoutContext({
    box: { width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT },
    tokens,
    surface: { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false },
  })
  const posterNode = poster(defaults, ctx)
  return [REFERENCE_WIDTH, posterNode.box.height]
}

/**
 * Big-stat animation: count-up with easing on the value, label slides in from
 * under the number, context fades in.
 *
 * - When GSAP is present: use a GSAP timeline (numeric tween writing
 *   textContent for the count-up, plus a y/opacity tween for the label).
 * - Otherwise: fall back to the motion driver and implement count-up through
 *   `onUpdate(progress)` — never a layout change and never writing intermediate
 *   values back into props.
 * - `reducedMotion` → skip animation, show final formatted number, call
 *   `onComplete()` immediately.
 *
 * The driver keeps refusing forbidden properties on any element it is handed;
 * animate() may do anything to descendants of root and nothing to
 * root.style.transform.
 */
function bigStatAnimate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  const valueEl = root.querySelector<HTMLElement>('[data-part="value"]')
  const labelEl = root.querySelector<HTMLElement>('[data-part="label"]')
  const contextEl = root.querySelector<HTMLElement>('[data-part="context"]')

  // No elements found — nothing to animate
  if (!valueEl) {
    rt.onComplete()
    return
  }

  // Reduced motion: show final formatted number immediately, call onComplete
  if (rt.reducedMotion) {
    rt.onComplete()
    return
  }

  // Read the final formatted text from the already-rendered DOM element.
  // The template/poster already wrote the correct formatted value; we just
  // need to animate from 0 to it.
  const targetText = valueEl.textContent ?? '0'
  const targetValue = parseFloat(targetText.replace(/[^0-9.-]/g, '')) || 0
  const isInteger = Number.isInteger(targetValue)
  const prefix = targetText.match(/^[^0-9.-]*/)?.[0] ?? ''
  const suffix = targetText.match(/[^0-9.]*$/)?.[0] ?? ''

  /** Write the intermediate count-up value to textContent. */
  const writeCountUp = (progress: number) => {
    const current = targetValue * progress
    valueEl.textContent =
      prefix +
      (isInteger ? Math.round(current).toString() : current.toFixed(1)) +
      suffix
  }

  // If the host provided GSAP, use a GSAP timeline
  if (rt.gsap && typeof rt.gsap === 'object' && rt.gsap !== null) {
    const gsap = rt.gsap as {
      timeline(): {
        fromTo(target: unknown, from: unknown, to: unknown, position?: number | string): unknown
        then(cb?: () => void): Promise<void>
        kill(): void
      }
    }

    const tl = gsap.timeline()
    const durationSec = rt.timing.durationMs / 1000

    // Count-up: tween the value from 0 to target using onUpdate
    // GSAP's timeline().fromTo on a proxy object driving onUpdate
    const proxy = { progress: 0 }
    tl.fromTo(proxy,
      { progress: 0 },
      {
        progress: 1,
        duration: durationSec,
        ease: 'power3.out',
        onUpdate: () => {
          writeCountUp(proxy.progress)
        },
      }
    )

    // Label slides in from below with opacity
    if (labelEl) {
      tl.fromTo(labelEl,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: durationSec * 0.6, ease: 'power3.out' },
        0.15, // start slightly after the count-up begins
      )
    }

    // Context fades in
    if (contextEl) {
      tl.fromTo(contextEl,
        { opacity: 0 },
        { opacity: 1, duration: durationSec * 0.4, ease: 'power2.out' },
        0.35,
      )
    }

    let resolved = false
    tl.then(() => {
      if (!resolved) { resolved = true; rt.onComplete() }
    })

    return () => { tl.kill() }
  }

  // Fallback: use the motion driver's play() with onUpdate for count-up
  const handles: Array<{ cancel(): void; finished: Promise<void> }> = []

  // Count-up via the driver's onUpdate callback
  const valueHandle = rt.driver.play(
    valueEl,
    { opacity: [0, 1] },
    {
      duration: rt.timing.durationMs,
      delay: rt.timing.delayMs,
      easing: rt.timing.ease,
      fill: 'forwards',
      onUpdate: (progress: number) => {
        writeCountUp(progress)
      },
    }
  )
  handles.push(valueHandle)

  // Label slides in from below
  if (labelEl) {
    const labelHandle = rt.driver.play(
      labelEl,
      { opacity: [0, 1], translate: ['0px 16px', '0px 0px'] },
      {
        duration: rt.timing.durationMs * 0.6,
        delay: rt.timing.delayMs + rt.timing.durationMs * 0.15,
        easing: rt.timing.ease,
        fill: 'forwards',
      }
    )
    handles.push(labelHandle)
  }

  // Context fades in
  if (contextEl) {
    const ctxHandle = rt.driver.play(
      contextEl,
      { opacity: [0, 1] },
      {
        duration: rt.timing.durationMs * 0.4,
        delay: rt.timing.delayMs + rt.timing.durationMs * 0.35,
        easing: rt.timing.ease,
        fill: 'forwards',
      }
    )
    handles.push(ctxHandle)
  }

  Promise.all(handles.map((h) => h.finished)).then(() => rt.onComplete())

  return () => { handles.forEach((h) => h.cancel()) }
}

export const tlsCBigStat: BlockDefinition = {
  type: 'tls.c.big-stat',
  name: 'Big Stat',
  family: 'composite',
  tier: 'B',
  kind: 'html',
  summary: BIG_STAT_SUMMARY,
  keywords: ['stat', 'big', 'number', 'kpi', 'metric', 'hero', 'headline', 'count'],
  describe: {
    when: 'Use for a single hero statistic — one big number with a label and optional context.',
    avoid: 'Do not use for multiple metrics side by side — use tls.c.kpi-row instead.',
    example: {
      id: 'b_big_stat',
      type: 'tls.c.big-stat',
      props: {
        value: 4200000,
        label: 'Total Revenue',
        context: 'vs last quarter',
        format: 'compact',
        prefix: '$',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: derivePreferredSize(), min: [300, 200] },
  layout: bigStatLayout as BlockDefinition['layout'],
  poster,
  html: { template, animate: bigStatAnimate },
  motion,
}
