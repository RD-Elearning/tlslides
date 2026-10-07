/**
 * Layout for tls.g.steps — numbered process strip.
 *
 * Each step is a numbered accent badge, a title (up to two lines) and an optional muted
 * description. Badges are joined by a thin connector (rect, plus a filled arrowhead path for
 * `arrow`) that runs from the right edge of one badge to the left edge of the next, so the strip
 * reads as one chain. Connectors are filled rects, never `k:'line'` nodes: a horizontal line's box
 * height and its SVG endpoint geometry disagree, a rect keeps DOM/SVG parity by construction.
 *
 * Adapts to its box (RV07):
 *  - horizontal: as many columns as fit at >= MIN_COL wide (at most one row per ~2 steps when the
 *    box is narrow, wrapping to a second row); the connector is dropped at a row end;
 *  - vertical: badge on the left, text on the right, a thin rail between badges;
 *  - the description is cut to the lines the height allows (3 -> 0): text is dropped before it
 *    overflows, never squashed; every text box is as wide as its glyphs (`placeLines`).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { StepsProps } from './schema'
import { STEPS_MAX } from './schema'
import { arrowHead, bar, chartColors, clamp, enumOf, lineH, linesHeight, mutedStyle, objs, onColor, placeLines, root, str, style } from '../_kit'

const BADGE = 32
const BADGE_GAP = 10
const MIN_COL = 96
const COL_GAP = 20
const ROW_GAP = 20
const RAIL_PAD = 6
const THICK = 2
const ARROW = 8

interface Step {
  title: string
  description: string
}

/** `steps` may arrive as a JSON string from older decks. */
function readSteps(raw: unknown): Step[] {
  let v = raw
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch {
      v = []
    }
  }
  return objs(v)
    .slice(0, STEPS_MAX)
    .map((s) => ({ title: str(s.title), description: str(s.description) }))
}

