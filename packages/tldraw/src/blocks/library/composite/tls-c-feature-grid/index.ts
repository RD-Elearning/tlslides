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
import { schema, defaults } from './schema'
import { poster } from './poster'
import { template } from './template'
import { motion } from './motion'
import { createLayoutContext } from '../../../layout/layout-child'
import { resolveTokens } from '../../../tokens'
import { BUILT_IN_DECK_THEMES } from '../../../../state/shapes/shared/deck-theme'
import { htmlHostNode } from '../../../html-block'

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
  return htmlHostNode(poster as (p: Record<string, unknown>, c: LayoutContext) => LayoutNode, 'tls.c.feature-grid', props, ctx)
}

/**
 * Derive `size.preferred` from the poster of the defaults. Builds a reference
 * LayoutContext at 1920-wide with the default theme's tokens and calls poster()
 * to get the real intrinsic height.
 */
function derivePreferredSize(): [number, number] {
  const REFERENCE_WIDTH = 1920
  const REFERENCE_HEIGHT = 1080
  const theme = BUILT_IN_DECK_THEMES[0] // mono-grid (the demo's default)
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

  // Collect cell containers: parent of each cell[i].icon element
  const icons = root.querySelectorAll<HTMLElement>('[data-part$=".icon"]')
  const cellContainers: HTMLElement[] = []
  icons.forEach((icon) => {
    const parent = icon.parentElement
    if (parent) cellContainers.push(parent)
  })

  if (cellContainers.length === 0) {
    rt.onComplete()
    return
  }

  // If the host provided GSAP, use a GSAP timeline for staggered reveal
  if (rt.gsap && typeof rt.gsap === 'object' && rt.gsap !== null) {
    const gsap = rt.gsap as {
      fromTo(
        target: unknown,
        from: unknown,
        to: unknown,
        position?: string,
      ): { kill(): void; then(cb?: () => void): Promise<void> }
      timeline(): {
        fromTo(target: unknown, from: unknown, to: unknown, position?: string): unknown
        then(cb?: () => void): Promise<void>
        kill(): void
      }
    }

    const tl = gsap.timeline()
    const staggerSec = rt.timing.staggerMs / 1000
    const durationSec = rt.timing.durationMs / 1000

    // Stagger cell containers from below
    cellContainers.forEach((cell, i) => {
      tl.fromTo(
        cell,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: durationSec,
          delay: i * staggerSec,
          ease: 'power3.out',
        },
      )
    })

    // Scale icons in (synchronized with their parent cell's timing)
    icons.forEach((icon, i) => {
      tl.fromTo(
        icon,
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: durationSec * 0.6,
          delay: i * staggerSec,
          ease: 'back.out(1.7)',
        },
        '<',
      )
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

  // Fallback: use the motion driver's play() on each cell
  const handles: Array<{ cancel(): void; finished: Promise<void> }> = []
  cellContainers.forEach((cell, i) => {
    const h = rt.driver.play(
      cell,
      { opacity: [0, 1], translate: ['0px 24px', '0px 0px'] },
      {
        duration: rt.timing.durationMs,
        delay: rt.timing.delayMs + i * rt.timing.staggerMs,
        easing: rt.timing.ease,
        fill: 'forwards',
      },
    )
    handles.push(h)
  })

  // Also animate icons with scale
  icons.forEach((icon, i) => {
    const h = rt.driver.play(
      icon,
      { opacity: [0, 1], scale: [0, 1] },
      {
        duration: rt.timing.durationMs * 0.6,
        delay: rt.timing.delayMs + i * rt.timing.staggerMs,
        easing: rt.timing.ease,
        fill: 'forwards',
      },
    )
    handles.push(h)
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
  describe: {
    when:
      'Use to show 2–6 feature highlights in a grid layout — each cell has ' +
      'an icon, title, and short description. Good for capability overviews, ' +
      'service lists, or product feature showcases.',
    avoid:
      'Do not use for single-row comparisons (use tls.c.comparison) or for ' +
      'more than 6 items (use tls.c.agenda or tls.c.steps).',
    example: {
      id: 'b_feature_grid',
      type: 'tls.c.feature-grid',
      props: {
        cells: [
          { icon: 'zap', title: 'Fast', desc: 'Optimised for speed at every layer.' },
          { icon: 'shield', title: 'Secure', desc: 'End-to-end encryption by default.' },
          { icon: 'globe', title: 'Global', desc: 'Deployed across 30+ regions.' },
        ],
        columns: 3,
        gap: 24,
      },
    },
  },
  schema,
  defaults,
  size: { preferred: derivePreferredSize(), min: [400, 200] },
  layout: featureGridLayout as BlockDefinition['layout'],
  poster,
  html: { template, animate: featureGridAnimate },
  motion,
}
