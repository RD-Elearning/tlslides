/**
 * Shared helpers for the P5 composites (cover, divider, closing, cards, chart-insight, dashboard,
 * team, objectives).
 *
 * A composite built with `defineCompositeBlock` renders through `ctx.layoutChild`, which wraps every
 * child in a group at the child's box. The DOM renderer offsets such groups, the SVG renderer does
 * not, so a nested tree fails the DOM/SVG parity probe. `composeFlat` runs the same child layouts,
 * then flattens the result to absolute leaves under one root group at (0,0), names each piece's
 * parts (`kicker`, `logo[0]`...), and can centre text lines (the text blocks ignore `align`).
 *
 * Pure: no document/window/Date.now/Math.random.
 */

import type { BlockSpec, LayoutContext, LayoutNode, Box, ResolvedTextStyle } from '../../types'
import { tableMetrics } from '../../layout/measure'
import { rectShadowSpec, shadowCss } from '../../shadow'

/* ── path translation ─────────────────────────────────────────────────────────────────── */

const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }
const fmt = (n: number) => String(Math.round(n * 100) / 100)

/** Shift every absolute coordinate of an SVG path by (dx, dy). Relative commands are left alone. */
export function translatePath(d: string, dx: number, dy: number): string {
  if (!dx && !dy) return d
  const toks = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []
  const out: string[] = []
  let i = 0
  let first = true
  while (i < toks.length) {
    const cmd = toks[i++]
    if (!/[A-Za-z]/.test(cmd)) continue
    const up = cmd.toUpperCase()
    const firstM = first && cmd === 'm'
    const abs = cmd === up
    first = false
    let rep = 0
    const n = ARGS[up]
    out.push(cmd)
    if (n === 0) continue
    while (i < toks.length && !/[A-Za-z]/.test(toks[i])) {
      const args = toks.slice(i, i + n).map(Number)
      i += n
      if (abs || (firstM && rep === 0)) {
        if (up === 'H') args[0] += dx
        else if (up === 'V') args[0] += dy
        else if (up === 'A') {
          args[5] += dx
          args[6] += dy
        } else for (let k = 0; k + 1 < args.length; k += 2) (args[k] += dx), (args[k + 1] += dy)
      }
      out.push(args.map(fmt).join(' '))
      rep++
    }
  }
  return out.join(' ')
}

/* ── flatten ──────────────────────────────────────────────────────────────────────────── */

/**
 * Absolute leaves for `node` placed at (dx, dy). Groups dissolve; path and line nodes (whose
 * geometry is in block coordinates) are translated and re-boxed to `full`. Depth-overflow error
 * groups survive as empty groups so tests can still see them.
 */
export function flattenNode(node: LayoutNode, dx: number, dy: number, full: Box): LayoutNode[] {
  const x = dx + node.box.x
  const y = dy + node.box.y
  if (node.k === 'group') {
    if (node.part && node.part.startsWith('lint/')) return [{ ...node, box: { ...node.box, x, y } }]
    return node.children.flatMap((c) => flattenNode(c, x, y, full))
  }
  if (node.k === 'path') return [{ ...node, box: full, d: translatePath(node.d, x, y) }]
  if (node.k === 'line') {
    return [{ ...node, box: full, from: { x: node.from.x + x, y: node.from.y + y }, to: { x: node.to.x + x, y: node.to.y + y } }]
  }
  return [{ ...node, box: { ...node.box, x, y } } as LayoutNode]
}

/* ── part naming ──────────────────────────────────────────────────────────────────────── */

/** Tag every node of one piece with its group name (final `group` / `group[i]` names are set by `composeFlat`). */
export function namePiece(nodes: LayoutNode[], id: string): LayoutNode[] {
  return nodes.map((n) => ({ ...n, part: id }) as LayoutNode)
}

const TABLE = tableMetrics()

/**
 * Rendered width of one line. `estimateMetrics` uses one average glyph width and runs 10-25% wide for
 * large Inter text, which shows as a visibly off-centre title; the per-glyph advance table is within
 * ~3% (measured in the browser on the tour deck), so centring uses it.
 */
export function lineWidth(text: string, style: ResolvedTextStyle): number {
  try {
    return TABLE(text, style).lines[0]?.width ?? 0
  } catch {
    return 0
  }
}

