/**
 * tls.c.feature-grid — a grid of feature cells (kind: 'html').
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
 * This is a `kind: 'html'` composite block following the tls.c.hero pattern.
 */

import type { BlockDefinition, LayoutContext, LayoutNode, BlockMotionRuntime } from '../../../types'
import { schema, defaults, FG_CARD_PAD, type FeatureGridProps } from './schema'
import { poster } from './poster'
import { template } from './template'
import { motion } from './motion'
import { createLayoutContext } from '../../../layout/layout-child'
import { resolveTokens } from '../../../tokens'
import { BUILT_IN_DECK_THEMES } from '../../../../state/shapes/shared/deck-theme'
import { htmlHostNode } from '../../../html-block'

/** The example the AI is shown; the preferred size is the poster height of exactly this. */
const EXAMPLE_PROPS = {
  cells: [
    { icon: 'zap', title: 'Fast', desc: 'Optimised for speed at every layer.' },
    { icon: 'shield', title: 'Secure', desc: 'End-to-end encryption by default.' },
    { icon: 'globe', title: 'Global', desc: 'Deployed across 30+ regions.' },
  ],
  columns: 3,
  gap: 24,
}

/** Summary for the AI: what this block is and when to use it. */
const FEATURE_GRID_SUMMARY =
  'Grid of feature cells, each with an icon, title, and description. ' +
  '2–6 cells arranged in 2/3/4 columns.'

/**
 * Auto-generated `layout()` for `kind: 'html'` blocks. Returns a single host
 * node filling the box. The poster supplies geometry for the compiler and SVG
 * export; the host renderer supplies the live DOM.
 */
function featureGridLayout(
  props: Record<string, unknown>,
  ctx: LayoutContext,
): LayoutNode {
  return htmlHostNode(poster as (p: Record<string, unknown>, c: LayoutContext) => LayoutNode, 'tls.c.feature-grid', props, ctx, { posterGeometry: true })
}

/**
 * Derive `size.preferred` from the poster of the defaults. Builds a reference
 * LayoutContext at 1920-wide with the default theme's tokens and calls poster()
 * to get the real intrinsic height.
 */
/** LO8: the example at 1120 wraps a cell title to 2 lines and is 251 tall (min was 242: the size
 *  card's `atMin` showed it overflowing its own min box). */
// AC2: + the card cell's padding (2 × FG_CARD_PAD), so every knob value fits its own min box.
const MIN_SIZE: [number, number] = [1120, 251 + 2 * FG_CARD_PAD]

function derivePreferredSize(): [number, number] {
  const REFERENCE_WIDTH = 1200
  const REFERENCE_HEIGHT = 1080
  const theme = BUILT_IN_DECK_THEMES[0] // mono-grid (the demo's default)
  const tokens = resolveTokens(theme)
  const ctx = createLayoutContext({
    box: { width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT },
    tokens,
    surface: { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false },
  })
  // AC2: measured with card cells, the tallest look (padding on every side).
  const posterNode = poster({ ...(EXAMPLE_PROPS as FeatureGridProps), cell: 'card' }, ctx)
  // + one description line: the real theme's body type runs larger than the test measure.
  // Never below the min height (catalog conformance: min ≤ preferred).
  return [REFERENCE_WIDTH, Math.max(MIN_SIZE[1], Math.ceil(posterNode.box.height + 36))]
}

/**
 * Feature-grid animation: stagger the cell containers from below and scale
 * icons in with GSAP (when available) or with the motion driver's fallback.
 *
 * The driver keeps refusing forbidden properties on any element it is handed;
 * animate() may do anything to descendants of root and nothing to
 * root.style.transform.
 */