export function layout(props: StepsProps, ctx: LayoutContext): LayoutNode {
  const steps = readSteps(props.steps)
  const direction = enumOf(props.direction, ['horizontal', 'vertical'] as const, 'horizontal')
  const connector = enumOf(props.connector, ['line', 'arrow', 'none'] as const, 'line')
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const N = steps.length
  if (N === 0) return { k: 'group', box: { x: 0, y: 0, width: W, height: 0 }, part: 'root', children: [] }

  const c = chartColors(ctx)
  const titleS = style(ctx, 'body', c.text)
  const descS = mutedStyle(ctx, 'caption')
  const numS = style(ctx, 'caption', onColor(ctx, c.accent))
  const xs = Math.max(2, ctx.tokens.space.xs)

  const horizontal = direction === 'horizontal'

  /** One arrangement: `rows` rows of `cols` columns, the description cut to what the height allows. */
  const plan = (rows: number) => {
    const cols = horizontal ? Math.ceil(N / rows) : 1
    const colW = horizontal ? (W - (cols - 1) * COL_GAP) / cols : W
    const textX = horizontal ? 0 : BADGE + 14
    const textW = Math.max(24, horizontal ? colW - 4 : W - textX)
    const rowGap = horizontal ? ROW_GAP : clamp((H - N * BADGE) / Math.max(1, N - 1), 14, 28)
    // Content height of the tallest step for a given description budget.
    const measure = (descLines: number) => {
      const t = steps.map((s) => {
        const th = linesHeight(ctx, s.title, titleS, textW, 2)
        const dh = descLines > 0 && s.description ? linesHeight(ctx, s.description, descS, textW, descLines) : 0
        return { th, dh }
      })
      const body = (x: { th: number; dh: number }) => x.th + (x.dh ? xs + x.dh : 0)
      const h = Math.max(...t.map((x) => (horizontal ? BADGE + BADGE_GAP + body(x) : Math.max(BADGE, body(x)))))
      return { t, h }
    }
    const total = (h: number) => rows * h + (rows - 1) * rowGap
    let descLines = 3
    let m = measure(descLines)
    while (total(m.h) > H && descLines > 0) {
      descLines -= 1
      m = measure(descLines)
    }
    return { rows, cols, colW, textX, textW, rowGap, descLines, m, fits: total(m.h) <= H, total: total(m.h) }
  }

  // Horizontal: the fewest rows whose columns stay >= MIN_COL wide and whose height fits.
  let P = plan(horizontal ? 1 : N)
  if (horizontal) {
    let best = P
    for (let r = 1; r <= N; r++) {
      const p = plan(r)
      if (p.colW < MIN_COL && r < N && p.cols > 1) continue
      best = p
      if (p.fits) break
    }
    P = best
  }
  const { rows, cols, colW, textX, textW, rowGap, descLines, m } = P
  const stepH = m.h
  const top = Math.max(0, (H - P.total) / 2)

  const pos = (i: number) => {
    const r = Math.floor(i / cols)
    const col = i % cols
    return { x: horizontal ? col * (colW + COL_GAP) : 0, y: top + r * (stepH + rowGap) }
  }

  const nodes: LayoutNode[] = []
  steps.forEach((s, i) => {
    const p = pos(i)
    const kids: LayoutNode[] = [
      { k: 'rect', part: `step[${i}].badge`, box: { x: 0, y: 0, width: BADGE, height: BADGE }, fill: { type: 'solid', color: c.accent }, radius: BADGE / 2 },
    ]
    kids.push(...placeLines(ctx, String(i + 1), numS, { x: 0, y: (BADGE - lineH(numS)) / 2, width: BADGE }, 'center', 1, `step[${i}].number`).nodes)
    const tx = textX
    let ty = horizontal ? BADGE + BADGE_GAP : Math.max(0, (BADGE - m.t[i].th - (m.t[i].dh ? xs + m.t[i].dh : 0)) / 2)
    if (!horizontal && m.t[i].th + (m.t[i].dh ? xs + m.t[i].dh : 0) > BADGE) ty = 0
    const title = placeLines(ctx, s.title, titleS, { x: tx, y: ty, width: textW }, 'start', 2, `step[${i}].title`)
    title.nodes.forEach((n) => ((n as any).propPath = `steps.${i}.title`))
    kids.push(...title.nodes)
    if (m.t[i].dh) {
      const d = placeLines(ctx, s.description, descS, { x: tx, y: ty + title.height + xs, width: textW }, 'start', descLines, `step[${i}].description`)
      d.nodes.forEach((n) => ((n as any).propPath = `steps.${i}.description`))
      kids.push(...d.nodes)
    }
    // Connector to the next step (never across a row end). RVM4: it sits inside its step's group
    // (in the group's coordinates), so it can never show before its step: when a row end skips a
    // connector, the later ones' stagger slots move earlier, but their step still hides them.
    // A path keeps its absolute `d`; its full-block box is shifted back by the group's offset.
    const inGroup = (n: LayoutNode): LayoutNode => ({ ...n, box: { ...n.box, x: n.box.x - p.x, y: n.box.y - p.y } })
    const rowEnd = horizontal && (i % cols === cols - 1 || i === N - 1)
    if (connector !== 'none' && i < N - 1 && !rowEnd) {
      const q = pos(i + 1)
      if (horizontal) {
        const cy = BADGE / 2
        const x0 = BADGE + RAIL_PAD
        const tip = q.x - p.x - RAIL_PAD
        const end = connector === 'arrow' ? tip - ARROW : tip
        kids.push(bar({ x: x0, y: cy - THICK / 2, width: Math.max(0, end - x0), height: THICK }, c.muted, `step[${i}].connector`))
        if (connector === 'arrow') kids.push(inGroup(arrowHead(ctx, { x: p.x + tip, y: p.y + cy }, 1, 0, ARROW, c.muted, `step[${i}].connector-arrowhead`)))
      } else {
        const cx = BADGE / 2
        const y0 = BADGE + RAIL_PAD
        const tip = q.y - p.y - RAIL_PAD
        const end = connector === 'arrow' ? tip - ARROW : tip
        kids.push(bar({ x: cx - THICK / 2, y: y0, width: THICK, height: Math.max(0, end - y0) }, c.muted, `step[${i}].connector`))
        if (connector === 'arrow') kids.push(inGroup(arrowHead(ctx, { x: p.x + cx, y: p.y + tip }, 0, 1, ARROW, c.muted, `step[${i}].connector-arrowhead`)))
      }
    }
    nodes.push({ k: 'group', part: `step[${i}]`, box: { x: p.x, y: p.y, width: horizontal ? colW : W, height: stepH }, children: kids })
  })
  return root(ctx, nodes)
}
