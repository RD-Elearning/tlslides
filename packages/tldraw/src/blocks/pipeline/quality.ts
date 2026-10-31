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
 * - **floating body** (balanced slides): the body's largest text against the title size, and its
 *   painted union against the regions that hold it — a centred strip of body-size rows.
 * - **lead type**: the largest text on the slide. A slide whose biggest words are smaller than the
 *   deck's title size reads as unfinished (a `size: lg` statement alone on a slide). A type-led
 *   slide whose lead reaches 1.5 × the title size may cover less of the safe area (15 %).
 *
 * CMP2: the gate also runs the oracle's design checks (`design-checks.ts`: contrast, alignment,
 * equal peers, narrow children, nesting, type sizes, accent, motion) — every one of their warnings
 * and errors on the report is a gate finding, one line each, peers grouped ("3 of 3 card in g1: …").
 *
 * - **min-type** (learning L01, D10; opt-in through `opts.typeFloors`): the smallest READING text of
 *   the slide against a floor for its kind. A run is classified from what the report carries (the
 *   block type, its `part` / `propPath` name, the region): `title` (the title region) is judged by
 *   `lead`, not here; `label` / `caption` / `footnote` by the leaf's part name (label, caption,
 *   attribution, kicker, footer, unit, context, subtitle, badge, term); everything else is `body`.
 *   Exempt: decorative blocks and backdrops, charts and diagrams (`tls.d.*`, `tls.g.*`: their axis
 *   and node text is sized by the figure), runs of fewer than 8 characters (numbers, units) and
 *   icon glyphs. Defaults when the caller asks without numbers: body 24, label 18, caption 18, footnote 16.
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
import type { DeckSpec, SlideIntent } from '../types'
import { DESIGN_CODES, type DesignCode } from '../design-checks'

export type QualityCode = 'quality/sparse' | 'quality/thin-region' | 'quality/small-type' | 'quality/unbalanced' | 'quality/floating-body' | 'quality/thin-diagram' | 'quality/min-type' | DesignCode

/** CR7a (spro creative PLAN §6.8): the profile a slide is judged by, from `SlideSpec.intent`. */
export type GateProfile = 'default' | SlideIntent

export interface QualityFinding {
  code: QualityCode
  message: string
  /** Region name for `quality/thin-region`. */
  region?: string
}

export interface SlideQuality {
  /** CR7a: the profile the findings were judged by. */
  profile: GateProfile
  /** CR7a: the diagrams' painted union as a share of the regions that hold them (1 when none). */
  diagramFill: number
  /** Painted union of the content blocks / safe area, 0-1. */
  fill: number
  /** Smallest region fill over the large non-title regions (1 when there is none). */
  regionFill: number
  /** The region `regionFill` was measured on ('' when none). */
  thinRegion: string
  /** Largest painted font size on the slide, slide units. */
  lead: number
  /** spro enhance PLAN.md L1 — balance: the empty band between the lowest content and the
   *  safe area's bottom edge, as a share of the safe height (0 = content reaches the bottom). */
  bottomGap: number
  /** The empty band between the title (or the safe area's top edge) and the first content
   *  block below it, same unit: a vertically centred slide has `topGap ≈ bottomGap`. */
  topGap: number
  /** The tallest empty horizontal band between the body's blocks (title excluded), as a share of
   *  the safe height. */
  innerGap: number
  /** The empty bands left and right of the content (title included, ornament not), as shares of
   *  the safe width: a slide whose content hugs one side has one near 0 and the other large. */
  leftGap: number
  rightGap: number
  /** The body's largest painted font size (title region excluded), slide units; 0 = no body text. */
  bodyLead: number
  /** The body's painted union as a share of the regions that hold it (title excluded), 0-1. */
  bodyCover: number
  /** The slide title's painted text (left x, top y, width, font size), for title drift across
   *  slides; absent when the slide has no `title` region text. */
  title?: { x: number; y: number; width: number; fontSize: number }
  findings: QualityFinding[]
}

