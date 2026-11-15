/**
 * spro sprint 2026-11c S20-a/b/d — library pictures (`DeckSpec.assets`) drawn where a block draws an icon.
 *
 * A block's icon prop may hold `lib:<pack>/<name>`. `iconLeaf` keeps that name on its `icon` node; after layout,
 * `resolveLibIcons` (called once per slide-level block by `layoutBlock`) swaps every such node for an `image` node
 * whose URL is a self-contained SVG built from the deck's asset table:
 *
 * - colours are resolved to hex HERE, not left as CSS variables or `currentColor` — the sidecar's resvg renderer
 *   (PNG, PDF/PPTX export) does not read CSS custom properties, and the DOM and resvg must draw the same picture;
 * - each picture is its own SVG document, so ids inside one (Iconify gradients, clip paths) never collide with
 *   another picture on the same slide;
 * - recolouring (S20-d): `mono` → the icon node's own colour (what the block chose for the glyph); `slots` →
 *   `paper`/`ink` take the lighter/darker of the theme's surface and text (so light stays light on a dark theme),
 *   `accent`, `accent2` the theme's, `soft` a pale tint of the accent; `fixed` → drawn as it is.
 *
 * A `lib:` ref the table does not hold draws nothing (an empty group with the node's part) — never the warning
 * glyph, never text. No table at all (every deck before S20) = the tree is returned untouched.
 */

import type { DeckAsset, LayoutContext, LayoutNode } from '../types'
import { mixHex, relativeLuminance, rgbToHex } from '../color-math'
import { parseInk } from '../layout/paint-model'

const HEX = /^#[0-9a-f]{6}$/i

export function isLibRef(name: unknown): name is string {
  return typeof name === 'string' && name.startsWith('lib:') && name.length > 4
}

function lum(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16)
  return relativeLuminance({ r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 })
}

/** The five slot colours of the slide's theme (S20-d), lightness order kept. */
export function slotColours(ctx: Pick<LayoutContext, 'resolveColor'>): Record<'paper' | 'ink' | 'accent' | 'accent2' | 'soft', string> {
  const pick = (role: 'surface' | 'text' | 'accent' | 'accent2', fallback: string): string => {
    const c = ctx.resolveColor(role).color
    return HEX.test(c) ? c : fallback
  }
  const surface = pick('surface', '#ffffff')
  const text = pick('text', '#1f2328')
  const [light, dark] = lum(surface) >= lum(text) ? [surface, text] : [text, surface]
  const accent = pick('accent', '#3b6fd8')
  return { paper: light, ink: dark, accent, accent2: pick('accent2', accent), soft: mixHex(accent, light, 0.72) }
}

/** The picture as one SVG document with hex colours (exported for the specs and `tls.m.asset`). */
export function assetSvg(asset: DeckAsset, colour: string, slots: Record<string, string>): string {
  let body = asset.body
  if (asset.colourMode === 'mono') body = body.replace(/currentColor/g, colour)
  else if (asset.colourMode === 'slots') body = body.replace(/var\(--(paper|ink|accent2|accent|soft)\)/g, (_, k: string) => slots[k] ?? colour)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${asset.viewBox}">${body}</svg>`
}

export function assetUrl(asset: DeckAsset, colour: string, slots: Record<string, string>): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(assetSvg(asset, colour, slots))}`
}

/** Swap `lib:` icon nodes for the deck's pictures. Pure: returns a new tree only where something changed. */
export function resolveLibIcons(node: LayoutNode, ctx: LayoutContext): LayoutNode {
  if (!ctx.libAsset) return node
  let slots: Record<string, string> | undefined
  const walk = (x: LayoutNode): LayoutNode => {
    if (x.k === 'icon') {
      if (!isLibRef(x.name)) return x
      const asset = ctx.libAsset!(x.name)
      if (!asset) return { k: 'group', box: x.box, ...(x.part ? { part: x.part } : {}), children: [] }
      slots ??= slotColours(ctx)
      // a translucent glyph colour (the icon-field ground: `rgba(accent, α)`) → the hex, and α on a wrapping group
      const ink = HEX.test(x.fill) ? { rgb: undefined, alpha: 1 } : parseInk(x.fill)
      const colour = HEX.test(x.fill) ? x.fill : ink?.rgb ? rgbToHex(ink.rgb) : slots.ink
      const image: LayoutNode = {
        k: 'image', box: x.box, ...(x.part ? { part: x.part } : {}), assetId: x.name,
        alt: x.name.slice(4).split('/').pop()!.replace(/-/g, ' '), fit: 'contain', url: assetUrl(asset, colour, slots),
        ...(asset.colourMode === 'mono' ? { ink: colour } : {}),
      }
      const alpha = ink?.alpha ?? 1
      if (alpha >= 0.999) return image
      const local = { ...image, box: { ...x.box, x: 0, y: 0 } }
      delete (local as { part?: string }).part
      return { k: 'group', box: x.box, ...(x.part ? { part: x.part } : {}), opacity: alpha, children: [local] }
    }
    const kids = (x as { children?: LayoutNode[] }).children
    if (Array.isArray(kids)) {
      const next = kids.map(walk)
      return next.some((c, i) => c !== kids[i]) ? ({ ...x, children: next } as LayoutNode) : x
    }
    if (x.k === 'host' && x.poster) {
      const poster = walk(x.poster)
      return poster !== x.poster ? { ...x, poster } : x
    }
    return x
  }
  return walk(node)
}
