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
 * Variants:
 * - `'classic'` (default): standard hero with staggered part reveal
 * - `'split'`: title split into two halves revealing from opposite sides
 * - `'gradient-sweep'`: decorative gradient sweeps in behind the title on reveal
 *
 * Every variant keeps the same `data-part` names so `motion.parts` does not fork.
 */

import type { BlockDefinition, LayoutContext, LayoutNode, BlockMotionRuntime } from '../../../types'
import { schema, defaults } from './schema'
import type { HeroVariant } from './schema'
import { poster } from './poster'
import { template } from './template'
import { motion } from './motion'
import { createLayoutContext } from '../../../layout/layout-child'
import { resolveTokens } from '../../../tokens'
import { BUILT_IN_DECK_THEMES } from '../../../../state/shapes/shared/deck-theme'

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

/* ── GSAP helper types ────────────────────────────────────────────────────── */

type GsapLike = {
  fromTo(target: unknown, from: unknown, to: unknown): { kill(): void; then(cb?: () => void): Promise<void> }
  timeline(): {
    fromTo(target: unknown, from: unknown, to: unknown): unknown
    then(cb?: () => void): Promise<void>
    kill(): void
  }
}

function isGsap(obj: unknown): obj is GsapLike {
  return !!obj && typeof obj === 'object' && typeof (obj as GsapLike).timeline === 'function'
}

/* ── driver fallback (non-GSAP path) ──────────────────────────────────────── */

/**
 * Fallback animation when GSAP is not available: stagger parts via the motion driver.
 * Shared by all variants in the non-GSAP path.
 */
function driverFallback(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  const parts = root.querySelectorAll<HTMLElement>('[data-part]')
  if (parts.length === 0) {
    rt.onComplete()
    return
  }
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

/* ── per-variant GSAP animations ──────────────────────────────────────────── */

/**
 * Classic variant: stagger each data-part with a GSAP timeline, fading in from below.
 */
function animateClassicGsap(root: HTMLElement, gsap: GsapLike, rt: BlockMotionRuntime): void | (() => void) {
  const parts = root.querySelectorAll<HTMLElement>('[data-part]')
  if (parts.length === 0) {
    rt.onComplete()
    return
  }

  const tl = gsap.timeline()
  const staggerSec = rt.timing.staggerMs / 1000
  const durationSec = rt.timing.durationMs / 1000

  parts.forEach((part, i) => {
    tl.fromTo(part,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: durationSec, delay: i * staggerSec, ease: 'power3.out' }
    )
  })

  let resolved = false
  tl.then(() => { if (!resolved) { resolved = true; rt.onComplete() } })

  return () => { tl.kill() }
}

/**
 * Split variant: non-title parts stagger-fade from below; title halves slide
 * in from opposite sides (first from left, second from right).
 */
function animateSplitGsap(root: HTMLElement, gsap: GsapLike, rt: BlockMotionRuntime): void | (() => void) {
  const tl = gsap.timeline()
  const staggerSec = rt.timing.staggerMs / 1000
  const durationSec = rt.timing.durationMs / 1000

  const titleEl = root.querySelector<HTMLElement>('[data-part="title"]')
  const allParts = root.querySelectorAll<HTMLElement>('[data-part]')

  let partIndex = 0

  // Non-title parts: staggered fade-in
  allParts.forEach((part) => {
    if (part === titleEl) return
    tl.fromTo(part,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: durationSec, delay: partIndex * staggerSec, ease: 'power3.out' }
    )
    partIndex++
  })

  // Title halves: slide from opposite sides
  if (titleEl) {
    const first = titleEl.querySelector<HTMLElement>('[data-half="first"]')
    const second = titleEl.querySelector<HTMLElement>('[data-half="second"]')

    // Make title visible immediately so halves can be positioned
    tl.fromTo(titleEl,
      { opacity: 0 },
      { opacity: 1, duration: 0.01, delay: partIndex * staggerSec }
    )

    if (first) {
      tl.fromTo(first,
        { opacity: 0, x: -100 },
        { opacity: 1, x: 0, duration: durationSec, ease: 'power3.out' }
      )
    }
    if (second) {
      tl.fromTo(second,
        { opacity: 0, x: 100 },
        { opacity: 1, x: 0, duration: durationSec, ease: 'power3.out' }
      )
    }
  }

  let resolved = false
  tl.then(() => { if (!resolved) { resolved = true; rt.onComplete() } })

  return () => { tl.kill() }
}

