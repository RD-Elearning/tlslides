/**
 * tls.c.testimonial — pull-quote testimonial with attribution (kind: 'html').
 *
 * A block author writes an HTML template plus a schema and a short description,
 * and gets a block that the editor and the viewer render as real DOM, the SVG
 * path renders as a still (via poster), the digest describes, and
 * validateDeckSpec checks.
 *
 * The `layout()` function is auto-generated: it returns a single host node
 * filling the box with `render: def.type` and `poster: def.poster(props, ctx)`.
 * The host renderer is derived from the `html` object.
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
const TESTIMONIAL_SUMMARY =
  'Pull-quote testimonial with attribution. ' +
  'Quote text with speaker name, role, and optional avatar. ' +
  'Use for social proof, customer quotes, or endorsements.'

/**
 * Auto-generated `layout()` for `kind: 'html'` blocks. Returns a single host
 * node filling the box. The poster supplies geometry for the compiler and SVG
 * export; the host renderer supplies the live DOM.
 */
function testimonialLayout(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as import('./schema').TestimonialProps
  const posterNode = poster(p, ctx)
  return {
    k: 'host',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'root',
    render: 'tls.c.testimonial',
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
 * Testimonial animation: word-by-word fade-in of the quote, then staggered
 * appearance of avatar, name, role.
 *
 * With GSAP: builds a timeline that fades each word span in, followed by
 * the attribution parts.
 * Without GSAP: uses the motion driver to animate each word and part.
 * When reducedMotion is true: skips animation and calls onComplete immediately.
 */
function testimonialAnimate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  // Reduced motion: skip animation, show everything immediately
  if (rt.reducedMotion) {
    rt.onComplete()
    return
  }

  const quoteEl = root.querySelector<HTMLElement>('[data-part="quote"]')
  const wordSpans = quoteEl
    ? Array.from(quoteEl.querySelectorAll<HTMLElement>('[data-word]'))
    : []
  const attributionParts = root.querySelectorAll<HTMLElement>(
    '[data-part="avatar"], [data-part="name"], [data-part="role"]'
  )

  const totalParts = wordSpans.length + attributionParts.length
  if (totalParts === 0) {
    rt.onComplete()
    return
  }

  let resolved = false
  const onCompleteOnce = () => {
    if (!resolved) {
      resolved = true
      rt.onComplete()
    }
  }

  // If the host provided GSAP, use a GSAP timeline
  if (rt.gsap && typeof rt.gsap === 'object' && rt.gsap !== null) {
    const gsap = rt.gsap as {
      timeline(): {
        fromTo(target: unknown, from: unknown, to: unknown): unknown
        then(cb?: () => void): Promise<void>
        kill(): void
      }
    }

    const tl = gsap.timeline()
    const durationSec = rt.timing.durationMs / 1000
    const wordStaggerSec = rt.timing.staggerMs / 1000

    // Animate each word span
    wordSpans.forEach((span, i) => {
      tl.fromTo(span,
        { opacity: 0 },
        { opacity: 1, duration: durationSec, delay: i * wordStaggerSec, ease: 'power2.out' }
      )
    })

    // Animate attribution parts after words
    attributionParts.forEach((part, i) => {
      tl.fromTo(part,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: durationSec, delay: i * wordStaggerSec, ease: 'power3.out' }
      )
    })

    tl.then(() => onCompleteOnce())

    return () => { tl.kill() }
  }

  // Fallback: use the motion driver
  const handles: Array<{ cancel(): void; finished: Promise<void> }> = []

  wordSpans.forEach((span, i) => {
    const h = rt.driver.play(span,
      { opacity: [0, 1] },
      {
        duration: rt.timing.durationMs,
        delay: rt.timing.delayMs + i * rt.timing.staggerMs,
        easing: rt.timing.ease,
        fill: 'forwards',
      }
    )
    handles.push(h)
  })

  attributionParts.forEach((part, i) => {
    const h = rt.driver.play(part,
      { opacity: [0, 1], translate: ['0px 12px', '0px 0px'] },
      {
        duration: rt.timing.durationMs,
        delay: rt.timing.delayMs + (wordSpans.length + i) * rt.timing.staggerMs,
        easing: rt.timing.ease,
        fill: 'forwards',
      }
    )
    handles.push(h)
  })

  Promise.all(handles.map((h) => h.finished)).then(() => onCompleteOnce())

  return () => { handles.forEach((h) => h.cancel()) }
}

export const tlsCTestimonial: BlockDefinition = {
  type: 'tls.c.testimonial',
  name: 'Testimonial',
  family: 'composite',
  tier: 'B',
  kind: 'html',
  summary: TESTIMONIAL_SUMMARY,
  keywords: ['testimonial', 'quote', 'pull-quote', 'endorsement', 'social-proof', 'attribution'],
  describe: {
    when: 'Use for a customer quote, testimonial, or endorsement — quote text with speaker name, role, and optional avatar.',
    avoid: 'Do not use for general block quotes or section dividers — use tls.t.title or a layout container.',
    example: {
      id: 'b_testimonial',
      type: 'tls.c.testimonial',
      props: {
        quote: 'This product transformed how our team works. We shipped 3× faster in the first quarter.',
        name: 'Jane Doe',
        role: 'VP of Engineering',
        avatar: '',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: derivePreferredSize(), min: [400, 300] },
  layout: testimonialLayout as BlockDefinition['layout'],
  poster,
  html: { template, animate: testimonialAnimate },
  motion,
}
