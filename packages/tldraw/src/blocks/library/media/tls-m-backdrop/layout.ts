/**
 * Pure layout for tls.m.backdrop (sprint 2026-11b S13-b/c) — a slide-wide ground in sixteen kinds.
 *
 * Colours come from the slide theme only (`accent`, `accent2`, `text`, and the ground behind the
 * block), every alpha is baked into the colour (no group opacity), so `backdropEnvelope` can state
 * the luminance range text sits on from the same table the drawing reads (`INKS`). Gradients only on
 * rects (the DOM renderer cannot paint a gradient into a path); paths are solid or stroked. A kind
 * that is busy (`halftone`, `topo` at medium) marks its ground as needing a panel under text: the
 * contrast check treats it like a photo (`design-checks.ts`).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()` (a seeded PRNG).
 */

import type { LayoutContext, LayoutNode, Paint } from '../../../types'
import { hexToRgb, mixHex, relativeLuminance } from '../../../color-math'
import { enumOf, side } from '../_kit'
import { grainDataUri, meshNodes, rgba } from '../tls-m-pattern/layout'
import { BACKDROP_KINDS, BACKDROP_TONES, type BackdropKind, type BackdropProps } from './schema'

type Ink = 'accent' | 'accent2' | 'text' | 'shade'
/** The strongest alpha each ink reaches over the text-safe area, soft / medium. */
export const INKS: Readonly<Record<BackdropKind, ReadonlyArray<{ ink: Ink; soft: number; medium: number }>>> = {
  flat: [],
  mesh: [{ ink: 'accent', soft: 0.18, medium: 0.28 }, { ink: 'accent2', soft: 0.18, medium: 0.28 }],
  aurora: [{ ink: 'accent', soft: 0.16, medium: 0.26 }, { ink: 'accent2', soft: 0.16, medium: 0.26 }],
  split: [{ ink: 'text', soft: 0.06, medium: 0.1 }],
  diagonal: [{ ink: 'accent', soft: 0.08, medium: 0.14 }],
  arcs: [{ ink: 'accent', soft: 0.22, medium: 0.36 }],
  topo: [{ ink: 'text', soft: 0.14, medium: 0.24 }],
  halftone: [{ ink: 'accent', soft: 0.16, medium: 0.26 }],
  blueprint: [{ ink: 'text', soft: 0.07, medium: 0.11 }, { ink: 'text', soft: 0.14, medium: 0.22 }],
  paper: [{ ink: 'text', soft: 0.06, medium: 0.1 }],
  ruled: [{ ink: 'text', soft: 0.12, medium: 0.18 }, { ink: 'accent', soft: 0.35, medium: 0.5 }],
  slate: [{ ink: 'text', soft: 0.05, medium: 0.08 }],
  waves: [{ ink: 'accent', soft: 0.16, medium: 0.24 }, { ink: 'accent2', soft: 0.12, medium: 0.18 }],
  frame: [{ ink: 'text', soft: 0.3, medium: 0.45 }],
  spotlight: [{ ink: 'shade', soft: 0.1, medium: 0.18 }],
  dots: [{ ink: 'accent', soft: 0.14, medium: 0.24 }],
}

/** A kind whose marks are too dense for text to sit on directly (a panel goes under it). */
export function backdropBusy(kind: unknown, intensity: unknown): boolean {
  return kind === 'halftone' || (kind === 'topo' && intensity === 'medium')
}

const QUIET = 0.6
const f = (v: number) => String(Math.round(v * 10) / 10)

