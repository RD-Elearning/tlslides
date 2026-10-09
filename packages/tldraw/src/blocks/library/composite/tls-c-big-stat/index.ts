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
import { htmlHostNode } from '../../../html-block'
import { countFormat } from '../../../motion/play-reveal'

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
  return htmlHostNode(poster as (p: Record<string, unknown>, c: LayoutContext) => LayoutNode, 'tls.c.big-stat', props, ctx, { posterGeometry: true })
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

/** RV04 honest minimum: the default content at 520 wide. LO7: 265 → 246 — the poster now has the
 *  live template's metrics (CSS line boxes, its 8-unit label gap); 265 was the old poster's
 *  height (+2 per text, a 16-unit label gap), 19 units more than the live block paints. */
const BIG_STAT_MIN: [number, number] = [520, 246]

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
/** RVM3 — expressive timing of `tls.c.big-stat`, in ms (J5 tokens). */
export const BIG_STAT_TIMING = {
  countMs: 800,
  valueFadeMs: 300,
  labelAt: 150,
  labelMs: 450,
  contextAt: 350,
  contextMs: 350,
} as const

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

  // P7 `subtle`: one calm fade of every part, the number already final (no count-up, no slide).
  // The viewer hides each part inline (opacity 0); without this branch the count-up below ran
  // in the subtle slides too.
  if (rt.style === 'subtle') {
    const fades = [valueEl, labelEl, contextEl].filter((e): e is HTMLElement => !!e)
    const hs = fades.map((el) => rt.driver.play(el, { opacity: [0, 1] }, { duration: Math.min(rt.timing.durationMs, 400), delay: rt.timing.delayMs, easing: 'ease-out', fill: 'forwards' }))
    Promise.all(hs.map((h) => h.finished)).then(() => rt.onComplete())
    return () => { hs.forEach((h) => h.cancel()) }
  }

  // Read the final formatted text from the already-rendered DOM element.
  // The template/poster already wrote the correct formatted value; we just
  // need to animate from 0 to it.
  const targetText = valueEl.textContent ?? '0'
  // RVM3: count in the target's own format ("1,250" counts "625", "$4.25M" keeps two decimals) on
  // tabular figures, so the number neither changes shape on its last frame nor jitters while it
  // counts; the last frame restores the exact text and the authored style.
  const format = countFormat(targetText)
  const numeric = valueEl.style.fontVariantNumeric

  /** Write the intermediate count-up value to textContent. */
  const writeCountUp = (progress: number) => {
    if (progress >= 1) {
      valueEl.textContent = targetText
      valueEl.style.fontVariantNumeric = numeric
      return
    }
    valueEl.style.fontVariantNumeric = 'tabular-nums'
    valueEl.textContent = format(progress)
  }
  /** RVM3 timing (J5: each part 150–900 ms on an out ease); was the block duration (~400 ms), with
   *  the number's fade at a quarter of it (100 ms). */
  const T = BIG_STAT_TIMING

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
    const sec = (ms: number) => ms / 1000

    // Count-up: tween the value from 0 to target using onUpdate
    // GSAP's timeline().fromTo on a proxy object driving onUpdate
    const proxy = { progress: 0 }
    tl.fromTo(proxy,
      { progress: 0 },
      {
        progress: 1,
        duration: sec(T.countMs),
        ease: 'power3.out',
        onUpdate: () => {
          writeCountUp(proxy.progress)
        },
      }
    )

    // The value part is hidden inline by the host until animate() reveals it. The count-up only
    // writes its text, so without this tween the number stayed at opacity 0 for ever on the GSAP
    // path (the label and context have their own tweens): the slide showed a label and no number.
    tl.fromTo(valueEl, { opacity: 0 }, { opacity: 1, duration: sec(T.valueFadeMs), ease: 'power2.out' }, 0)

    // Label slides in from below with opacity, slightly after the count-up begins
    if (labelEl) {
      tl.fromTo(labelEl, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: sec(T.labelMs), ease: 'power3.out' }, sec(T.labelAt))
    }

    // Context fades in
    if (contextEl) {
      tl.fromTo(contextEl, { opacity: 0 }, { opacity: 1, duration: sec(T.contextMs), ease: 'power2.out' }, sec(T.contextAt))
    }

    let resolved = false
    tl.then(() => {
      // Finish on the exact formatted text and the authored style.
      writeCountUp(1)
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
      duration: T.countMs,
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
        duration: T.labelMs,
        delay: rt.timing.delayMs + T.labelAt,
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
        duration: T.contextMs,
        delay: rt.timing.delayMs + T.contextAt,
        easing: rt.timing.ease,
        fill: 'forwards',
      }
    )
    handles.push(ctxHandle)
  }

  Promise.all(handles.map((h) => h.finished)).then(() => {
    writeCountUp(1)
    rt.onComplete()
  })

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
  category: 'metric',
  scope: 'slide',
  shortDescription: 'One giant headline number filling the slide, with label and context',
  related: ['tls.t.hero-number'],
  describe: {
    when: 'Use for a single hero statistic — one big number with a label and optional context.',
    avoid: 'Do not use for several metrics side by side (use tls.c.kpi-row), for a number inside a layout with other content (use tls.t.hero-number) or nested in another block.',
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
  size: { preferred: derivePreferredSize(), min: BIG_STAT_MIN },
  layout: bigStatLayout as BlockDefinition['layout'],
  poster,
  html: { template, animate: bigStatAnimate },
  motion,
}
