/**
 * P4 media kit: the small pure helpers the `tls.m.*` image, people and brand blocks share.
 *
 * Rules baked in: an image that cannot be resolved is still emitted as an `image` node (without a
 * `url`), so both renderers draw their dashed placeholder with the alt text, never a broken box;
 * avatars degrade to initials on a `surfaceAlt` disc; every colour is a role or a mix of roles.
 * The `image` node has no clip path, filter or blend, so shapes are limited to `radius`
 * (a circle is `radius = size / 2`).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, LintFinding } from '../../types'
import { onColor, readableOn, tintOf } from '../text/_engine/color'
import { placeText } from '../text/_engine/text-place'
import { asArr, clamp, enumOf, isNum, str, lineH } from '../data/_chart/kit'

export { asArr, clamp, enumOf, isNum, str, lineH, onColor, readableOn, tintOf }

/** Plain objects of a list slot (anything else is dropped). */
export function objs(v: unknown): Array<Record<string, unknown>> {
  return asArr<unknown>(v).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x))
}

/** Finite, non-negative box side. */
export const side = (v: number) => (isNum(v) ? Math.max(0, v) : 0)

/**
 * Initials of a name: the first letter of each of the first two words, upper-cased, keeping the
 * combining marks of a decomposed letter (so "Đặng Ánh" gives "ĐÁ"). One word gives one letter;
 * no letters at all gives an empty string.
 */
export function initialsOf(name: unknown): string {
  const words = str(name).normalize('NFC').split(/\s+/).filter(Boolean)
  const out: string[] = []
  for (const w of words) {
    const m = w.match(/\p{L}\p{M}*/u)
    if (m) out.push(m[0].toUpperCase())
    if (out.length === 2) break
  }
  return out.join('')
}

/** An `image` node. With no resolvable URL the renderers show the dashed placeholder + alt. */
export function imageLeaf(
  ctx: LayoutContext,
  src: unknown,
  alt: unknown,
  box: { x: number; y: number; width: number; height: number },
  o: { part: string; fit?: 'cover' | 'contain'; focal?: [number, number]; radius?: number }
): LayoutNode {
  const id = str(src).trim()
  const url = id ? ctx.resolveAsset?.(id) : undefined
  return {
    k: 'image',
    part: o.part,
    box: { x: box.x, y: box.y, width: side(box.width), height: side(box.height) },
    assetId: id,
    alt: str(alt),
    fit: o.fit ?? 'cover',
    ...(o.focal ? { focal: o.focal } : {}),
    ...(o.radius ? { radius: o.radius } : {}),
    ...(url ? { url } : {}),
  }
}

/** True when `src` resolves to a renderable URL in this context. */
export function hasImage(ctx: LayoutContext, src: unknown): boolean {
  const id = str(src).trim()
  return !!id && !!ctx.resolveAsset?.(id)
}

export type AvatarShape = 'circle' | 'rounded' | 'square'

export function avatarRadius(ctx: LayoutContext, shape: AvatarShape, size: number): number {
  return shape === 'circle' ? size / 2 : shape === 'rounded' ? Math.min(ctx.tokens.radius.md, size / 2) : 0
}

export interface AvatarOpts {
  name: unknown
  src: unknown
  x: number
  y: number
  size: number
  shape: AvatarShape
  /** Part of the photo (or the fallback disc). Ring and initials get `.ring` / `.initials`. */
  part: string
  /** Accent ring drawn as the outer `ringW` of the avatar, so the box never grows. */
  ring?: boolean
  /** A surface-coloured edge so overlapping avatars read as separate discs. */
  edge?: string
}

/**
 * One avatar: optional accent ring, then the photo, or (no image, or an image that cannot be
 * resolved) initials centred on a `surfaceAlt` disc.
 */