function featureGridAnimate(
  root: HTMLElement,
  rt: BlockMotionRuntime,
): void | (() => void) {
  // Reduced motion: skip animation, call onComplete immediately
  if (rt.reducedMotion) {
    rt.onComplete()
    return
  }

  // Every drawn part is hidden until its step plays, so every part must be released here
  // (icon, title and description; RV03: only the icons and their parents were, text stayed hidden).
  const cells = new Map<string, HTMLElement[]>()
  root.querySelectorAll<HTMLElement>('[data-part]').forEach((el) => {
    const m = /^cell\[(\d+)\]/.exec(el.getAttribute('data-part') ?? '')
    if (!m) return
    cells.set(m[1], [...(cells.get(m[1]) ?? []), el])
  })
  const order = [...cells.keys()].sort((a, b) => Number(a) - Number(b))
  if (order.length === 0) {
    rt.onComplete()
    return
  }
  const step = (part: string): number => (part.endsWith('.icon') ? 0 : part.endsWith('.title') ? 0.35 : 0.6)

  // RVM2 (J7): `subtle` is one calm fade of every part, no pop and no rise.
  if (rt.style === 'subtle') {
    const all = order.flatMap((key) => cells.get(key) ?? [])
    const fades = all.map((el) =>
      rt.driver.play(el, { opacity: [0, 1] }, { duration: rt.timing.durationMs, delay: rt.timing.delayMs, easing: rt.timing.ease, fill: 'forwards' })
    )
    Promise.all(fades.map((h) => h.finished)).then(() => rt.onComplete(), () => rt.onComplete())
    return () => fades.forEach((h) => h.cancel())
  }

  if (rt.gsap && typeof rt.gsap === 'object') {
    const gsap = rt.gsap as {
      timeline(): {
        fromTo(target: unknown, from: unknown, to: unknown, position?: number): unknown
        then(cb?: () => void): Promise<void>
        kill(): void
      }
    }
    const tl = gsap.timeline()
    const staggerSec = rt.timing.staggerMs / 1000
    const durationSec = rt.timing.durationMs / 1000
    order.forEach((key, n) => {
      for (const el of cells.get(key) ?? []) {
        const part = el.getAttribute('data-part') ?? ''
        const icon = part.endsWith('.icon')
        tl.fromTo(
          el,
          // RVM2: the icon pops from 0.7 over the full step (was 0.4 in 60 % of it: ~0.3 of scale in
          // the first two frames).
          icon ? { opacity: 0, scale: 0.7 } : { opacity: 0, y: 16 },
          icon
            ? { opacity: 1, scale: 1, duration: durationSec, ease: 'back.out(1.4)' }
            : { opacity: 1, y: 0, duration: durationSec, ease: 'power3.out' },
          rt.timing.delayMs / 1000 + n * staggerSec + step(part) * durationSec * 0.5,
        )
      }
    })
    let resolved = false
    tl.then(() => {
      if (!resolved) {
        resolved = true
        rt.onComplete()
      }
    })
    return () => {
      tl.kill()
    }
  }

  const handles: Array<{ cancel(): void; finished: Promise<void> }> = []
  order.forEach((key, n) => {
    for (const el of cells.get(key) ?? []) {
      const part = el.getAttribute('data-part') ?? ''
      const icon = part.endsWith('.icon')
      handles.push(
        rt.driver.play(
          el,
          icon ? { opacity: [0, 1], scale: [0.7, 1] } : { opacity: [0, 1], translate: ['0px 16px', '0px 0px'] },
          {
            duration: rt.timing.durationMs,
            delay: rt.timing.delayMs + n * rt.timing.staggerMs + step(part) * rt.timing.durationMs * 0.5,
            easing: rt.timing.ease,
            fill: 'forwards',
          },
        ),
      )
    }
  })
  Promise.all(handles.map((h) => h.finished)).then(() => rt.onComplete())
  return () => {
    handles.forEach((h) => h.cancel())
  }
}

export const tlsCFeatureGrid: BlockDefinition = {
  type: 'tls.c.feature-grid',
  name: 'Feature Grid',
  family: 'composite',
  tier: 'B',
  kind: 'html',
  summary: FEATURE_GRID_SUMMARY,
  keywords: [
    'feature',
    'grid',
    'capabilities',
    'benefits',
    'icon',
    'tiles',
    'services',
    'highlights',
  ],
  category: 'list',
  scope: 'group',
  shortDescription: 'Grid of icon + title + description cells',
  related: ['tls.m.icon-label', 'tls.m.icon-list', 'tls.c.cards'],
  describe: {
    when: 'Use for 2-6 feature highlights in a grid, each with an icon, a title and a short description (capabilities, services, product pillars).',
    avoid: 'Do not use for a comparison of options (use tls.c.comparison), for sequential steps (use tls.c.steps) or for 2-4 framed cards with a paragraph each (use tls.c.cards).',
    example: {
      id: 'b_feature_grid',
      type: 'tls.c.feature-grid',
      props: EXAMPLE_PROPS,
    },
  },
  schema,
  defaults,
  size: { preferred: derivePreferredSize(), min: MIN_SIZE },
  layout: featureGridLayout as BlockDefinition['layout'],
  poster,
  html: { template, animate: featureGridAnimate },
  motion,
}
