/**
 * AC5 — placing a style master's motif at a box of the slide frame.
 *
 * A master block fills its layout region (`resolveMaster`; an unknown region name = the whole
 * frame), and the layouts offer only content regions. A motif in a margin or a corner (a gold rule
 * inside the frame, a red square, a star at the top right) is therefore built from existing
 * structure blocks: nested `tls.l.split`s that cut the frame down to the wanted box, with a
 * `tls.l.spacer` in the panels left empty. No new vocabulary; both renderers, the report and the
 * parity probe see ordinary blocks.
 *
 * The ratios are computed for the 1920 × 1080 widescreen frame (`splitBox`: panels share the box
 * less the gutter, rounded to whole units), so a placed box is exact there and scales with another
 * aspect. They are master-internal numbers: a hairline needs a ratio outside the 0.1..0.9 an author
 * is offered, which `splitBox` accepts (it clamps to 0..1 only).
 */
import type { BlockSpec } from '../types'

const SPACER: BlockSpec = { id: 'sp', type: 'tls.l.spacer', props: {} }
/** `3xs`, the smallest gutter step. */
const GUTTER = 4

const split = (axis: 'x' | 'y', ratio: number, children: BlockSpec[]): BlockSpec => ({
  id: 'split',
  type: 'tls.l.split',
  props: { axis, ratio, gutter: '3xs', children },
})

/** `child` over [s, e] of a span of length L, along `axis`. */
function span(axis: 'x' | 'y', L: number, s: number, e: number, child: BlockSpec): BlockSpec {
  if (!(e > s)) throw new Error(`style motif: empty span [${s}, ${e}]`)
  if (s <= 0 && e >= L) return child
  // first panel = [0, r(L-g)], second = [r(L-g)+g, L] (splitBox rounds the first width)
  if (s <= 0) return split(axis, e / (L - GUTTER), [child, SPACER])
  if (e >= L) return split(axis, (s - GUTTER) / (L - GUTTER), [SPACER, child])
  const cut = s - GUTTER
  return split(axis, cut / (L - GUTTER), [SPACER, span(axis, L - s, 0, e - s, child)])
}

/** `block` placed at the box (x, y, w, h) of a 1920 × 1080 frame. */
export function placePx(block: BlockSpec, x: number, y: number, w: number, h: number): BlockSpec {
  return span('x', 1920, x, x + w, span('y', 1080, y, y + h, block))
}

/** A decoration motif (`tls.m.decoration`). */
export const motif = (shape: string, props: Record<string, unknown> = {}): BlockSpec => ({ id: 'motif', type: 'tls.m.decoration', props: { shape, ...props } })

/** Colour roles a band may name, as the theme colour key they paint. */
const THEME_KEY: Record<string, string> = { accent: 'accent1', accent2: 'accent2', text: 'text', textMuted: 'textMuted', background: 'background', surface: 'surface', warning: 'warning', positive: 'positive', negative: 'negative' }

/**
 * A solid band in a theme colour (`tls.l.field` with an instance surface): a rule, a bar, a square.
 * The colour is the theme's own value (a `theme:` literal, never contrast-adjusted: a black masthead
 * rule stays black whatever the solver would pick for text there); `line` keeps the solved role.
 */
export const band = (role: keyof typeof THEME_KEY | 'line'): BlockSpec => ({
  id: 'band',
  type: 'tls.l.field',
  // a nested child reads its instance style from `props.$block.style` (as `tls.d.pricing` passes it)
  props: { $block: { style: { surface: role === 'line' ? 'line' : `theme:${THEME_KEY[role]}` } } },
})