/**
 * Gradient-sweep variant: a background gradient sweeps in from left, then
 * parts stagger-fade from below.
 */
function animateGradientSweepGsap(root: HTMLElement, gsap: GsapLike, rt: BlockMotionRuntime): void | (() => void) {
  const parts = root.querySelectorAll<HTMLElement>('[data-part]')
  if (parts.length === 0) {
    rt.onComplete()
    return
  }

  const tl = gsap.timeline()
  const staggerSec = rt.timing.staggerMs / 1000
  const durationSec = rt.timing.durationMs / 1000

  // Gradient sweep: clip-path from right-hidden to fully visible
  const gradientBg = root.querySelector<HTMLElement>('[data-gradient-bg]')
  if (gradientBg) {
    tl.fromTo(gradientBg,
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: durationSec * 1.5, ease: 'power2.inOut' }
    )
  }

  // Parts: staggered fade-in
  parts.forEach((part, i) => {
    tl.fromTo(part,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: durationSec, delay: i * staggerSec, ease: 'power3.out' }
    )
  })

  let resolved = false
  tl.then(() => { if (!resolved) { resolved = true; rt.onComplete() } })

  return () => { tl.kill() }
}

/* ── main animate entry point ─────────────────────────────────────────────── */

/**
 * Hero animation: branches on variant. GSAP present → a timeline per variant;
 * absent → falls back to the motion driver on the same `[data-part]` elements.
 *
 * The driver keeps refusing forbidden properties on any element it is handed;
 * animate() may do anything to descendants of root and nothing to root.style.transform.
 *
 * `onComplete()` is called exactly once (idempotent). When `rt.reducedMotion` is true,
 * animation is skipped and `onComplete()` is called immediately.
 */
function heroAnimate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  // reducedMotion → skip animation, call onComplete immediately
  if (rt.reducedMotion) {
    rt.onComplete()
    return
  }

  // Read variant from the root element's data attribute (set by the template)
  const variant: HeroVariant = (root.dataset.variant as HeroVariant) ?? 'classic'

  // GSAP path: per-variant timeline
  if (isGsap(rt.gsap)) {
    const gsap = rt.gsap
    if (variant === 'split') return animateSplitGsap(root, gsap, rt)
    if (variant === 'gradient-sweep') return animateGradientSweepGsap(root, gsap, rt)
    return animateClassicGsap(root, gsap, rt)
  }

  // Driver fallback: all variants use the same driver-based stagger
  return driverFallback(root, rt)
}

/* ── block definition ─────────────────────────────────────────────────────── */

export const tlsCHero: BlockDefinition = {
  type: 'tls.c.hero',
  name: 'Hero',
  family: 'composite',
  tier: 'B',
  kind: 'html',
  summary: HERO_SUMMARY,
  keywords: ['hero', 'opening', 'title', 'cover', 'splash', 'intro', 'landing'],
  describe: {
    when:
      'Use as a title/cover slide — one idea in the title, date/audience in the subtitle. ' +
      'Pick variant "classic" for a standard hero, "split" when you want the title to ' +
      'reveal from two halves sliding in from opposite sides, or "gradient-sweep" for a ' +
      'decorative background gradient that sweeps in behind the title on reveal.',
    avoid: 'Do not use for content slides that have data or body text — use tls.t.title.',
    example: {
      id: 'b_hero',
      type: 'tls.c.hero',
      props: {
        kicker: 'QUARTERLY REVIEW',
        title: { runs: [{ text: 'Margin fell on ' }, { text: 'infrastructure', bold: true }] },
        subtitle: { runs: [{ text: 'Q3 FY2026' }] },
        cta: '',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: derivePreferredSize(), min: [400, 200] },
  layout: heroLayout as BlockDefinition['layout'],
  poster,
  html: { template, animate: heroAnimate },
  motion,
}