/** Split text nodes into one node per line, shifted so each line is centred (or end-aligned) in the node's box. */
export function alignText(nodes: LayoutNode[], align: 'start' | 'center' | 'end'): LayoutNode[] {
  if (align === 'start') return nodes
  const out: LayoutNode[] = []
  for (const n of nodes) {
    if (n.k !== 'text') {
      out.push(n)
      continue
    }
    const lh = n.style.size * (n.style.scale ?? 1) * n.style.lineHeight
    n.lines.forEach((line, i) => {
      const top = line.top ?? i * lh
      const lw = Math.min(n.box.width, lineWidth(line.text, n.style) || line.width)
      const x = align === 'center' ? n.box.x + (n.box.width - lw) / 2 : n.box.x + n.box.width - lw
      // AC8: a centred small label (caption size and below) keeps 6 % slack on its right, inside the
      // original box: headless Chromium rounds each advance of a 22 px glyph to a whole pixel (+3–5 %,
      // AC3 notes), and a box shrunk to the measured width then wrapped "lan.tran@example.edu" onto
      // two lines in the browser. The text still starts at `x`, so nothing moves.
      const size = n.style.size * (n.style.scale ?? 1)
      const slack = align === 'center' && size <= 24 ? Math.min(lw * 0.06 + 2, n.box.x + n.box.width - (x + lw + 1)) : 0
      out.push({
        ...n,
        box: { x, y: n.box.y + top, width: Math.max(1, lw + 1 + Math.max(0, slack)), height: lh },
        lines: [{ ...line, top: 0, baseline: line.baseline - top }],
        // CMP1 (X3): one centred / end-aligned paragraph, emitted per line (renderers ignore it).
        align,
      } as LayoutNode)
    })
  }
  return out
}

/** A piece to place: a spec, the box it gets, its part name and optional text alignment. */
export interface Piece {
  id: string
  /** Part group: pieces sharing a group are named `group[0]`, `group[1]`... (default: `id`). */
  group?: string
  spec?: BlockSpec
  /** Pre-built absolute leaves instead of a spec (shapes the child blocks cannot draw, e.g. a pill). */
  raw?: LayoutNode[]
  box: Box
  align?: 'start' | 'center' | 'end'
}

/** Lay out one piece with `ctx.layoutChild`, flatten it to absolute leaves and name its parts. */
export function placePiece(ctx: LayoutContext, p: Piece, full: Box): LayoutNode[] {
  const box = { ...p.box, width: Math.max(0, p.box.width || 0), height: Math.max(0, p.box.height || 0) }
  const flat = p.raw
    ? p.raw.map((n) => ({ ...n, box: { ...n.box, width: Math.max(0, n.box.width), height: Math.max(0, n.box.height) } }) as LayoutNode)
    : flattenNode(ctx.layoutChild(p.spec as BlockSpec, box), 0, 0, full)
  return alignText(namePiece(flat, p.group ?? p.id), p.align ?? 'start')
}

/** Compose pieces (in paint order) into one root group at (0,0) holding absolute leaves. */
export function composeFlat(ctx: LayoutContext, pieces: Piece[], height?: number): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, height ?? ctx.box.height) || 0
  const full: Box = { x: 0, y: 0, width: W, height: H }
  const nodes = pieces.flatMap((p) => placePiece(ctx, p, full))
  const count = new Map<string, number>()
  for (const n of nodes) if (n.part) count.set(n.part, (count.get(n.part) ?? 0) + 1)
  const seen = new Map<string, number>()
  const named = nodes.map((n) => {
    const g = n.part
    if (!g || (count.get(g) ?? 0) < 2) return n
    const i = seen.get(g) ?? 0
    seen.set(g, i + 1)
    return { ...n, part: `${g}[${i}]` } as LayoutNode
  })
  return { k: 'group', part: 'root', box: full, children: named }
}

/** Natural heights of `specs` measured at `width` (each at least `floor`). */
export function measureHeights(ctx: LayoutContext, specs: BlockSpec[], width: number, floor = 1): number[] {
  const wctx = ctx.withBox ? ctx.withBox({ width, height: ctx.box.height }) : ctx
  return specs.map((s) => Math.max(floor, wctx.measureIntrinsicSize ? wctx.measureIntrinsicSize(s).height : 0))
}

/* ── test helpers ─────────────────────────────────────────────────────────────────────── */

/** Container levels of a spec tree, root = 1 (counts `props.children` only, the real channel). */
export function specDepth(spec: BlockSpec): number {
  const kids = (spec.props as { children?: BlockSpec[] } | undefined)?.children
  return 1 + (Array.isArray(kids) && kids.length ? Math.max(...kids.map(specDepth)) : 0)
}

/** Every `lint/…` marker part (depth overflow etc.) found in a layout tree. */
export function lintParts(root: LayoutNode): string[] {
  const out: string[] = []
  const walk = (n: LayoutNode) => {
    if (n.part?.startsWith('lint/')) out.push(n.part)
    if (n.k === 'group') n.children.forEach(walk)
  }
  walk(root)
  return out
}

/** Every spec in a tree, depth first. */
export function specNodes(spec: BlockSpec): BlockSpec[] {
  const kids = (spec.props as { children?: BlockSpec[] } | undefined)?.children
  return [spec, ...(Array.isArray(kids) ? kids.flatMap(specNodes) : [])]
}

