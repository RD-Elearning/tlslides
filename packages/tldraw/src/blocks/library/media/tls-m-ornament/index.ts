/**
 * tls.m.ornament — art-deco frames, dividers, corner pieces, fans and sunbursts (spro creative CR13,
 * PLAN Appendix C.4). A decoration layer for elegant decks: straight lines and polylines only
 * (no arc commands, so the DOM and SVG renderers agree and every point stays inside the box).
 * Parts: `shape` (the strokes), `accent` (a filled diamond or wedge set when `variant` is filled).
 */
import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, MotionRecipe } from '../../../types'
import { enumOf, side, tintOf } from '../_kit'

export const ORNAMENT_SHAPES = ['frame', 'divider', 'corner', 'fan', 'sunburst'] as const
export type OrnamentShape = (typeof ORNAMENT_SHAPES)[number]

export interface OrnamentProps extends Record<string, unknown> {
  shape?: OrnamentShape
  variant?: 'line' | 'filled'
  tone?: 'accent' | 'accent2' | 'line'
  opacity?: 'soft' | 'medium' | 'strong'
  rotation?: number
}

const schema: BlockSchema = {
  shape: { type: { kind: 'enum', values: [...ORNAMENT_SHAPES] }, role: 'option', label: 'Shape', help: 'frame: a double rule with notched corners; divider: a rule with a diamond; corner: nested corner rules; fan / sunburst: rays.' },
  variant: { type: { kind: 'enum', values: ['line', 'filled'] }, role: 'option', label: 'Variant', help: 'line: strokes only; filled: adds filled diamonds or wedges.' },
  tone: { type: { kind: 'enum', values: ['accent', 'accent2', 'line'] }, role: 'option', label: 'Colour' },
  opacity: { type: { kind: 'enum', values: ['soft', 'medium', 'strong'] }, role: 'option', label: 'Opacity' },
  rotation: { type: { kind: 'number', min: 0, max: 359 }, role: 'option', label: 'Rotation', help: 'Degrees, snapped to quarters (corner, fan).' },
}

const defaults: OrnamentProps = { shape: 'divider', variant: 'line', tone: 'accent', opacity: 'medium' }

const OPACITY = { soft: 0.45, medium: 0.75, strong: 1 } as const
type Pt = [number, number]
const f = (v: number) => String(Math.round(v * 100) / 100)
const poly = (pts: Pt[], close = false) => pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + (close ? 'Z' : '')
const diamond = (cx: number, cy: number, r: number): Pt[] => [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]]
/** Points of a circular arc from `a0` to `a1` degrees (y down), `n` segments. */
const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, n = 24): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt
  })

function paths(shape: OrnamentShape, W: number, H: number, quarter: number, filled: boolean, sw: number): { lines: string; accent: string } {
  const m = Math.max(sw * 2, Math.min(W, H) * 0.04)
  if (shape === 'frame') {
    const notch = (x0: number, y0: number, x1: number, y1: number, n: number): Pt[] => [[x0 + n, y0], [x1 - n, y0], [x1, y0 + n], [x1, y1 - n], [x1 - n, y1], [x0 + n, y1], [x0, y1 - n], [x0, y0 + n]]
    const outer = notch(m, m, W - m, H - m, m * 2.2)
    const inner = notch(m * 3.2, m * 3.2, W - m * 3.2, H - m * 3.2, m * 1.2)
    return { lines: poly(outer, true) + poly(inner, true), accent: filled ? corners(W, H, m) : '' }
  }
  if (shape === 'divider') {
    const cy = H / 2
    const d = Math.min(H / 2 - sw, Math.max(sw * 3, Math.min(W * 0.03, H * 0.35)))
    const cx = W / 2
    const g = d * 2.6
    const lines = poly([[m, cy], [cx - g, cy]]) + poly([[cx + g, cy], [W - m, cy]]) + poly(diamond(cx, cy, d), true) + poly(diamond(cx - g * 0.55, cy, d * 0.4), true) + poly(diamond(cx + g * 0.55, cy, d * 0.4), true)
    return { lines, accent: filled ? poly(diamond(cx, cy, d * 0.62), true) : '' }
  }
  if (shape === 'corner') {
    // nested L-rules from one corner; `quarter` picks the corner (0 top-left, clockwise)
    const R = Math.min(W, H) - sw
    const rules = [0.38, 0.62, 0.86].map((k) => {
      const s = R * k
      const pts: Pt[] = [[sw / 2, s], [sw / 2, sw / 2], [s, sw / 2]]
      return poly(pts.map((p) => turn(p, W, H, quarter)))
    })
    return { lines: rules.join(''), accent: filled ? poly([[sw, sw], [R * 0.18, sw], [sw, R * 0.18]].map((p) => turn(p as Pt, W, H, quarter)), true) : '' }
  }
  const cx = W / 2
  if (shape === 'fan') {
    // rays from the bottom centre (a fan rising from the edge); `quarter` turns it
    const R = Math.min(H, W / 2) - sw
    const rays = Array.from({ length: 9 }, (_, i) => arcPts(cx, H, R, 180 + 20 * i, 180 + 20 * i, 0)[0])
    const lines = rays.map((p) => poly([[cx, H - sw / 2], p.map((v) => v) as Pt])).join('') + poly(arcPts(cx, H - sw / 2, R, 180, 360, 36)) + poly(arcPts(cx, H - sw / 2, R * 0.55, 180, 360, 24))
    const t = (s: string) => (quarter ? s : s)
    return { lines: t(lines), accent: filled ? poly([[cx, H - sw / 2], ...arcPts(cx, H - sw / 2, R * 0.55, 180, 360, 24)], true) : '' }
  }
  // sunburst
  const cy = H / 2
  const R = Math.min(W, H) / 2 - sw
  const r0 = R * 0.22
  const n = 24
  const lines = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    return poly([[cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)], [cx + R * Math.cos(a), cy + R * Math.sin(a)]])
  }).join('') + poly(arcPts(cx, cy, r0, 0, 360, 36), true)
  const wedges = Array.from({ length: n / 2 }, (_, i) => {
    const a0 = (360 * (2 * i)) / n
    const a1 = (360 * (2 * i + 1)) / n
    return poly([...arcPts(cx, cy, R * 0.98, a0, a1, 4), ...arcPts(cx, cy, r0 * 1.4, a1, a0, 4)], true)
  }).join('')
  return { lines, accent: filled ? wedges : '' }
}

