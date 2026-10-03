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

import type { BlockSpec, LayoutContext, LayoutNode, Box } from '../../types'

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
      const lw = Math.min(n.box.width, line.width)
      const x = align === 'center' ? n.box.x + (n.box.width - lw) / 2 : n.box.x + n.box.width - lw
      out.push({
        ...n,
        box: { x, y: n.box.y + top, width: Math.max(1, lw + 1), height: lh },
        lines: [{ ...line, top: 0, baseline: line.baseline - top }],
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

/** Solid black wash: the surface a scrim leaves behind, so `text` roles resolve light on it. */
export const SCRIM_SURFACE: Paint = { type: 'solid', color: '#000000' }

/** `$block` carrying a per-child surface (what `layoutChild` reads; `BlockSpec.style` is ignored below the top). */
export const onSurface = (surface: Paint): Record<string, unknown> => ({ $block: { style: { surface } } })

export function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(v as string) ? (v as T) : fallback
}
