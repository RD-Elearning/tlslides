/**
 * tls.c.hero — hero / opening slide (kind: 'html').
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
 * This is the first `kind: 'html'` block — the reference implementation for
 * the pattern.
 */

import type { BlockDefinition, LayoutContext, LayoutNode, BlockMotionRuntime } from '../../../types'
import { schema, defaults } from './schema'
import { poster } from './poster'
import { template } from './template'
import { motion } from './motion'

/** Summary for the AI: what this block is and when to use it. */
const HERO_SUMMARY =
  'Opening slide. One idea in the title, no full sentence; ' +
  'subtitle gives date/audience; CTA optional.'

/**
 * Auto-generated `layout()` for `kind: 'html'` blocks. Returns a single host
 * node filling the box. The poster supplies geometry for the compiler and SVG
 * export; the host renderer supplies the live DOM.
 */
function heroLayout(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as import('./schema').HeroProps
  const posterNode = poster(p, ctx)
  return {
    k: 'host',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'root',
    render: 'tls.c.hero',
    poster: posterNode,
  } as LayoutNode
}

/**
 * Derive `size.preferred` from the poster of the defaults. The poster's root
 * box gives the intrinsic content size at the reference frame width.
 */
function derivePreferredSize(): [number, number] {
  // The hero fills the slide width; preferred height is derived from the poster
  // of defaults at a 1920-wide reference frame. We set a reasonable default and
  // let the poster's geometry correct it at layout time. The inserter uses this
  // to determine initial box size.
  return [1920, 600]
}

/**
 * Hero animation: stagger the data-part children with GSAP (when available)
 * or with the motion driver's timeline. Each part fades in from below.
 *
 * The driver keeps refusing forbidden properties on any element it is handed;
 * animate() may do anything to descendants of root and nothing to root.style.transform.
 */
function heroAnimate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  const parts = root.querySelectorAll<HTMLElement>('[data-part]')
  if (parts.length === 0) {
    rt.onComplete()
    return
  }

  // If the host provided GSAP, use a GSAP timeline for staggered reveal
  if (rt.gsap && typeof rt.gsap === 'object' && rt.gsap !== null) {
    const gsap = rt.gsap as {
      fromTo(target: unknown, from: unknown, to: unknown): { kill(): void; then(cb?: () => void): Promise<void> }
      timeline(): {
        fromTo(target: unknown, from: unknown, to: unknown): unknown
        then(cb?: () => void): Promise<void>
        kill(): void
      }
    }

    const tl = gsap.timeline()
    const staggerSec = rt.timing.staggerMs / 1000
    const durationSec = rt.timing.durationMs / 1000

    parts.forEach((part, i) => {
      gsap.fromTo(part,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: durationSec, delay: i * staggerSec, ease: 'power3.out' }
      )
      tl.fromTo(part,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: durationSec, delay: i * staggerSec, ease: 'power3.out' }
      )
    })

    let resolved = false
    tl.then(() => {
      if (!resolved) { resolved = true; rt.onComplete() }
    })

    return () => { tl.kill() }
  }

  // Fallback: use the motion driver's play() on each part
  const handles: Array<{ cancel(): void; finished: Promise<void> }> = []
  parts.forEach((part, i) => {
    const h = rt.driver.play(part,
      { opacity: [0, 1], translate: ['0px 24px', '0px 0px'] },
      {
        duration: rt.timing.durationMs,
        delay: rt.timing.delayMs + i * rt.timing.staggerMs,
        easing: rt.timing.ease,
        fill: 'forwards',
      }
    )
    handles.push(h)
  })

  Promise.all(handles.map((h) => h.finished)).then(() => rt.onComplete())

  return () => { handles.forEach((h) => h.cancel()) }
}

export const tlsCHero: BlockDefinition = {
  type: 'tls.c.hero',
  name: 'Hero',
  family: 'composite',
  tier: 'B',
  kind: 'html',
  summary: HERO_SUMMARY,
  keywords: ['hero', 'opening', 'title', 'cover', 'splash', 'intro', 'landing'],
  schema,
  defaults,
  size: { preferred: derivePreferredSize(), min: [400, 200] },
  layout: heroLayout as BlockDefinition['layout'],
  poster,
  html: { template, animate: heroAnimate },
  motion,
}
