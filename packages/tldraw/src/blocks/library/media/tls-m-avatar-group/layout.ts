/**
 * Pure layout for tls.m.avatar-group — a row of overlapping portraits with a +N overflow bubble.
 *
 * At most `max` avatars are drawn (later ones on top, each with a surface-coloured edge so the
 * overlap reads); the rest collapse into one `+N` bubble. The size shrinks to fit the width. The
 * caption sits to the right when there is room, else under the row.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { AvatarGroupProps } from './schema'
import { GROUP_MAX_PEOPLE } from './schema'
import { asArr, avatarLeaves, clamp, enumOf, lineH, objs, readableOn, side, str } from '../_kit'
import { placeText } from '../../text/_engine/text-place'
import { linesHeight, placeLines } from '../../diagram/_kit'

export const GROUP_PX = { sm: 56, md: 80, lg: 112 } as const
const OVERLAP = { none: 0, md: 0.3, lg: 0.5 } as const

export interface RowPlan {
  /** Avatar diameter. */
  s: number
  /** Distance between avatar origins. */
  step: number
  shown: number
  more: number
  /** Total width of the avatars (and the bubble). */
  width: number
}

/** Pure sizing: shrink `want` until the row fits `W`. */
export function planRow(n: number, max: number, want: number, overlap: number, W: number, gapNone = 8): RowPlan {
  const shown = Math.min(n, Math.max(1, Math.floor(max)))
  const more = n - shown
  const k = shown + (more > 0 ? 1 : 0)
  const stepOf = (s: number) => (overlap === 0 ? s + gapNone : s * (1 - overlap))
  const widthOf = (s: number) => s + (k - 1) * stepOf(s)
  let s = want
  if (widthOf(s) > W) s = Math.max(1, (W - (overlap === 0 ? gapNone * (k - 1) : 0)) / (overlap === 0 ? k : 1 + (k - 1) * (1 - overlap)))
  s = Math.max(1, Math.min(want, s))
  return { s, step: stepOf(s), shown, more, width: widthOf(s) }
}

export function layout(props: AvatarGroupProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const people = objs(props.people).slice(0, GROUP_MAX_PEOPLE)
  const total = asArr(props.people).length > people.length ? asArr(props.people).length : people.length
  const size = enumOf(props.size, ['md', 'sm', 'lg'] as const, 'md')
  const ov = OVERLAP[enumOf(props.overlap, ['md', 'none', 'lg'] as const, 'md')]
  const max = typeof props.max === 'number' && Number.isFinite(props.max) ? props.max : 5
  const plan = planRow(people.length, max, Math.min(GROUP_PX[size], Math.max(1, H)), ov, W)
  const out: LayoutNode[] = []
  const surface = ctx.resolveColor('surface').color
  for (let i = 0; i < plan.shown; i++) {
    out.push(
      ...avatarLeaves(ctx, { name: people[i].name, src: people[i].image, x: i * plan.step, y: 0, size: plan.s, shape: 'circle', part: `avatar[${i}]`, edge: surface })
    )
  }
  if (plan.more > 0) {
    const x = plan.shown * plan.step
    const alt = ctx.resolveColor('surfaceAlt').color
    out.push({ k: 'rect', part: 'more', box: { x, y: 0, width: plan.s, height: plan.s }, fill: { type: 'solid', color: surface }, radius: plan.s / 2 })
    const e = Math.min(Math.max(2, Math.round(plan.s * 0.05)), Math.floor(plan.s / 4))
    out.push({ k: 'rect', part: 'more.disc', box: { x: x + e, y: e, width: plan.s - 2 * e, height: plan.s - 2 * e }, fill: { type: 'solid', color: alt }, radius: (plan.s - 2 * e) / 2 })
    const base = ctx.resolveText('body', { size: Math.max(10, Math.round(plan.s * 0.32)) })
    const style = { ...base, color: readableOn(ctx.resolveColor('text').color, alt) }
    const label = `+${total - plan.shown}`
    const t = placeText(ctx, label, style, { x, y: 0, width: plan.s }, 'center', { part: 'more.label' })
    const dy = Math.max(0, (plan.s - lineH(style)) / 2)
    out.push(...t.nodes.map((n) => ({ ...n, box: { ...n.box, y: n.box.y + dy } }) as LayoutNode))
  }
  const caption = str(props.caption).trim()
  let height = plan.s
  if (caption) {
    const cs = { ...ctx.resolveText('caption'), color: readableOn(ctx.resolveColor('textMuted').color, surface) }
    const gap = ctx.tokens.space.md
    const left = plan.width + gap
    if (W - left >= 160) {
      const h = linesHeight(ctx, caption, cs, W - left, 1)
      out.push(...placeLines(ctx, caption, cs, { x: left, y: (plan.s - h) / 2, width: W - left }, 'start', 1, 'caption').nodes)
    } else if (H - plan.s - gap >= lineH(cs)) {
      const p = placeLines(ctx, caption, cs, { x: 0, y: plan.s + gap / 2, width: W }, 'start', 1, 'caption')
      out.push(...p.nodes)
      height = plan.s + gap / 2 + p.height
    }
  }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: clamp(height, 0, Math.max(H, plan.s)) }, children: out }
}

export function capacity(props: AvatarGroupProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  const n = asArr(props.people).length
  const fits = n <= GROUP_MAX_PEOPLE
  return {
    fits,
    budget: { people: { max: GROUP_MAX_PEOPLE, used: n, unit: 'items' } },
    remedy: fits ? [] : [{ kind: 'truncate', slot: 'people' }],
  }
}