export function avatarLeaves(ctx: LayoutContext, o: AvatarOpts): LayoutNode[] {
  const size = Math.max(1, side(o.size))
  const out: LayoutNode[] = []
  const surfaceAlt = ctx.resolveColor('surfaceAlt').color
  let inner = { x: o.x, y: o.y, size }
  if (o.edge) {
    out.push({
      k: 'rect',
      part: `${o.part}.edge`,
      box: { x: o.x, y: o.y, width: size, height: size },
      fill: { type: 'solid', color: o.edge },
      radius: avatarRadius(ctx, o.shape, size),
    })
    const e = Math.max(2, Math.round(size * 0.05))
    inner = { x: o.x + e, y: o.y + e, size: Math.max(1, size - 2 * e) }
  }
  if (o.ring) {
    const rw = Math.max(3, Math.round(inner.size * 0.045))
    out.push({
      k: 'rect',
      part: `${o.part}.ring`,
      box: { x: inner.x, y: inner.y, width: inner.size, height: inner.size },
      fill: { type: 'solid', color: ctx.resolveColor('accent').color },
      radius: avatarRadius(ctx, o.shape, inner.size),
    })
    const gap = Math.max(2, Math.round(rw * 0.6))
    const pad = rw + gap
    inner = { x: inner.x + pad, y: inner.y + pad, size: Math.max(1, inner.size - 2 * pad) }
    // a surface gap between ring and photo
    out.push({
      k: 'rect',
      part: `${o.part}.gap`,
      box: { x: inner.x - gap, y: inner.y - gap, width: inner.size + 2 * gap, height: inner.size + 2 * gap },
      fill: { type: 'solid', color: ctx.resolveColor('surface').color },
      radius: avatarRadius(ctx, o.shape, inner.size + 2 * gap),
    })
  }
  const radius = avatarRadius(ctx, o.shape, inner.size)
  const box = { x: inner.x, y: inner.y, width: inner.size, height: inner.size }
  if (hasImage(ctx, o.src)) {
    out.push(imageLeaf(ctx, o.src, o.name, box, { part: o.part, radius }))
    return out
  }
  out.push({ k: 'rect', part: o.part, box, fill: { type: 'solid', color: surfaceAlt }, radius })
  const letters = initialsOf(o.name)
  if (letters) {
    const base = ctx.resolveText('body', { size: Math.max(10, Math.round(inner.size * 0.38)) })
    const style = { ...base, color: readableOn(ctx.resolveColor('textMuted').color, surfaceAlt) }
    const p = placeText(ctx, letters, style, { x: inner.x, y: inner.y, width: inner.size }, 'center', { part: `${o.part}.initials` })
    const dy = Math.max(0, (inner.size - lineH(style)) / 2)
    out.push(...p.nodes.map((n) => ({ ...n, box: { ...n.box, y: n.box.y + dy } }) as LayoutNode))
  }
  return out
}

/** `alt/missing` warnings for image items: an image that is content needs a description. */
export function altFindings(items: Array<{ src: unknown; alt: unknown; part?: string }>): LintFinding[] {
  const out: LintFinding[] = []
  items.forEach((it, i) => {
    if (str(it.src).trim() && !str(it.alt).trim()) {
      out.push({
        level: 'warning',
        rule: 'alt/missing',
        ...(it.part ? { part: it.part } : {}),
        message: `Image ${i + 1} has no alt text: describe what it shows in 1-10 words.`,
      })
    }
  })
  return out
}

/**
 * Width / height of a logo: the explicit `ratio` slot, else the natural size recorded in the
 * asset table (`ctx.asset`), else `undefined` (unknown). Clamped to 0.2..8.
 */
export function logoRatio(ctx: LayoutContext, src: unknown, ratio: unknown): number | undefined {
  const r = typeof ratio === 'number' ? ratio : typeof ratio === 'string' && ratio.trim() !== '' ? Number(ratio) : NaN
  if (Number.isFinite(r) && r > 0) return clamp(r, 0.2, 8)
  const id = str(src).trim()
  const a = id ? ctx.asset?.(id) : undefined
  return a && a.width > 0 && a.height > 0 ? clamp(a.width / a.height, 0.2, 8) : undefined
}