/** Four small L brackets in the corners of a frame (the filled frame's accent). */
function corners(W: number, H: number, m: number): string {
  const s = m * 2.2
  const at = (x: number, y: number, dx: number, dy: number) => poly([[x + dx * s, y], [x, y], [x, y + dy * s]])
  return at(m * 3.2, m * 3.2, 1, 1) + at(W - m * 3.2, m * 3.2, -1, 1) + at(W - m * 3.2, H - m * 3.2, -1, -1) + at(m * 3.2, H - m * 3.2, 1, -1)
}

/** Turn a point from the top-left corner to corner `q` (0 TL, 1 TR, 2 BR, 3 BL). */
function turn(p: Pt, W: number, H: number, q: number): Pt {
  const [x, y] = p
  return q === 0 ? [x, y] : q === 1 ? [W - x, y] : q === 2 ? [W - x, H - y] : [x, H - y]
}

function layout(props: OrnamentProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const shape = enumOf(props.shape, ORNAMENT_SHAPES, 'divider')
  const variant = enumOf(props.variant, ['line', 'filled'] as const, 'line')
  const tone = enumOf(props.tone, ['accent', 'accent2', 'line'] as const, 'accent')
  const op = enumOf(props.opacity, ['soft', 'medium', 'strong'] as const, 'medium')
  const rotation = typeof props.rotation === 'number' && Number.isFinite(props.rotation) ? ((props.rotation % 360) + 360) % 360 : 0
  const quarter = Math.round(rotation / 90) % 4
  const color = tone === 'line' ? tintOf(ctx.resolveColor('surface').color, ctx.resolveColor('line').color, 0.9) : ctx.resolveColor(tone).color
  const sw = Math.max(2, Math.min(W, H) * (shape === 'divider' ? 0.02 : 0.006))
  const { lines, accent } = paths(shape, W, H, quarter, variant === 'filled', Math.min(sw, 6))
  const box = { x: 0, y: 0, width: W, height: H }
  const children: LayoutNode[] = [{ k: 'path', part: 'shape', box, d: lines || 'M0 0', stroke: { color, width: Math.min(sw, 6) } }]
  if (accent) children.push({ k: 'path', part: 'accent', box, d: accent, fill: { type: 'solid', color } })
  return { k: 'group', part: 'root', box, opacity: OPACITY[op], children }
}

const motion: MotionRecipe = {
  parts: ['shape', 'accent'],
  preset: 'field-in',
  partMotion: {
    shape: { preset: 'draw-on', delay: 0, stagger: 0 },
    accent: { preset: 'field-in', delay: 300, stagger: 0 },
  },
}

export const tlsMOrnament: BlockDefinition = {
  type: 'tls.m.ornament',
  name: 'Ornament',
  family: 'media',
  tier: 'A',
  summary: 'Art-deco frame, divider, corner rules, fan or sunburst in a theme colour.',
  keywords: ['ornament', 'art deco', 'frame', 'divider', 'border', 'fan', 'sunburst', 'luxury', 'elegant', 'rule'],
  category: 'decoration',
  scope: 'element',
  shortDescription: 'Art-deco frame, divider, corner, fan or sunburst',
  related: ['tls.m.decoration', 'tls.m.pattern', 'tls.x.rule'],
  describe: {
    when: 'Elegant or luxury decks: frame a cover, divide a quote or a section, dress a closing. Place it in its own region or layer.',
    avoid: 'Anything that carries meaning; busy or playful decks (tls.m.decoration).',
    example: { id: 'b_ornament', type: 'tls.m.ornament', props: { shape: 'divider', variant: 'filled', tone: 'accent', opacity: 'medium' } },
  },
  schema,
  defaults,
  size: { preferred: [900, 120], min: [60, 24] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
