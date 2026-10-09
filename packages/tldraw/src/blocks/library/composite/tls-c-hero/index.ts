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
import { htmlHostNode } from '../../../html-block'
import { runShowcase } from '../_showcase'

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
  return htmlHostNode(poster as (p: Record<string, unknown>, c: LayoutContext) => LayoutNode, 'tls.c.hero', props, ctx, { posterGeometry: true })
}

/** Honest minimum (RV10): at 1280 wide the default title wraps; anything smaller clips it.
 *  LO7: 472 → 490 — the poster now measures the title at the template's line-height (1.1, was
 *  the display token's 1.02), i.e. the height the live hero always painted at 1280. */
// AC2: + the `decoration: rule` bar (8 + md 24). AC3: 522 → 660 — the default theme (mono-grid)
// sets its headings in Source Code Pro, now measured with its real widths (it was Inter-wide in the
// poster's wrap), so the title takes another line at 1280 (the size card's atMin showed 657).
const HERO_MIN: [number, number] = [1280, 660]

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
  // AC2: measured with the rule decoration, the tallest look.
  const posterNode = poster({ ...defaults, decoration: 'rule' }, ctx)
  // Never below `size.min` (catalog contract min ≤ preferred). With browser-true text widths (LO6)
  // the default title is one line at 1920 (poster 317 tall); the min height is the 1280-wide case,
  // where it wraps (RV10).
  return [REFERENCE_WIDTH, Math.max(HERO_MIN[1], posterNode.box.height)]
}

/* ── GSAP helper types ────────────────────────────────────────────────────── */

type GsapLike = {
  fromTo(target: unknown, from: unknown, to: unknown): { kill(): void; then(cb?: () => void): Promise<void> }
  timeline(): {
    fromTo(target: unknown, from: unknown, to: unknown, position?: number): unknown
    then(cb?: () => void): Promise<void>
    kill(): void
  }
}

function isGsap(obj: unknown): obj is GsapLike {
  return !!obj && typeof obj === 'object' && typeof (obj as GsapLike).timeline === 'function'
}

/* ── choreography (RVM5) ──────────────────────────────────────────────────── */

/**
 * When each part starts (s): a clear hierarchy, kicker, then title, then subtitle, CTA last, each
 * rising 24 px over `PART_S` on an out ease. Was a GSAP timeline that appended every tween after
 * the previous one had finished (positionless `fromTo`), plus the host's 40 ms stagger: a 1.2 s
 * chain whose steps did not overlap, and the gradient sweep eased in and out.
 */
export const HERO_AT: Record<string, number> = { kicker: 0, title: 0.15, subtitle: 0.4, cta: 0.6 }
const PART_S = 0.6
/** Split variant: the title halves slide in from ±`HALF_X` px (was ±100). */
const HALF_X = 60
/** Gradient-sweep variant: the backdrop wipes in first, the parts follow `SWEEP_LEAD` s later. */
const SWEEP_S = 0.7
const SWEEP_LEAD = 0.2

/** The longest variant (gradient sweep): lead + the CTA's start + its rise, for chaining. */
export const HERO_MS = Math.round((SWEEP_LEAD + HERO_AT.cta + PART_S) * 1000)

const at = (part: HTMLElement, i: number): number => HERO_AT[part.dataset.part ?? ''] ?? 0.15 * i

/* ── driver fallback (non-GSAP path) ──────────────────────────────────────── */

/**
 * Fallback animation when GSAP is not available: the same hierarchy via the motion driver.
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
        duration: PART_S * 1000,
        delay: rt.timing.delayMs + at(part, i) * 1000,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
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
 * Classic variant: each data-part rises in at its place in the hierarchy (`HERO_AT`).
 */
function animateClassicGsap(root: HTMLElement, gsap: GsapLike, rt: BlockMotionRuntime): void | (() => void) {
  const parts = root.querySelectorAll<HTMLElement>('[data-part]')
  if (parts.length === 0) {
    rt.onComplete()
    return
  }

  const tl = gsap.timeline()
  parts.forEach((part, i) => {
    tl.fromTo(part,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: PART_S, ease: 'power3.out' },
      at(part, i)
    )
  })

  let resolved = false
  tl.then(() => { if (!resolved) { resolved = true; rt.onComplete() } })

  return () => { tl.kill() }
}

