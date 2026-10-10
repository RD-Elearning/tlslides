/**
 * AC8.5 — the deck-level quality gate (`reviews/blocks/ai-curation/README.md` §8.9).
 *
 * The layout oracle answers "is it broken?" (overflow, collision, a region left empty). This module
 * answers "does it look finished?" for one slide, from the same `LayoutReport`, with three measures
 * a reviewer can check on a contact sheet:
 *
 * - **fill**: the painted union of every content block (backdrops excluded), as a share of the
 *   slide's safe area (the frame inset by one `3xl` margin, 96 units on 1920 × 1080). A statement
 *   at title size in the middle of a blank slide paints ~10 %; a finished slide ≥ 30 %.
 * - **region fill**: for every non-title region that is a large part of the frame (≥ 15 %), the
 *   painted union of its blocks as a share of the region. Three short bullets at body size beside a
 *   full-height photo paint ~10 % of their column; a finished column ≥ 30 %.
 * - **lead type**: the largest text on the slide. A slide whose biggest words are smaller than the
 *   deck's title size reads as unfinished (a `size: lg` statement alone on a slide). A type-led
 *   slide whose lead reaches 1.5 × the title size may cover less of the safe area (15 %).
 *
 * Pure and DOM-free. `dryRun.ts` runs it on every slide (S4.1 treats a failed gate like a warning:
 * the next design is tried), `dry-run.spec.ts` requires 0 findings on the dry-run decks.
 */
import { analyzeDeck } from '../layout-report'
import type { LayoutReport } from '../layout-report'
import type { BlockRegistry } from '../registry'
import { deckSpecTokens, getDeckStyle } from '../styles'
import { resolveTokens } from '../tokens'
import { resolveDeckTheme } from '../deck-document'
import type { DeckSpec } from '../types'

export type QualityCode = 'quality/sparse' | 'quality/thin-region' | 'quality/small-type'

export interface QualityFinding {
  code: QualityCode
  message: string
  /** Region name for `quality/thin-region`. */
  region?: string
}

export interface SlideQuality {
  /** Painted union of the content blocks / safe area, 0-1. */
  fill: number
  /** Smallest region fill over the large non-title regions (1 when there is none). */
  regionFill: number
  /** The region `regionFill` was measured on ('' when none). */
  thinRegion: string
  /** Largest painted font size on the slide, slide units. */
  lead: number
  findings: QualityFinding[]
}

/** The gate. Tighten only (a ratchet, like the oracle's own thresholds). */
export const QUALITY_GATE = {
  /** Minimum `fill`. */
  minFill: 0.3,
  /** A type-led slide (lead ≥ `displayOfTitle` × the title size: a display statement, a giant
   *  number, a big section title) may paint less, down to `displayFill`: big type on calm space is
   *  a finished design; title-size type on the same space is not. */
  displayOfTitle: 1.5,
  displayFill: 0.15,
  /** Minimum region fill of a large non-title region. */
  minRegionFill: 0.3,
  /** A region counts as large from this share of the frame. */
  regionShare: 0.15,
  /** `lead` must reach this share of the deck's title size. */
  leadOfTitle: 0.9,
  /** Safe-area margin, as a share of the frame width (96 / 1920). */
  margin: 0.05,
} as const

interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

function union(boxes: Array<{ x: number; y: number; width: number; height: number } | null>): Rect | null {
  let r: Rect | null = null
  for (const b of boxes) {
    if (!b || b.width <= 0 || b.height <= 0) continue
    if (!r) r = { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }
    else r = { x0: Math.min(r.x0, b.x), y0: Math.min(r.y0, b.y), x1: Math.max(r.x1, b.x + b.width), y1: Math.max(r.y1, b.y + b.height) }
  }
  return r
}

const area = (r: Rect | null) => (r ? Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0) : 0)
const pct = (n: number) => `${Math.round(n * 100)}%`

/**
 * The quality of one slide. `titleSize` is the deck's resolved `title` type size (the style's), for
 * the lead-type rule; without it that rule is skipped.
 */
export function slideQuality(report: LayoutReport, opts: { titleSize?: number } = {}): SlideQuality {
  const W = report.frame.width
  const H = report.frame.height
  const m = W * QUALITY_GATE.margin
  const safe = Math.max(1, (W - 2 * m) * (H - 2 * m))
  const content = report.blocks.filter((b) => b.layer !== 'backdrop' && b.painted)
  const u = union(content.map((b) => b.painted))
  const fill = Math.min(1, area(u) / safe)

  let regionFill = 1
  let thinRegion = ''
  for (const [name, box] of Object.entries(report.regions)) {
    if (name === 'title' || box.width * box.height < QUALITY_GATE.regionShare * W * H) continue
    const own = content.filter((b) => b.region === name && !b.outOfFlow)
    if (!own.length) continue
    const f = Math.min(1, area(union(own.map((b) => b.painted))) / Math.max(1, box.width * box.height))
    if (f < regionFill) {
      regionFill = f
      thinRegion = name
    }
  }

  let lead = 0
  for (const b of content) for (const t of b.text) lead = Math.max(lead, t.fontSize * (t.scale || 1))

  const findings: QualityFinding[] = []
  const typeLed = !!opts.titleSize && lead >= opts.titleSize * QUALITY_GATE.displayOfTitle
  const minFill = typeLed ? QUALITY_GATE.displayFill : QUALITY_GATE.minFill
  if (fill < minFill) {
    findings.push({ code: 'quality/sparse', message: `content covers ${pct(fill)} of the safe area (minimum ${pct(minFill)}): use a roomier design, larger type or more content` })
  }
  // the single region of a blank or full-bleed slide is the slide: `fill` already judged it
  const sole = Object.keys(report.regions).length === 1
  if (!sole && regionFill < QUALITY_GATE.minRegionFill) {
    findings.push({ code: 'quality/thin-region', region: thinRegion, message: `region "${thinRegion}" is ${pct(regionFill)} filled (minimum ${pct(QUALITY_GATE.minRegionFill)}): larger type, more items, or another design` })
  }
  if (opts.titleSize && lead > 0 && lead < opts.titleSize * QUALITY_GATE.leadOfTitle) {
    findings.push({ code: 'quality/small-type', message: `the largest text is ${Math.round(lead)} units, under the deck's title size ${Math.round(opts.titleSize)}` })
  }
  return { fill, regionFill, thinRegion, lead, findings }
}

/**
 * The deck's slide-title size (theme + style + deck tokens), for the lead-type rule: the type token
 * the style gives `tls.t.title` (`blockDefaults` `size`, default `title`), resolved.
 */
export function deckTitleSize(deck: DeckSpec): number {
  const tokens = resolveTokens(resolveDeckTheme(deck.theme, deck.style), deckSpecTokens(deck))
  const token = getDeckStyle(deck.style)?.blockDefaults['tls.t.title']?.size
  const type = tokens.type as Record<string, { size: number }>
  return (typeof token === 'string' && type[token]?.size) || tokens.type.title.size
}

/** `slideQuality` for every slide of a deck (reports computed when not given). */
export function deckQuality(deck: DeckSpec, opts: { registry?: BlockRegistry; reports?: LayoutReport[] } = {}): SlideQuality[] {
  const reports = opts.reports ?? analyzeDeck(deck, { registry: opts.registry })
  const titleSize = deckTitleSize(deck)
  return reports.map((r) => slideQuality(r, { titleSize }))
}
