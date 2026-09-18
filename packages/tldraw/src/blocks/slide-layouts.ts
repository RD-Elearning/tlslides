/**
 * D2 — 16 slide layouts as pure geometry functions.
 *
 * Each layout takes a frame (width × height in slide units) and resolved tokens,
 * and returns a `Record<string, Box>` of named regions — no blocks, no renderer,
 * no DOM. Every region stays inside the safe margin; gutters come from the P19
 * spacing scale; no two regions overlap.
 *
 * The safe margin defaults to `tokens.space['3xl']` (96 at 1920×1080), and the
 * column gutter defaults to `tokens.space['xl']` (48), both from doc 02 §2.3.
 *
 * All coordinates are absolute within the frame (origin top-left).
 */

import type { Box, ResolvedTokens } from './types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Safe margin on all four sides, derived from the spacing scale. */
function margin(tokens: ResolvedTokens): number {
  return tokens.space['3xl']
}

/** Column/row gutter, derived from the spacing scale. */
function gutter(tokens: ResolvedTokens): number {
  return tokens.space['xl']
}

/** The safe-margin inset box: the usable content area of the frame. */
function contentArea(frame: { width: number; height: number }, tokens: ResolvedTokens): Box {
  const m = margin(tokens)
  return { x: m, y: m, width: Math.max(0, frame.width - 2 * m), height: Math.max(0, frame.height - 2 * m) }
}

/** Title-band height: roughly the type `heading` size plus some breathing room. */
function titleBand(tokens: ResolvedTokens): number {
  return tokens.type.heading.size + tokens.space.md
}