/** Strings only, trimmed, empties dropped, capped. */
export function strings(v: unknown, max: number): string[] {
  return (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, max)
}

/* ── slide-block helpers ──────────────────────────────────────────────────────────────── */

import type { Paint, TypeToken } from '../../types'
import { plainOf, toMeasurable } from '../text/_engine/rich'

export { plainOf, toMeasurable }

/** The first type token (largest first) whose text wraps to at most `maxLines` lines at `width`. */
export function pickToken(ctx: LayoutContext, text: unknown, width: number, tokens: TypeToken[], maxLines: number): TypeToken {
  const t = toMeasurable(text)
  for (const tk of tokens) {
    try {
      if (ctx.measureText(t, ctx.resolveText(tk), Math.max(1, width)).lines.length <= maxLines) return tk
    } catch {
      /* fall through to the smallest token */
    }
  }
  return tokens[tokens.length - 1]
}

/**
 * AC8.5 — does `text` at `token` wrap well at `width` for a display headline: at most `maxLines`,
 * stable (the same line count at 98.5 % and at 104 % of the width — the browser's wrap, within
 * the width table's few per cent, then agrees with the report's; the table over-counts more often
 * than it under-counts) and no one-word first or last line
 * when it wraps ("Why / mid-market, / why now"; `noOrphan: false` skips that rule)?
 */
export function stableWrap(ctx: LayoutContext, text: unknown, width: number, token: TypeToken, maxLines: number, noOrphan = true): boolean {
  const t = toMeasurable(text)
  const w = Math.max(1, width)
  try {
    const style = ctx.resolveText(token)
    const lines = ctx.measureText(t, style, w).lines
    if (lines.length > maxLines) return false
    if (ctx.measureText(t, style, w * 0.985).lines.length !== lines.length) return false
    if (ctx.measureText(t, style, w * 1.04).lines.length !== lines.length) return false
    const words = (i: number) => lines[i].text.trim().split(/\s+/).filter(Boolean).length
    return !(noOrphan && lines.length > 1 && (words(0) < 2 || words(lines.length - 1) < 2))
  } catch {
    return false
  }
}

/** Solid black wash: the surface a scrim leaves behind, so `text` roles resolve light on it. */
export const SCRIM_SURFACE: Paint = { type: 'solid', color: '#000000' }

/** `$block` carrying a per-child surface (what `layoutChild` reads; `BlockSpec.style` is ignored below the top). */
export const onSurface = (surface: Paint): Record<string, unknown> => ({ $block: { style: { surface } } })

export function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(v as string) ? (v as T) : fallback
}

/* ── AC4: the deck card surface ─────────────────────────────────────────────────────────── */

/** What a card-like block paints for one neutral card (`cardPaint`). */
export interface CardPaint {
  /** Card fill (absent = none: outline / ghost). */
  fill?: Paint
  /** Card border (absent = none). */
  stroke?: { color: string; width: number }
  /** `rect.shadow` for the card. */
  shadow?: 0 | 1 | 2 | 'hard'
  /** `ghost` with a stroke: a rule along the card's top edge instead of a border. */
  topRule?: { color: string; width: number }
  /** What the card's text sits on: its fill when opaque, else what is behind the block. */
  surface: Paint
  /** True when the deck surface changed the block's own look (a block may adjust spacing). */
  styled: boolean
}

const GLASS_DARK = 'rgba(255,255,255,0.12)'
const GLASS_LIGHT = 'rgba(255,255,255,0.55)'
const GLASS_EDGE_DARK = 'rgba(255,255,255,0.35)'
const GLASS_EDGE_LIGHT = 'rgba(255,255,255,0.9)'

/**
 * AC4 — the one helper every card-like block paints its neutral cards with (ai-curation §2.3 rank 3).
 * `base` is the block's own look for a neutral card (its default tone); accent cards, featured
 * tiers and explicit tones a block knob sets (`tone: outline`, …) do not call this. With no deck
 * surface (`ctx.tokens.surface` absent) the result is `base`, so a deck without a style paints
 * exactly as before.
 *
 * - `filled`: `base.fill`; border per `stroke` (`none` keeps `base.stroke`).
 * - `outline`: no fill; a border (`hairline` 2 in `line`, `bold` 3 in `text`; `none` = hairline).
 * - `glass`: translucent white (12 % on a dark slide, 55 % on a light one) + a light hairline; the
 *   blur is a DOM-only enhancement of html templates (§4.2), never drawn here.
 * - `ghost`: no fill, no border; a `stroke` becomes a top rule.
 * - `raised`: the theme `surface` fill, no border unless `stroke`, shadow ≥ 1 (default 2).
 * `shadow` applies to filled / glass / raised cards (an unfilled card casts none).
 */