/** mulberry32 — a small deterministic PRNG. */
function rng(seed: number): () => number {
  let a = (Math.floor(seed) | 0) + 0x6d2b79f5
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The ground's colour (a solid behind, or a gradient's first stop). */
export function groundOf(ctx: LayoutContext): string {
  const b = ctx.surface?.behind as Paint | undefined
  if (b?.type === 'solid' && /^#/.test(b.color)) return b.color
  if (b && b.type !== 'solid' && b.stops?.[0] && /^#/.test(b.stops[0].color)) return b.stops[0].color
  return ctx.tokens.color.surface
}

export interface BackdropColors {
  ground: string
  accent: string
  accent2: string
  text: string
  /** the vignette ink: black on a dark ground, the text colour on a light one */
  shade: string
}

export function backdropColors(ctx: LayoutContext): BackdropColors {
  const ground = groundOf(ctx)
  const text = ctx.tokens.color.text
  const dark = relativeLuminance(hexToRgb(ground)) < 0.2
  return { ground, accent: ctx.tokens.color.accent, accent2: ctx.tokens.color.accent2, text, shade: dark ? '#000000' : text }
}

/**
 * The relative-luminance range text sits on over this backdrop: the ground and each ink composited
 * over it at its strongest alpha. The contrast check composites the real paint; this is what a
 * planner (the rhythm, a style author) reads without laying the block out.
 */
export function backdropEnvelope(kind: BackdropKind, intensity: 'soft' | 'medium', tone: string, colors: BackdropColors): { min: number; max: number } {
  const lum = (hex: string) => relativeLuminance(hexToRgb(hex))
  const vals = [lum(colors.ground)]
  for (const i of INKS[kind]) vals.push(lum(mixHex(colors.ground, colors[i.ink], i[intensity] * (tone === 'quiet' ? QUIET : 1))))
  return { min: Math.min(...vals), max: Math.max(...vals) }
}

const strokePath = (part: string, W: number, H: number, d: string, color: string, width: number): LayoutNode => ({
  k: 'path', part, box: { x: 0, y: 0, width: W, height: H }, d: d || 'M0 0', stroke: { color, width },
})
const fillPath = (part: string, W: number, H: number, d: string, color: string): LayoutNode => ({
  k: 'path', part, box: { x: 0, y: 0, width: W, height: H }, d: d || 'M0 0', fill: { type: 'solid', color },
})
const rectFill = (part: string, x: number, y: number, w: number, h: number, fill: Paint): LayoutNode => ({ k: 'rect', part, box: { x, y, width: w, height: h }, fill })
const dot = (x: number, y: number, r: number) => `M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x - r)} ${f(y)}Z`

/** The nodes of one kind in a W x H box. Pure; exported for tests. */
export function backdropNodes(kind: BackdropKind, W: number, H: number, c: BackdropColors, a: (i: number) => number, seed: number): LayoutNode[] {
  const R = rng(seed)
  switch (kind) {
    case 'flat':
      return []
    case 'mesh':
      return meshNodes(W, H, { accent: c.accent, accent2: c.accent2 }, a(0), 'md')
    case 'aurora': {
      // three soft diagonal bands: a full-box linear gradient each, peaking at a different place
      const bands = [
        { angle: 158, at: 0.3, ink: c.accent, alpha: a(0) },
        { angle: 166, at: 0.52, ink: c.accent2, alpha: a(1) },
        { angle: 150, at: 0.78, ink: c.accent, alpha: a(0) * 0.7 },
      ]
      return bands.map((b, i) =>
        rectFill(`band[${i}]`, 0, 0, W, H, {
          type: 'linearGradient',
          angle: b.angle,
          stops: [
            { color: rgba(b.ink, 0), at: 0 },
            { color: rgba(b.ink, 0), at: Math.max(0, b.at - 0.2) },
            { color: rgba(b.ink, b.alpha), at: b.at },
            { color: rgba(b.ink, 0), at: Math.min(1, b.at + 0.2) },
            { color: rgba(b.ink, 0), at: 1 },
          ],
        })
      )
    }
    case 'split':
      return [rectFill('field', Math.round(W * 0.62), 0, W - Math.round(W * 0.62), H, { type: 'solid', color: rgba(c.text, a(0)) })]
    case 'diagonal': {
      // a band about 15 degrees off horizontal across the lower part
      const t = Math.tan((15 * Math.PI) / 180) * W
      const y0 = H * 0.7
      const th = H * 0.16
      const d = `M0 ${f(y0)}L${f(W)} ${f(y0 - t)}L${f(W)} ${f(y0 - t + th)}L0 ${f(y0 + th)}Z`
      return [fillPath('band', W, H, d, rgba(c.accent, a(0)))]
    }
    case 'arcs': {
      // concentric rings from the lower-right corner (and a small set at the upper-left)
      let d = ''
      for (const k of [0.22, 0.34, 0.46, 0.58]) {
        const r = H * k
        d += `M${f(W - r)} ${f(H)}A${f(r)} ${f(r)} 0 0 1 ${f(W)} ${f(H - r)}`
      }
      for (const k of [0.12, 0.2]) {
        const r = H * k
        d += `M${f(r)} 0A${f(r)} ${f(r)} 0 0 1 0 ${f(r)}`
      }
      return [strokePath('rings', W, H, d, rgba(c.accent, a(0)), 3)]
    }
    case 'topo': {
      // contour lines: wobbly rings around an off-centre summit (seeded)
      const cx = W * (0.62 + R() * 0.2)
      const cy = H * (0.3 + R() * 0.4)
      const p1 = R() * Math.PI * 2
      const p2 = R() * Math.PI * 2
      let d = ''
      for (let k = 1; k <= 9; k++) {
        const base = H * 0.09 * k
        for (let s = 0; s <= 72; s++) {
          const th = (s / 72) * Math.PI * 2
          const r = base * (1 + 0.14 * Math.sin(3 * th + p1 + k * 0.3) + 0.07 * Math.sin(5 * th + p2))
          const x = Math.min(W - 1, Math.max(1, cx + r * Math.cos(th)))
          const y = Math.min(H - 1, Math.max(1, cy + r * 0.8 * Math.sin(th)))
          d += `${s ? 'L' : 'M'}${f(x)} ${f(y)}`
        }
      }
      return [strokePath('contours', W, H, d, rgba(c.text, a(0)), 2)]
    }
    case 'halftone': {
      // a dot gradient rising from the lower-left corner
      const gap = 36
      let d = ''
      for (let y = gap / 2; y < H; y += gap) {
        for (let x = gap / 2; x < W; x += gap) {
          const t = 1 - Math.min(1, Math.hypot(x / W, (H - y) / H) / 1.05)
          const r = gap * 0.42 * t
          if (r >= 1.2) d += dot(x, y, r)
        }
      }
      return [fillPath('dots', W, H, d, rgba(c.accent, a(0)))]
    }
    case 'blueprint': {
      let fine = ''
      let major = ''
      for (let x = 40; x < W; x += 40) (x % 200 === 0 ? (major += `M${x} 0L${x} ${f(H)}`) : (fine += `M${x} 0L${x} ${f(H)}`))
      for (let y = 40; y < H; y += 40) (y % 200 === 0 ? (major += `M0 ${y}L${f(W)} ${y}`) : (fine += `M0 ${y}L${f(W)} ${y}`))
      return [strokePath('fine', W, H, fine, rgba(c.text, a(0)), 1), strokePath('major', W, H, major, rgba(c.text, a(1)), 2)]
    }
    case 'paper': {
      let d = ''
      for (let i = 0; i < 26; i++) {
        const x = R() * W
        const y = R() * H
        const len = 30 + R() * 70
        const ang = R() * Math.PI
        const bx = x + Math.cos(ang) * len
        const by = y + Math.sin(ang) * len
        d += `M${f(x)} ${f(y)}Q${f((x + bx) / 2 + (R() - 0.5) * 20)} ${f((y + by) / 2 + (R() - 0.5) * 20)} ${f(Math.min(W, Math.max(0, bx)))} ${f(Math.min(H, Math.max(0, by)))}`
      }
      return [
        { k: 'image', part: 'grain', box: { x: 0, y: 0, width: W, height: H }, assetId: '', url: grainDataUri(W, H, c.text, a(0) * 0.8, 0.85), alt: '', fit: 'cover' },
        strokePath('fibres', W, H, d, rgba(c.text, a(0)), 1.5),
      ]
    }
    case 'ruled': {
      let d = ''
      for (let y = 120; y < H - 20; y += 56) d += `M0 ${y}L${f(W)} ${y}`
      const mx = Math.round(W * 0.085)
      return [strokePath('lines', W, H, d, rgba(c.text, a(0)), 2), strokePath('margin', W, H, `M${mx} 0L${mx} ${f(H)}`, rgba(c.accent, a(1)), 3)]
    }
    case 'slate': {
      const smudges: LayoutNode[] = []
      for (let i = 0; i < 4; i++) {
        const w = W * (0.3 + R() * 0.25)
        const h = H * (0.3 + R() * 0.3)
        const x = R() * (W - w)
        const y = R() * (H - h)
        smudges.push(rectFill(`smudge[${i}]`, x, y, w, h, { type: 'radialGradient', cx: 0.5, cy: 0.5, stops: [{ color: rgba(c.text, a(0)), at: 0 }, { color: rgba(c.text, 0), at: 1 }] }))
      }
      return [...smudges, { k: 'image', part: 'grain', box: { x: 0, y: 0, width: W, height: H }, assetId: '', url: grainDataUri(W, H, c.text, 0.05, 1.1), alt: '', fit: 'cover' }]
    }
    case 'waves': {
      const layers = [
        { top: 0.8, amp: 0.035, ph: 0.4, ink: c.accent2, alpha: a(1) },
        { top: 0.85, amp: 0.03, ph: 1.6, ink: c.accent, alpha: a(0) * 0.7 },
        { top: 0.9, amp: 0.025, ph: 2.9, ink: c.accent, alpha: a(0) },
      ]
      return layers.map((l, i) => {
        let d = `M0 ${f(H)}`
        for (let s = 0; s <= 48; s++) {
          const x = (s / 48) * W
          d += `L${f(x)} ${f(H * l.top + H * l.amp * Math.sin((s / 48) * Math.PI * 2 * 1.3 + l.ph))}`
        }
        return fillPath(`wave[${i}]`, W, H, `${d}L${f(W)} ${f(H)}Z`, rgba(l.ink, l.alpha))
      })
    }
    case 'frame': {
      const m = 36
      const t = 28
      let d = `M${m} ${m}L${f(W - m)} ${m}L${f(W - m)} ${f(H - m)}L${m} ${f(H - m)}Z`
      for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [W - m, H - m, -1, -1], [m, H - m, 1, -1]] as const) {
        d += `M${f(x + sx * 10)} ${f(y + sy * (10 + t))}L${f(x + sx * 10)} ${f(y + sy * 10)}L${f(x + sx * (10 + t))} ${f(y + sy * 10)}`
      }
      return [strokePath('frame', W, H, d, rgba(c.text, a(0)), 2)]
    }
    case 'spotlight':
      return [rectFill('vignette', 0, 0, W, H, { type: 'radialGradient', cx: 0.5, cy: 0.45, stops: [{ color: rgba(c.shade, 0), at: 0 }, { color: rgba(c.shade, 0), at: 0.45 }, { color: rgba(c.shade, a(0)), at: 1 }] })]
    case 'dots': {
      // a dot field fading from the right edge: four bands, each one path
      const gap = 44
      const r = 3
      return [1, 0.66, 0.4, 0.2].map((k, band) => {
        let d = ''
        const x1 = W - band * W * 0.14
        const x0 = W - (band + 1) * W * 0.14
        for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) if (x >= x0 && x < x1) d += dot(x, y, r)
        return fillPath(`dots[${band}]`, W, H, d, rgba(c.accent, a(0) * k))
      })
    }
  }
}

export function layout(props: BackdropProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const kind = enumOf(props.kind, BACKDROP_KINDS, 'mesh')
  const tone = enumOf(props.tone, BACKDROP_TONES, 'calm')
  const intensity = enumOf(props.intensity, ['soft', 'medium'] as const, 'soft')
  const seed = typeof props.seed === 'number' && Number.isFinite(props.seed) ? props.seed : 1
  const k = tone === 'quiet' ? QUIET : 1
  const a = (i: number) => (INKS[kind][i]?.[intensity] ?? 0) * k
  return {
    k: 'group',
    part: 'backdrop',
    box: { x: 0, y: 0, width: W, height: H },
    clip: true,
    children: backdropNodes(kind, W, H, backdropColors(ctx), a, seed),
  }
}