/** Small title-band height for `section`. */
function sectionTitleBand(tokens: ResolvedTokens): number {
  return tokens.type.title.size + tokens.space.lg
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 1. title — centered title + subtitle                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutTitle(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const titleH = tokens.type.title.size + tokens.space.lg
  const subtitleH = tokens.type.subheading.size + tokens.space.sm
  const totalH = titleH + g + subtitleH
  const startY = ca.y + Math.max(0, (ca.height - totalH) / 2)

  return {
    title: { x: ca.x, y: startY, width: ca.width, height: titleH },
    subtitle: { x: ca.x, y: startY + titleH + g, width: ca.width, height: subtitleH },
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 2. section — large title, small subtitle, centered                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutSection(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const titleH = sectionTitleBand(tokens)
  const subtitleH = tokens.type.lead.size + tokens.space.sm
  const totalH = titleH + g + subtitleH
  const startY = ca.y + Math.max(0, (ca.height - totalH) / 2)

  return {
    title: { x: ca.x, y: startY, width: ca.width, height: titleH },
    subtitle: { x: ca.x, y: startY + titleH + g, width: ca.width, height: subtitleH },
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 3. two-column — left/right split with gutter                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutTwoColumn(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const [left, right] = splitX(ca.x, bodyTop, ca.width, bodyH, 0.5, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    left,
    right,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 4. three-column — equal thirds                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutThreeColumn(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const [a, b, c] = splitXN(ca.x, bodyTop, ca.width, bodyH, 3, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    a, b, c,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 5. four-up — 2×2 grid                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutFourUp(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const [top, bottom] = splitY(ca.x, bodyTop, ca.width, bodyH, 0.5, g)
  const [q1, q2] = splitX(top.x, top.y, top.width, top.height, 0.5, g)
  const [q3, q4] = splitX(bottom.x, bottom.y, bottom.width, bottom.height, 0.5, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    q1, q2, q3, q4,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 6. image-left — image left (60%), text right (40%)                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutImageLeft(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const [image, text] = splitX(ca.x, bodyTop, ca.width, bodyH, 0.6, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    image,
    text,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 7. image-right — text left (40%), image right (60%)                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutImageRight(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const [text, image] = splitX(ca.x, bodyTop, ca.width, bodyH, 0.4, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    text,
    image,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 8. image-top — image top (60%), text bottom (40%)                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutImageTop(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const [image, text] = splitY(ca.x, bodyTop, ca.width, bodyH, 0.6, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    image,
    text,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 9. image-bottom — text top (40%), image bottom (60%)                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutImageBottom(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const [text, image] = splitY(ca.x, bodyTop, ca.width, bodyH, 0.4, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    text,
    image,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 10. grid-3x2 — 3 columns × 2 rows                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutGrid3x2(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const [row1, row2] = splitY(ca.x, bodyTop, ca.width, bodyH, 0.5, g)
  const [c1, c2, c3] = splitXN(row1.x, row1.y, row1.width, row1.height, 3, g)
  const [c4, c5, c6] = splitXN(row2.x, row2.y, row2.width, row2.height, 3, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    c1, c2, c3, c4, c5, c6,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 11. grid-2x3 — 2 columns × 3 rows                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutGrid2x3(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const [left, right] = splitX(ca.x, bodyTop, ca.width, bodyH, 0.5, g)
  const [a, b, c] = splitYN(left.x, left.y, left.width, left.height, 3, g)
  const [d, e, f] = splitYN(right.x, right.y, right.width, right.height, 3, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    a, b, c, d, e, f,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 12. comparison — title bar + two equal columns                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutComparison(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const [left, right] = splitX(ca.x, bodyTop, ca.width, bodyH, 0.5, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    left,
    right,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 13. timeline — title + horizontal timeline area                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutTimeline(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  // The timeline area occupies the full content width
  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    timeline: { x: ca.x, y: bodyTop, width: ca.width, height: bodyH },
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 14. quote — centered quote with attribution below                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutQuote(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  // Narrow the quote to ~70% of the content width for readability
  const quoteW = Math.round(ca.width * 0.7)
  const quoteX = ca.x + Math.round((ca.width - quoteW) / 2)
  const quoteH = tokens.type.lead.size * 3 + tokens.space.lg // room for ~3 lines of lead text
  const attrH = tokens.type.caption.size + tokens.space.sm
  const totalH = quoteH + g + attrH
  const startY = ca.y + Math.max(0, (ca.height - totalH) / 2)

  return {
    quote: { x: quoteX, y: startY, width: quoteW, height: quoteH },
    attribution: { x: quoteX, y: startY + quoteH + g, width: quoteW, height: attrH },
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 15. kpi-row — title + row of 4 KPI slots                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutKpiRow(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  const ca = contentArea(frame, tokens)
  const g = gutter(tokens)
  const tH = titleBand(tokens)
  const bodyTop = ca.y + tH + g
  const bodyH = ca.height - tH - g
  const cells = splitXN(ca.x, bodyTop, ca.width, bodyH, 4, g)

  return {
    title: { x: ca.x, y: ca.y, width: ca.width, height: tH },
    kpi1: cells[0],
    kpi2: cells[1],
    kpi3: cells[2],
    kpi4: cells[3],
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 16. blank — just the safe margin, one content region                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

function layoutBlank(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box> {
  return {
    content: contentArea(frame, tokens),
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Split helpers (pure geometry, same style as box-model.ts splitBox)             */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Split a rectangular region horizontally (left/right) at a given ratio with a gutter. */
function splitX(
  x: number, y: number, width: number, height: number,
  ratio: number, g: number,
): [Box, Box] {
  const r = Math.max(0, Math.min(1, ratio))
  const available = Math.max(0, width - g)
  const w1 = Math.round(available * r)
  const w2 = available - w1
  return [
    { x, y, width: w1, height },
    { x: x + w1 + g, y, width: w2, height },
  ]
}

/** Split a rectangular region vertically (top/bottom) at a given ratio with a gutter. */
function splitY(
  x: number, y: number, width: number, height: number,
  ratio: number, g: number,
): [Box, Box] {
  const r = Math.max(0, Math.min(1, ratio))
  const available = Math.max(0, height - g)
  const h1 = Math.round(available * r)
  const h2 = available - h1
  return [
    { x, y, width, height: h1 },
    { x, y: y + h1 + g, width, height: h2 },
  ]
}

/** Split a region into N equal-width columns with gutters between them. */
function splitXN(
  x: number, y: number, width: number, height: number,
  n: number, g: number,
): Box[] {
  const totalGutters = Math.max(0, n - 1) * g
  const available = Math.max(0, width - totalGutters)
  const colW = Math.floor(available / n)
  const boxes: Box[] = []
  for (let i = 0; i < n; i++) {
    boxes.push({
      x: x + i * (colW + g),
      y,
      width: i === n - 1 ? available - colW * (n - 1) : colW,
      height,
    })
  }
  return boxes
}

/** Split a region into N equal-height rows with gutters between them. */
function splitYN(
  x: number, y: number, width: number, height: number,
  n: number, g: number,
): Box[] {
  const totalGutters = Math.max(0, n - 1) * g
  const available = Math.max(0, height - totalGutters)
  const rowH = Math.floor(available / n)
  const boxes: Box[] = []
  for (let i = 0; i < n; i++) {
    boxes.push({
      x,
      y: y + i * (rowH + g),
      width,
      height: i === n - 1 ? available - rowH * (n - 1) : rowH,
    })
  }
  return boxes
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Public API                                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

export type SlideLayoutId =
  | 'title'
  | 'section'
  | 'two-column'
  | 'three-column'
  | 'four-up'
  | 'image-left'
  | 'image-right'
  | 'image-top'
  | 'image-bottom'
  | 'grid-3x2'
  | 'grid-2x3'
  | 'comparison'
  | 'timeline'
  | 'quote'
  | 'kpi-row'
  | 'blank'

/**
 * A slide layout: a pure function from a frame and resolved tokens to named boxes.
 */
export interface SlideLayout {
  /** Unique layout identifier. */
  id: SlideLayoutId
  /** Human-readable name. */
  name: string
  /** Compile the layout: pure geometry, no side effects. */
  compile(frame: { width: number; height: number }, tokens: ResolvedTokens): Record<string, Box>
  /** Optional per-region vertical alignment within stacked multi-block regions.
   *  Default: 'start' (top). 'center' distributes leftover height equally above/below.
   *  'end' pushes blocks to the bottom. Used by `compileSlide` when distributing
   *  leftover height after intrinsic-height measurement. */
  regionAlign?: Record<string, 'start' | 'center' | 'end'>
}

/**
 * All 16 shipped slide layouts. Each is a pure `compile(frame, tokens) → Record<string, Box>`.
 */
export const SLIDE_LAYOUTS: SlideLayout[] = [
  { id: 'title', name: 'Title', compile: layoutTitle },
  { id: 'section', name: 'Section', compile: layoutSection },
  { id: 'two-column', name: 'Two Column', compile: layoutTwoColumn },
  { id: 'three-column', name: 'Three Column', compile: layoutThreeColumn },
  { id: 'four-up', name: 'Four Up', compile: layoutFourUp },
  { id: 'image-left', name: 'Image Left', compile: layoutImageLeft },
  { id: 'image-right', name: 'Image Right', compile: layoutImageRight },
  { id: 'image-top', name: 'Image Top', compile: layoutImageTop },
  { id: 'image-bottom', name: 'Image Bottom', compile: layoutImageBottom },
  { id: 'grid-3x2', name: 'Grid 3×2', compile: layoutGrid3x2 },
  { id: 'grid-2x3', name: 'Grid 2×3', compile: layoutGrid2x3 },
  { id: 'comparison', name: 'Comparison', compile: layoutComparison },
  { id: 'timeline', name: 'Timeline', compile: layoutTimeline },
  { id: 'quote', name: 'Quote', compile: layoutQuote, regionAlign: { quote: 'center', attribution: 'start' } },
  { id: 'kpi-row', name: 'KPI Row', compile: layoutKpiRow },
  { id: 'blank', name: 'Blank', compile: layoutBlank },
]

/** Lookup a layout by id. Returns undefined for unknown ids. */
export function getSlideLayout(id: SlideLayoutId): SlideLayout | undefined {
  return SLIDE_LAYOUTS.find((l) => l.id === id)
}
