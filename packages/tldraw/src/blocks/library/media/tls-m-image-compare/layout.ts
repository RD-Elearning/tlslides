/**
 * Pure layout for tls.m.image-compare — before / after.
 *
 * `side`: two rounded frames with a gap. `split`: one frame; the after image fills it, and the
 * before image sits on top inside a `group.clip` of the LEFT half (the clip group is at the block
 * origin with absolute children, the one arrangement the DOM and the SVG renderer agree on: a clip
 * group at x > 0 would be offset in the DOM but not in the SVG). Labels are pills over the images.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, LintFinding } from '../../../types'
import type { ImageCompareProps } from './schema'
import { altFindings, enumOf, imageLeaf, lineH, onColor, side, str } from '../_kit'
import { placeLines } from '../../diagram/_kit'

function label(ctx: LayoutContext, text: string, part: string, x: number, y: number, maxW: number, anchorRight = false): LayoutNode[] {
  const s = { ...ctx.resolveText('caption'), color: onColor(ctx, '#000000') }
  const ph = Math.ceil(lineH(s)) + 12
  const m = ctx.measureText(text, s, Math.max(1, maxW - 28))
  const pw = Math.min(maxW, Math.ceil(m.width * 1.12) + 28)
  if (pw < 40 || maxW < 60) return []
  const px = anchorRight ? x - pw : x
  return [
    { k: 'rect', part: `${part}.pill`, box: { x: px, y: y - ph, width: pw, height: ph }, fill: { type: 'solid', color: ctx.resolveColor('scrim').color }, radius: ph / 2 },
    ...placeLines(ctx, text, s, { x: px + 14, y: y - ph + 6, width: Math.max(1, pw - 28) }, 'start', 1, part).nodes,
  ]
}

export function layout(props: ImageCompareProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const mode = enumOf(props.mode, ['side', 'split'] as const, 'side')
  const b = (props.before ?? {}) as unknown as Record<string, unknown>
  const a = (props.after ?? {}) as unknown as Record<string, unknown>
  const bl = str(b.label).trim() || 'Before'
  const al = str(a.label).trim() || 'After'
  const out: LayoutNode[] = []
  const inset = 16
  const lineColor = ctx.resolveColor('surface').color

  if (mode === 'split') {
    const half = W / 2
    out.push(imageLeaf(ctx, a.image, a.alt, { x: 0, y: 0, width: W, height: H }, { part: 'after' }))
    out.push({
      k: 'group',
      part: 'before.half',
      clip: true,
      box: { x: 0, y: 0, width: half, height: H },
      children: [imageLeaf(ctx, b.image, b.alt, { x: 0, y: 0, width: W, height: H }, { part: 'before' })],
    })
    out.push(...label(ctx, bl, 'before.label', inset, H - inset, half - 2 * inset))
    out.push(...label(ctx, al, 'after.label', W - inset, H - inset, half - 2 * inset, true))
    if (props.divider !== false) {
      const lw = 4
      out.push({ k: 'rect', part: 'divider', box: { x: half - lw / 2, y: 0, width: lw, height: H }, fill: { type: 'solid', color: lineColor } })
      const r = Math.min(26, H / 4, W / 8)
      out.push({
        k: 'rect',
        part: 'divider.handle',
        box: { x: half - r, y: H / 2 - r, width: 2 * r, height: 2 * r },
        fill: { type: 'solid', color: lineColor },
        stroke: { color: ctx.resolveColor('accent').color, width: 4 },
        // the DOM adds the border outside the box, so the radius must cover it to stay a circle
        radius: r + 4,
      })
    }
  } else {
    const gap = ctx.tokens.space.lg
    const cw = Math.max(1, (W - gap) / 2)
    const radius = Math.min(ctx.tokens.radius.md, cw / 4, H / 4)
    out.push(imageLeaf(ctx, b.image, b.alt, { x: 0, y: 0, width: cw, height: H }, { part: 'before', radius }))
    out.push(imageLeaf(ctx, a.image, a.alt, { x: cw + gap, y: 0, width: cw, height: H }, { part: 'after', radius }))
    out.push(...label(ctx, bl, 'before.label', inset, H - inset, cw - 2 * inset))
    out.push(...label(ctx, al, 'after.label', cw + gap + inset, H - inset, cw - 2 * inset))
    if (props.divider !== false && gap >= 12) {
      out.push({
        k: 'rect',
        part: 'divider',
        box: { x: cw + gap / 2 - 1, y: H * 0.1, width: 2, height: H * 0.8 },
        fill: { type: 'solid', color: ctx.resolveColor('line').color },
      })
    }
  }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children: out }
}

export function lint(props: ImageCompareProps): LintFinding[] {
  const b = (props.before ?? {}) as unknown as Record<string, unknown>
  const a = (props.after ?? {}) as unknown as Record<string, unknown>
  return altFindings([
    { src: b.image, alt: b.alt, part: 'before' },
    { src: a.image, alt: a.alt, part: 'after' },
  ])
}