/**
 * Split variant: non-title parts rise in at their place in the hierarchy; the title halves slide
 * in from opposite sides (first from the left, second from the right) at the title's place.
 */
function animateSplitGsap(root: HTMLElement, gsap: GsapLike, rt: BlockMotionRuntime): void | (() => void) {
  const tl = gsap.timeline()

  const titleEl = root.querySelector<HTMLElement>('[data-part="title"]')
  const allParts = root.querySelectorAll<HTMLElement>('[data-part]')

  allParts.forEach((part, i) => {
    if (part === titleEl) return
    tl.fromTo(part,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: PART_S, ease: 'power3.out' },
      at(part, i)
    )
  })

  if (titleEl) {
    const first = titleEl.querySelector<HTMLElement>('[data-half="first"]')
    const second = titleEl.querySelector<HTMLElement>('[data-half="second"]')
    const t = HERO_AT.title
    // The title box only holds the halves (each hidden by its own from-state): show it at once.
    tl.fromTo(titleEl, { opacity: 0 }, { opacity: 1, duration: 0.01 }, t)
    if (first) tl.fromTo(first, { opacity: 0, x: -HALF_X }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, t)
    if (second) tl.fromTo(second, { opacity: 0, x: HALF_X }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, t + 0.08)
  }

  let resolved = false
  tl.then(() => { if (!resolved) { resolved = true; rt.onComplete() } })

  return () => { tl.kill() }
}

/**
 * Gradient-sweep variant: the background gradient wipes in from the left, then the parts rise in
 * at their place in the hierarchy.
 */
function animateGradientSweepGsap(root: HTMLElement, gsap: GsapLike, rt: BlockMotionRuntime): void | (() => void) {
  const parts = root.querySelectorAll<HTMLElement>('[data-part]')
  if (parts.length === 0) {
    rt.onComplete()
    return
  }

  const tl = gsap.timeline()

  const gradientBg = root.querySelector<HTMLElement>('[data-gradient-bg]')
  if (gradientBg) {
    tl.fromTo(gradientBg,
      // Four explicit `%` terms on both ends: GSAP pairs the numbers in order (S16).
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: SWEEP_S, ease: 'power3.out' },
      0
    )
  }

  parts.forEach((part, i) => {
    tl.fromTo(part,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: PART_S, ease: 'power3.out' },
      (gradientBg ? SWEEP_LEAD : 0) + at(part, i)
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

  // subtle: one calm fade of every part (the showcase contract), whatever the variant
  if (rt.style === 'subtle') {
    return runShowcase(root, rt, { gsap: () => () => undefined, driver: () => [] })
  }

  // Read the variant from the template's data attribute. RVM5: the template puts it on its outer
  // div, inside the host element the viewer hands to animate(), so `root.dataset` alone never saw
  // it and split / gradient-sweep always played the classic timeline in the viewer.
  const variant: HeroVariant =
    (root.dataset.variant as HeroVariant | undefined) ??
    (root.querySelector<HTMLElement>('[data-variant]')?.dataset.variant as HeroVariant | undefined) ??
    'classic'

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
  category: 'cover',
  scope: 'slide',
  shortDescription: 'Opening title with kicker, subtitle and optional call to action',
  related: ['tls.t.title', 'tls.c.cover', 'tls.c.kinetic-title'],
  describe: {
    when: 'Use as a title/cover slide — one idea in the title, date/audience in the subtitle.',
    avoid: 'Content slides (use tls.t.title); a cover with photo, logo or meta line (use tls.c.cover); nesting: it fills the slide.',
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
  size: { preferred: derivePreferredSize(), min: HERO_MIN },
  layout: heroLayout as BlockDefinition['layout'],
  poster,
  html: { template, animate: heroAnimate },
  motion,
}
