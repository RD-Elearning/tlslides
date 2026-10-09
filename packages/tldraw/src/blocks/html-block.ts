/**
 * Shared helpers for `kind: 'html'` (Tier B) blocks.
 *
 * B1: provides `htmlHostNode()` — a single factory that builds the `k: 'host'`
 * LayoutNode with `props` and `vars`, so all 4 Tier B blocks (`tls.c.hero`,
 * `tls.c.feature-grid`, `tls.c.testimonial`, `tls.c.big-stat`) share one
 * code path instead of each duplicating the host-node shape.
 *
 * `vars` maps CSS custom properties for per-instance colour overrides.
 * The rule (B1 H2): emit `vars` only when the block is nested (ctx.depth > 0)
 * or when `ctx.style` sets one of the override keys — otherwise leave
 * `vars` undefined so top-level blocks keep inheriting deck-level vars
 * and theme-switch still works.
 */

import type { LayoutContext, LayoutNode, BlockStyleSpec, HtmlTemplateContext, TextLine, TextRun } from './types'
import type { ColorRole } from './types'

/**
 * Build a `k: 'host'` LayoutNode for a Tier B block.
 *
 * - `props` carries the block's own props so `HostMount` renders the child's
 *   content, not the parent's.
 * - `vars` carries per-instance colour-override CSS custom properties,
 *   computed only when needed (see H2 rule below).
 *
 * @param posterFn The block's poster function (def.poster).
 * @param type The block's type string (e.g. 'tls.c.hero').
 * @param props The block's own props.
 * @param ctx The layout context.
 * @param opts `posterGeometry: true` when the block's template paints the poster's text lines
 *   and metrics (LO7, see `posterText` below): the layout report then trusts the poster.
 */
export function htmlHostNode(
  posterFn: (props: Record<string, unknown>, ctx: LayoutContext) => LayoutNode,
  type: string,
  props: Record<string, unknown>,
  ctx: LayoutContext,
  opts: { posterGeometry?: boolean } = {},
): LayoutNode {
  const posterNode = posterFn(props, ctx)

  // The outer box height must be the poster's *intrinsic* content height, not the
  // region box height it was given. Each poster's own doc comment says it "must be
  // honest about height: compileSlide stacks regions by measured height" (see e.g.
  // tls-c-hero/poster.ts) — but that only holds if the height actually reaches
  // compileSlide's measurement pass (slide-compiler.ts calls `layoutBlock` → here).
  // Echoing back `ctx.box.height` made every Tier B block report exactly the height
  // it was handed, so a region sized for a single-line title (e.g. the "title"
  // region of the `title` slide layout) never grows to fit a taller composite like
  // `tls.c.hero` (kicker + title + subtitle stacked) — the extra content overflows
  // the shape's fixed box and gets clipped instead of the region re-flowing.
  const node: LayoutNode = {
    k: 'host',
    box: { x: 0, y: 0, width: ctx.box.width, height: posterNode.box.height },
    part: 'root',
    render: type,
    poster: posterNode,
    props,
    ...(opts.posterGeometry ? { posterGeometry: true } : {}),
  }

  // H2 rule: emit `vars` only when nested (depth > 0) OR ctx.style sets
  // on/accent/surface. Otherwise vars is `undefined` and today's output
  // (deck-level vars via HostMount's inline style) is untouched.
  const style = ctx.style
  const hasOverride = !!style && (
    style.on !== undefined ||
    style.accent !== undefined ||
    style.surface !== undefined
  )
  const isNested = ctx.depth > 0

  if (isNested || hasOverride) {
    node.vars = buildColorVars(style, ctx)
  }

  return node as LayoutNode
}

/**
 * Build the `vars` object — CSS custom properties for per-instance colour
 * overrides.
 *
 * Mapping (real names from CSS_VAR_MAP in render-dom.tsx):
 * - `'--tls-on' ← ctx.resolveColor('text').color`  (when on is set)
 * - `'--tls-accent' ← ctx.resolveColor('accent').color`  (when accent is set)
 * - `'--tls-text-muted' ← ctx.resolveColor('textMuted').color`  (always, when emitting)
 * - `'--tls-surface'` and `'--tls-surface-color' ← ctx.resolveColor('surface').color`
 *   (only when ctx.style.surface is a string override, or nested)
 *
 * A Paint surface is already handled by `createLayoutContext`'s
 * `effectiveSurface`, so we skip it here to avoid double-setting.
 */