/** learning L01: the smallest size (slide units on 1920) each kind of reading text may have. */
export interface TypeFloors {
  body: number
  label: number
  caption: number
  footnote: number
}
export const DEFAULT_TYPE_FLOORS: TypeFloors = { body: 24, label: 18, caption: 18, footnote: 16 }

const LABEL_PARTS = /(^|[\s.\[\]])(label|badge|kicker|unit|context|term|subtitle|eyebrow)\b/i
const CAPTION_PARTS = /(^|[\s.\[\]])(caption|attribution)\b/i
const FOOTNOTE_PARTS = /(^|[\s.\[\]])(footer|footnote|source)\b/i
const GLYPH_PARTS = /(^|[\s.\[\]])(glyph|icon|emoji|value|mark|star)\b/i

/** The kind of a text leaf (see the header): null = not judged. */
export function textKind(blockType: string, region: string, leaf: { part?: string; propPath?: string; chars: number }): keyof TypeFloors | null {
  if (region === 'title' || leaf.chars < 8) return null
  if (DECORATIVE.has(blockType) || blockType.startsWith('tls.d.') || blockType.startsWith('tls.g.')) return null
  // a block that IS a caption or a footnote (`tls.t.caption`, `tls.t.footnote`) is judged as one
  if (blockType === 'tls.t.footnote') return 'footnote'
  if (blockType === 'tls.t.caption') return 'caption'
  if (blockType === 'tls.t.kicker') return 'label' // the small line above a title is a label, not reading text
  const name = `${leaf.part ?? ''} ${leaf.propPath ?? ''}`
  if (GLYPH_PARTS.test(name)) return null
  if (FOOTNOTE_PARTS.test(name)) return 'footnote'
  if (CAPTION_PARTS.test(name)) return 'caption'
  if (LABEL_PARTS.test(name)) return 'label'
  return 'body'
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
  /** enhance L1: the most the empty band under the content may exceed the one above it, and the
   *  tallest gap between the body's blocks, as shares of the safe height (`balance` only). */
  maxBottomExcess: 0.2,
  maxInnerGap: 0.2,
  /** Minimum `fill` of a slide judged on balance (content slides spro composes). */
  balancedMinFill: 0.5,
  /** A floating body (`balance` only): its largest text at most this share of the title size,
   *  and its painted union under `floatingCover` of the regions that hold it — a strip of
   *  body-size rows centred in a tall region. `fill` and `regionFill` measure bounding boxes, so
   *  a wide table or a two-column key-value list in a strip passes both (spro deck "Sáu mục tiêu
   *  của chương 1": fill 78 %, region 47 %, body 36 under an 80 title). On the 153 balanced spro
   *  slides of 2026-10-23 it flags 9, 7 of them a thin strip of small text on a contact sheet; at
   *  0.6 it also took cards and icon rows whose panels fill the band. */
  floatingLead: 0.5,
  floatingCover: 0.55,
  /** CR7a `diagram` profile: the diagrams must paint this share of the regions that hold them. */
  minDiagramFill: 0.45,
  /** CR7a `poster` profile: the lead must reach this share of the deck's title size. */
  posterLeadOfTitle: 1,
  /** A poster skips `sparse` and `thin-region` (big type on calm space), yet a large region left
   *  nearly empty beside a full one is not calm space (spro decks 9c2077bb s10, e28469a6 s6). Measured
   *  2026-10-30 on the 398 poster slides of the spro_review/spro_deckdev decks: below 0.15 flags 10,
   *  0.25 would flag 33, mostly deliberate type-led covers. */
  posterMinRegionFill: 0.15,
  /** A poster whose content hugs one side: the left and right empty bands differ by more than this
   *  share of the safe width (flags 9 of those 398; 0.3 flags 52, mostly left-aligned section titles). */
  posterMaxSideExcess: 0.4,
} as const

/** CR7a: blocks that are a diagram or a chart for the `diagram` profile (connectors are lines). */
const isDiagram = (type: string) => (type.startsWith('tls.g.') || type.startsWith('tls.d.')) && type !== 'tls.g.connector'

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

