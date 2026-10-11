/**
 * Pure layout function for tls.l.stack — vertical stack with gap.
 *
 * Distributes child blocks vertically, each spanning the full width,
 * separated by `gap` spacing tokens.
 *
 * Phase 4.2: Supports `sizing` mode (equal|content) for content-based distribution.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { StackProps } from './schema'
import { tagChildren } from '../_motion'
import { styleGap } from '../_style'
import { contextTracks, isAuthoredContext } from '../../../layout/layout-child'

export function layout(props: StackProps, ctx: LayoutContext): LayoutNode {
  const gapToken = (props.gap ?? 'md') as SpaceToken
  // A container that delegates to an inner stack (tls.l.section) passes its gap in units.
  const propGap = typeof props.gap === 'number' ? (props.gap as number) : ctx.tokens.space[gapToken] ?? ctx.tokens.space.md
  const gap = styleGap(ctx, propGap) // CMP1: style.gap wins
  const sizingMode: 'equal' | 'content' = (props as unknown as { sizing?: 'equal' | 'content' }).sizing ?? 'equal'
  const children: BlockSpec[] = (props as unknown as { children?: BlockSpec[] }).children ?? []
  // CMP2: engine-internal (set by tls.l.card / tls.l.section on their `$stack`; not in the schema).
  // CMP4: an *authored* content-sized stack packs too (a title lockup on a photo, a column of
  // atoms): it then has a natural size, so an anchored one takes the size of its content.
  const pack = (props as unknown as { pack?: boolean }).pack === true || (sizingMode === 'content' && isAuthoredContext(ctx))

  const W = ctx.box.width
  const H = ctx.box.height
  const n = children.length

  // Calculate available height after gaps
  const totalGap = n > 1 ? gap * (n - 1) : 0
  const availableHeight = Math.max(0, H - totalGap)

  // Calculate distributed sizes for each child based on sizing mode
  const sizes: { height: number; y: number }[] = []

  if (sizingMode === 'equal' || n === 0) {
    // Equal distribution
    const childHeight = n > 0 ? availableHeight / n : 0
    for (let i = 0; i < n; i++) {
      sizes.push({
        height: childHeight,
        y: i * (childHeight + gap),
      })
    }
  } else {
    // Content-based distribution: measure intrinsic heights
    const intrinsicSizes: { height: number }[] = []

    if (ctx.measureIntrinsicSize && n > 0) {
      for (const child of children) {
        const intrinsic = ctx.measureIntrinsicSize(child)
        intrinsicSizes.push({ height: Math.max(intrinsic.height, 50) }) // minimum 50px
      }
    }

    let totalIntrinsic = intrinsicSizes.reduce((sum, s) => sum + s.height, 0)
    // CMP4: peer tracks (a row of cards of one structure): every child at least as tall as the
    // tallest same-index child of its peers, so the peers' children start on shared lines.
    const tracks = (props as unknown as { tracks?: number[] }).tracks ?? contextTracks(ctx)
    if (pack && tracks && tracks.length === intrinsicSizes.length) {
      // (a packed stack spills rather than squashes, so the tracks always hold)
      const tracked = intrinsicSizes.map((s, i) => ({ height: Math.max(s.height, tracks[i] ?? 0) }))
      intrinsicSizes.splice(0, intrinsicSizes.length, ...tracked)
      totalIntrinsic = tracked.reduce((a, s) => a + s.height, 0)
    }

    // CMP4: a packed stack (authored, or an authored card's own) whose content is taller than its
    // box keeps its natural heights and spills (the oracle reports it, the compiler's fit pass grows the box) instead of
    // squashing every child (text clipped in boxes smaller than its lines, reported nowhere).
    if (pack && totalIntrinsic > 0 && (totalIntrinsic <= availableHeight || pack)) {
      // CMP2: a card's / section's own stack packs content that fits at its natural heights — from
      // the top, or centred / at the end per `style.align` — instead of scaling it up to fill: a
      // card holding an icon, a number and a body no longer opens voids between them (composition
      // README CMP2 c). Other content stacks (the composites' own) keep scaling to fill.
      const free = availableHeight - totalIntrinsic
      const align = ctx.style?.align
      let currentY = align === 'center' ? free / 2 : align === 'end' ? free : 0
      for (let i = 0; i < n; i++) {
        sizes.push({ height: intrinsicSizes[i].height, y: currentY })
        currentY += intrinsicSizes[i].height + gap
      }
    } else if (totalIntrinsic > 0) {
      // Too much content: scale down to fit (as before)
      const scale = availableHeight / totalIntrinsic
      let currentY = 0
      for (let i = 0; i < n; i++) {
        const scaledHeight = intrinsicSizes[i].height * scale
        sizes.push({
          height: scaledHeight,
          y: currentY,
        })
        currentY += scaledHeight + gap
      }
    } else {
      // Fall back to equal
      const childHeight = availableHeight / n
      for (let i = 0; i < n; i++) {
        sizes.push({
          height: childHeight,
          y: i * (childHeight + gap),
        })
      }
    }
  }

  // Position children
  const childNodes: LayoutNode[] = []

  for (let i = 0; i < n; i++) {
    const { y, height } = sizes[i]
    const childBox = {
      x: 0,
      y,
      width: W,
      height,
    }
    childNodes.push(ctx.layoutChild(children[i], childBox))
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: tagChildren(childNodes), // RVM2: child/<i> motion parts
  }
}