function buildColorVars(
  style: BlockStyleSpec | undefined,
  ctx: LayoutContext,
): Record<string, string> {
  const vars: Record<string, string> = {}

  if (style?.on !== undefined) {
    vars['--tls-on'] = ctx.resolveColor('text' as ColorRole).color
  }
  if (style?.accent !== undefined) {
    vars['--tls-accent'] = ctx.resolveColor('accent' as ColorRole).color
  }
  // surface: only when it's a string override (Paint handled by context).
  // When nested, also emit surface so the child gets its own background.
  if (style?.surface !== undefined) {
    if (typeof style.surface === 'string') {
      vars['--tls-surface'] = ctx.resolveColor('surface' as ColorRole).color
      vars['--tls-surface-color'] = vars['--tls-surface']
    }
  }
  // textMuted: always emit when we're in the vars-emitting branch
  vars['--tls-text-muted'] = ctx.resolveColor('textMuted' as ColorRole).color

  return vars
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* LO7 — the template paints the poster's text                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

type TextNode = Extract<LayoutNode, { k: 'text' }>

/**
 * The text leaves of a poster tree keyed by `propPath` (else `part`), in paint order. A poster that
 * splits one text into one node per line (to centre each line, `centerLines`/`alignText`) keeps
 * the key on every piece, so `lines(key)` is the whole text again.
 */
export function posterTextLeaves(poster: LayoutNode | undefined): Map<string, TextNode[]> {
  const out = new Map<string, TextNode[]>()
  const walk = (n: LayoutNode): void => {
    if (n.k === 'group') n.children.forEach(walk)
    else if (n.k === 'text') {
      const key = n.propPath ?? n.part
      if (key === undefined) return
      const list = out.get(key)
      if (list) list.push(n)
      else out.set(key, [n])
    }
  }
  if (poster) walk(poster)
  return out
}

/** Text height the browser gives `lines` at `style`: one CSS line box (size × line-height) each. */
export function cssTextHeight(lines: number, style: { size: number; lineHeight: number; scale?: number }): number {
  return lines * style.size * (style.scale ?? 1) * style.lineHeight
}

/** CSS that makes the browser paint a poster text leaf's metrics: size, line-height, tracking, no
 *  wrapping of its own (the lines come from the poster). */
export function posterTextCss(style: { size: number; lineHeight: number; letterSpacing: number; scale?: number }): string {
  const size = Math.round(style.size * (style.scale ?? 1) * 100) / 100
  return `font-size:${size}px;line-height:${style.lineHeight};letter-spacing:${style.letterSpacing}em;white-space:nowrap;`
}

/** Escaped markup for one line: its runs as `<strong>`/`<em>` (when `runs`), trailing space trimmed. */
export function lineHtml(line: TextLine, esc: (s: string) => string, runs = true): string {
  const end = line.text.replace(/\s+$/, '').length
  if (!runs || !line.runs || line.runs.length === 0) return esc(line.text.slice(0, end))
  let at = 0
  let html = ''
  for (const r of line.runs as TextRun[]) {
    const text = r.text.slice(0, Math.max(0, end - at))
    at += r.text.length
    if (!text) continue
    let inner = esc(text)
    if (r.bold) inner = `<strong>${inner}</strong>`
    if (r.italic) inner = `<em>${inner}</em>`
    html += inner
  }
  return html
}

/**
 * What an html template needs to paint the poster's text (LO7). `active` is false when the template
 * was called without a poster (`ctx.poster` absent): every helper then returns its fallback and the
 * browser wraps the template's own text, exactly as before LO7.
 */
export interface PosterText {
  readonly active: boolean
  /** The poster's lines for `key` (`propPath`, else `part`), all pieces in order; undefined if none. */
  lines(key: string): TextLine[] | undefined
  /** The poster leaves for `key`, in paint order (empty without a poster). */
  leaves(key: string): TextNode[]
  /** Inner HTML that paints exactly the poster's lines for `key` (one `<br>` between lines; runs
   *  as `<strong>`/`<em>` unless `runs` is false); `''` when the poster has no such text (nothing
   *  fit), `fallback` without a poster. */
  html(key: string, fallback: string, runs?: boolean): string
  /** `posterTextCss` of the leaf for `key`, or `fallback`. */
  css(key: string, fallback: string): string
}

export function posterText(ctx: Pick<HtmlTemplateContext, 'poster' | 'esc'>): PosterText {
  const leaves = posterTextLeaves(ctx.poster)
  const lines = (key: string): TextLine[] | undefined => {
    const list = leaves.get(key)
    return list ? list.flatMap((n) => n.lines) : undefined
  }
  return {
    active: !!ctx.poster,
    lines,
    leaves: (key) => leaves.get(key) ?? [],
    html(key, fallback, runs = true) {
      // With a poster, a text it does not paint (no line fits its box) is not painted live either.
      if (!ctx.poster) return fallback
      const ls = lines(key)
      return ls ? ls.map((l) => lineHtml(l, ctx.esc, runs)).join('<br>') : ''
    },
    css(key, fallback) {
      const n = leaves.get(key)?.[0]
      return n ? posterTextCss(n.style) : fallback
    },
  }
}

/** A short signature of a poster's text (keys, sizes, colours, line texts) — the host re-templates
 *  when it changes even if props and box did not (e.g. a theme with another type scale, or a
 *  template that paints a poster colour such as the hero CTA's on-accent label). */
export function posterTextSignature(poster: LayoutNode | undefined): string {
  if (!poster) return ''
  let sig = ''
  for (const [key, list] of posterTextLeaves(poster)) {
    sig += `${key}:${list[0].style.size}:${list[0].style.color ?? ''}:${list.map((n) => n.lines.map((l) => l.text).join('\n')).join('\n')}|`
  }
  return sig
}