/** Ornament, not content: left out of the balance measures. */
const DECORATIVE = new Set(['tls.m.decoration', 'tls.m.pattern', 'tls.x.rule', 'tls.m.icon-cluster'])

/** The tallest gap between the vertical extents of `boxes` (sorted, merged), in units. */
function largestGap(boxes: Array<{ y: number; height: number }>): number {
  const spans = boxes.map((b) => [b.y, b.y + b.height] as [number, number]).sort((a, b) => a[0] - b[0])
  let gap = 0
  let end = spans.length ? spans[0][1] : 0
  for (const [y0, y1] of spans.slice(1)) {
    if (y0 > end) gap = Math.max(gap, y0 - end)
    end = Math.max(end, y1)
  }
  return gap
}

const area = (r: Rect | null) => (r ? Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0) : 0)
const pct = (n: number) => `${Math.round(n * 100)}%`

/**
 * The quality of one slide. `titleSize` is the deck's resolved `title` type size (the style's), for
 * the lead-type rule; without it that rule is skipped.
 */
export function slideQuality(report: LayoutReport, opts: { titleSize?: number; balance?: boolean; intent?: SlideIntent; typeFloors?: Partial<TypeFloors> | true } = {}): SlideQuality {
  const profile: GateProfile = opts.intent ?? report.intent ?? 'default'
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
    // an empty large region is a thin one: a comparison slide with its one two-column block in
    // `left` left the right half blank and passed (spro deck 5a45a329 s7)
    const f = own.length ? Math.min(1, area(union(own.map((b) => b.painted))) / Math.max(1, box.width * box.height)) : 0
    if (f < regionFill) {
      regionFill = f
      thinRegion = name
    }
  }

  let lead = 0
  for (const b of content) for (const t of b.text) lead = Math.max(lead, t.fontSize * (t.scale || 1))

  // balance (L1): measured on the content blocks only — no backdrops, overlays or ornaments
  const safeH = Math.max(1, H - 2 * m)
  const flow = content.filter((b) => !b.outOfFlow && !DECORATIVE.has(b.type) && b.painted)
  const lowest = flow.reduce((y, b) => Math.max(y, b.painted!.y + b.painted!.height), m)
  const bottomGap = Math.max(0, Math.min(1, (H - m - lowest) / safeH))
  const safeW = Math.max(1, W - 2 * m)
  const flowRect = union(flow.map((b) => b.painted))
  const leftGap = flowRect ? Math.max(0, Math.min(1, (flowRect.x0 - m) / safeW)) : 0
  const rightGap = flowRect ? Math.max(0, Math.min(1, (W - m - flowRect.x1) / safeW)) : 0
  const titleBottom = flow.filter((b) => b.region === 'title').reduce((y, b) => Math.max(y, b.painted!.y + b.painted!.height), m)
  const body = flow.filter((b) => b.region !== 'title')
  // between the body's blocks (title → body is `topGap`)
  const innerGap = Math.min(1, largestGap(body.map((b) => b.painted!)) / safeH)
  const highest = body.reduce((y, b) => Math.min(y, b.painted!.y), H - m)
  const topGap = body.length ? Math.max(0, Math.min(1, (highest - titleBottom) / safeH)) : 0
  let bodyLead = 0
  for (const b of body) for (const t of b.text) bodyLead = Math.max(bodyLead, t.fontSize * (t.scale || 1))
  const bodyRegions = union(
    Object.entries(report.regions)
      .filter(([name]) => name !== 'title' && body.some((b) => b.region === name))
      .map(([, box]) => box)
  )
  const bodyCover = body.length ? Math.min(1, area(union(body.map((b) => b.painted))) / Math.max(1, area(bodyRegions))) : 0
  let title: SlideQuality['title']
  const titleText = content.filter((b) => b.region === 'title' && !DECORATIVE.has(b.type)).flatMap((b) => b.text)
  if (titleText.length) {
    const t = titleText[0]
    title = { x: Math.round(t.painted.x), y: Math.round(t.painted.y), width: Math.round(t.painted.width), fontSize: Math.round(t.fontSize * (t.scale || 1)) }
  }

  const diagrams = flow.filter((b) => isDiagram(b.type) && b.region !== 'title' && b.region !== 'free')
  const diagramRegions = union(Object.entries(report.regions).filter(([name]) => diagrams.some((b) => b.region === name)).map(([, box]) => box))
  const diagramFill = diagrams.length && diagramRegions ? Math.min(1, area(union(diagrams.map((b) => b.painted))) / Math.max(1, area(diagramRegions))) : 1

  const findings: QualityFinding[] = []
  const poster = profile === 'poster'
  const typeLed = !!opts.titleSize && lead >= opts.titleSize * QUALITY_GATE.displayOfTitle
  // enhance L1: a slide judged on balance is centred, so a small content block no longer leaves
  // a hole — it floats; the golden rubric scored such slides 2 for balance below ~50 % fill
  const minFill = typeLed ? QUALITY_GATE.displayFill : opts.balance ? QUALITY_GATE.balancedMinFill : QUALITY_GATE.minFill
  // CR7a `poster`: big type on calm space is the design; judged on its lead and balance instead
  if (!poster && fill < minFill) {
    findings.push({ code: 'quality/sparse', message: `content covers ${pct(fill)} of the safe area (minimum ${pct(minFill)}): use a roomier design, larger type or more content` })
  }
  // the single region of a blank or full-bleed slide is the slide: `fill` already judged it
  const sole = Object.keys(report.regions).length === 1
  if (!poster && !sole && regionFill < QUALITY_GATE.minRegionFill) {
    findings.push({ code: 'quality/thin-region', region: thinRegion, message: regionFill === 0 ? `region "${thinRegion}" is empty: put a block in it, or a layout without it (one wide region: timeline or blank)` : `region "${thinRegion}" is ${pct(regionFill)} filled (minimum ${pct(QUALITY_GATE.minRegionFill)}): larger type, more items, or another design` })
  }
  if (poster && !sole && regionFill < QUALITY_GATE.posterMinRegionFill) {
    findings.push({ code: 'quality/thin-region', region: thinRegion, message: regionFill === 0 ? `region "${thinRegion}" is empty: put a block in it, or a layout without it (one wide region: poster, timeline or blank)` : `region "${thinRegion}" is ${pct(regionFill)} filled (minimum ${pct(QUALITY_GATE.posterMinRegionFill)} on a poster): put the content in the one region that has room, or a layout without the empty one` })
  }
  if (poster && Math.abs(leftGap - rightGap) > QUALITY_GATE.posterMaxSideExcess) {
    findings.push({ code: 'quality/unbalanced', message: `the poster's content hugs one side (${pct(leftGap)} empty on the left, ${pct(rightGap)} on the right): centre it, or give it the full width` })
  }
  const leadOf = poster ? QUALITY_GATE.posterLeadOfTitle : QUALITY_GATE.leadOfTitle
  if (opts.titleSize && lead > 0 && lead < opts.titleSize * leadOf) {
    findings.push({ code: 'quality/small-type', message: `the largest text is ${Math.round(lead)} units, under the deck's title size ${Math.round(opts.titleSize)}${poster ? ': a poster slide leads with title-size type or larger' : ''}` })
  }
  if (poster && !opts.balance && body.length && Math.abs(bottomGap - topGap) > QUALITY_GATE.maxBottomExcess) {
    findings.push({ code: 'quality/unbalanced', message: `the poster's empty space is lopsided (${pct(topGap)} above the content, ${pct(bottomGap)} below): centre it, or a layout that places it` })
  }
  if (profile === 'diagram' && diagrams.length && diagramFill < QUALITY_GATE.minDiagramFill) {
    findings.push({ code: 'quality/thin-diagram', message: `the diagram fills ${pct(diagramFill)} of its region (minimum ${pct(QUALITY_GATE.minDiagramFill)}): give it the wide region, more steps, or a layout where it leads` })
  }
  // enhance L1: judged only when asked (spro's composed and filled content slides, which set
  // `valign: 'auto'`); the recipes and the dry-run decks keep today's bar
  if (opts.balance && body.length) {
    if (bottomGap - topGap > QUALITY_GATE.maxBottomExcess) {
      findings.push({ code: 'quality/unbalanced', message: `the content ends ${pct(bottomGap)} of the page above the bottom edge (${pct(topGap)} under the title): a larger lead size or visual, move the accent beside the main block, or a layout whose regions fill the page` })
    } else if (innerGap > QUALITY_GATE.maxInnerGap) {
      findings.push({ code: 'quality/unbalanced', message: `an empty band of ${pct(innerGap)} of the page between blocks: keep the blocks of a region together, or put them side by side` })
    }
    if (opts.titleSize && bodyLead > 0 && bodyLead <= opts.titleSize * QUALITY_GATE.floatingLead && bodyCover < QUALITY_GATE.floatingCover) {
      findings.push({
        code: 'quality/floating-body',
        message: `the body is a strip of small text (largest ${Math.round(bodyLead)} units under a ${Math.round(opts.titleSize)} title) covering ${pct(bodyCover)} of its region: one column instead of two, a block that fills the region (cards, a grid, objectives), a split with a visual or an accent, or a lead size`,
      })
    }
  }
  // learning L01 (D10): the smallest reading text against its floor, one finding naming the worst run
  if (opts.typeFloors) {
    const floors: TypeFloors = { ...DEFAULT_TYPE_FLOORS, ...(opts.typeFloors === true ? {} : opts.typeFloors) }
    let worst: { kind: keyof TypeFloors; size: number; type: string; id: string } | null = null
    for (const b of content) {
      if (b.layer === 'backdrop') continue
      for (const t of b.text) {
        const kind = textKind(b.type, b.region, t)
        if (!kind) continue
        const size = t.fontSize * (t.scale || 1)
        if (size < floors[kind] && (!worst || size / floors[kind] < worst.size / floors[worst.kind])) worst = { kind, size, type: b.type, id: b.id }
      }
    }
    if (worst) {
      findings.push({
        code: 'quality/min-type',
        message: `${worst.kind} text at ${Math.round(worst.size)} units (floor ${floors[worst.kind]}) in ${worst.type} \`${worst.id}\`: fewer items, shorter lines or a roomier design, and move the detail to the speaker notes`,
      })
    }
  }
  // CMP2: the design checks the oracle ran (info, e.g. `text/long-measure`, stays advice)
  for (const f of report.findings) {
    if (f.severity === 'info' || !(DESIGN_CODES as readonly string[]).includes(f.code)) continue
    findings.push({ code: f.code as DesignCode, message: f.message + (f.fix ? ` FIX: ${f.fix}` : '') })
  }
  return { profile, diagramFill, fill, regionFill, thinRegion, lead, bottomGap, topGap, innerGap, leftGap, rightGap, bodyLead, bodyCover, ...(title ? { title } : {}), findings }
}

/**
 * The deck's slide-title size (theme + style + deck tokens), for the lead-type rule: the type token
 * the style gives `tls.t.title` (`blockDefaults` `size`, default `title`), resolved.
 */
export function deckTitleSize(deck: DeckSpec): number {
  const tokens = resolveTokens(resolveDeckTheme(deck.theme, deck.style, deckSpecTokens(deck)), deckSpecTokens(deck))
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

/**
 * CS0 — the oracle's geometry findings that block a slide (errors and warnings outside the design
 * checks, which `slideQuality` already carries) — the S4.1 repair loop's "fix this" list.
 */
export function geometryProblems(report: LayoutReport): string[] {
  return report.findings
    .filter((f) => f.severity !== 'info' && !(DESIGN_CODES as readonly string[]).includes(f.code))
    .map((f) => `${f.severity} ${f.code}: ${f.message}`)
}

/**
 * CS0 — everything that keeps a slide from being accepted: geometry problems plus the quality gate.
 * Empty = clean. The dry run's repair loop and the content stress run share this bar.
 */
export function slideProblems(report: LayoutReport, titleSize: number): string[] {
  return [...geometryProblems(report), ...slideQuality(report, { titleSize }).findings.map((f) => `quality ${f.code}: ${f.message}`)]
}