export function cardPaint(
  ctx: LayoutContext,
  base: { fill?: Paint; stroke?: { color: string; width: number } } = {}
): CardPaint {
  const s = ctx.tokens.surface
  const behind: Paint = ctx.surface?.behind ?? { type: 'solid', color: ctx.resolveColor('surface').color }
  const opaque = (p: Paint | undefined): Paint => (p && p.type === 'solid' && !/^rgba|transparent/i.test(p.color) ? p : behind)
  if (!s) return { fill: base.fill, stroke: base.stroke, surface: opaque(base.fill), styled: false }
  const line = ctx.resolveColor('line').color
  const text = ctx.resolveColor('text').color
  const border = s.stroke === 'bold' ? { color: text, width: 3 } : s.stroke === 'hairline' ? { color: line, width: 2 } : undefined
  const dark = (ctx.surface?.luminance ?? 1) < 0.35
  const shadow = s.shadow || undefined
  switch (s.card) {
    case 'outline':
      return { stroke: border ?? { color: line, width: 2 }, surface: behind, styled: true }
    case 'ghost':
      return { ...(border ? { topRule: border } : {}), surface: behind, styled: true }
    case 'glass':
      return {
        fill: { type: 'solid', color: dark ? GLASS_DARK : GLASS_LIGHT },
        stroke: s.stroke === 'bold' ? border : { color: dark ? GLASS_EDGE_DARK : GLASS_EDGE_LIGHT, width: 2 },
        ...(shadow ? { shadow } : {}),
        surface: behind,
        styled: true,
      }
    case 'raised': {
      const fill: Paint = { type: 'solid', color: ctx.resolveColor('surface').color }
      return { fill, ...(border ? { stroke: border } : {}), shadow: shadow ?? 2, surface: fill, styled: true }
    }
    default:
      return { fill: base.fill, stroke: border ?? base.stroke, ...(shadow ? { shadow } : {}), surface: opaque(base.fill), styled: true }
  }
}

/** The card's paint nodes for `box`: the rect (fill, border, shadow) and a ghost card's top rule. */
export function cardNodes(cp: CardPaint, box: Box, radius?: number | number[], part?: string): LayoutNode[] {
  const out: LayoutNode[] = []
  if (cp.fill || cp.stroke || cp.shadow) {
    out.push({
      k: 'rect',
      box: { ...box },
      ...(part ? { part } : {}),
      ...(cp.fill ? { fill: cp.fill } : {}),
      ...(cp.stroke ? { stroke: cp.stroke } : {}),
      ...(radius !== undefined ? { radius } : {}),
      ...(cp.shadow ? { shadow: cp.shadow } : {}),
    } as LayoutNode)
  }
  if (cp.topRule) out.push({ k: 'rect', box: { x: box.x, y: box.y, width: box.width, height: cp.topRule.width }, ...(part ? { part: `${part}.rule` } : {}), fill: { type: 'solid', color: cp.topRule.color } })
  return out
}

/**
 * AC4 — the CSS an html template paints a card with, read from its poster (the poster's `cardNodes`
 * for `part`): background, the border as an *inset* box-shadow (a CSS border would move the
 * template's content off the poster's geometry), the drop shadow, a ghost card's top rule, and for a
 * translucent (glass) fill the DOM-only `backdrop-filter` blur (§4.2). `undefined` when there is no
 * poster (the template's own default applies); `''` when the poster paints no card (ghost).
 */
export function cardCssFromPoster(poster: LayoutNode | undefined, part: string): string | undefined {
  if (!poster) return undefined
  let rect: (LayoutNode & { k: 'rect' }) | undefined
  let rule: (LayoutNode & { k: 'rect' }) | undefined
  const walk = (n: LayoutNode): void => {
    if (n.k === 'group') n.children.forEach(walk)
    else if (n.k === 'rect' && n.part === part) rect = n
    else if (n.k === 'rect' && n.part === `${part}.rule`) rule = n
  }
  walk(poster)
  if (!rect && !rule) return ''
  const shadows: string[] = []
  let css = ''
  if (rect?.fill?.type === 'solid') {
    css += `background:${rect.fill.color};`
    if (/^rgba/i.test(rect.fill.color)) css += 'backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);'
  }
  if (rect?.stroke) shadows.push(`inset 0 0 0 ${rect.stroke.width}px ${rect.stroke.color}`)
  if (rule?.fill?.type === 'solid') shadows.push(`inset 0 ${rule.box.height}px 0 0 ${rule.fill.color}`)
  const drop = rectShadowSpec(rect?.shadow, rect?.stroke?.color)
  if (drop) shadows.push(shadowCss(drop))
  if (shadows.length) css += `box-shadow:${shadows.join(',')};`
  if (typeof rect?.radius === 'number') css += `border-radius:${rect.radius}px;`
  return css
}
