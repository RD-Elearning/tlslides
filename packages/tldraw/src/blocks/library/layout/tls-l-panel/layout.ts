/**
 * Pure layout function for tls.l.panel — a `tls.l.card` whose `style` comes from its `surface` choice
 * (S11-d: the style follows the slide — the deck's palette roles and the style's card treatment), with
 * an optional accent band or corner. The children solve their ink against the panel's paint (the
 * card's `containerSurface`), so an accent or inverted panel gets light or dark text as needed.
 */

import type { BlockStyleSpec, LayoutContext, LayoutNode } from '../../../types'
import { withStyle } from '../../../layout/layout-child'
import { layout as cardLayout } from '../tls-l-card/layout'
import type { PanelProps } from './schema'

/** The card style a panel surface stands for (an authored `style` field wins over it). */
export function panelStyle(surface: PanelProps['surface']): BlockStyleSpec {
  switch (surface) {
    case 'alt':
      return { surface: 'surfaceAlt' }
    case 'accent':
      return { surface: 'accent' }
    case 'inverted':
      return { tone: 'inverted' }
    case 'outline':
      return { tone: 'outline' }
    default:
      return {} // base / glass: the deck's own card surface (frosted in glass, rough in doodle, …)
  }
}

export function layout(props: PanelProps, ctx: LayoutContext): LayoutNode {
  const style = { ...panelStyle(props.surface), ...(ctx.style ?? {}) }
  const node = cardLayout({ padding: props.padding ?? 'md', children: props.children }, withStyle(ctx, style))
  const emphasis = props.emphasis ?? 'none'
  if (emphasis === 'none') return node
  // the mark: accent on a light panel, the surface colour on an accent / inverted one
  const strong = props.surface === 'accent' || props.surface === 'inverted'
  const color = strong ? ctx.tokens.color.surface : ctx.tokens.color.accent
  const bg = node.k === 'group' ? node.children.find((c) => c.part === 'background') : undefined
  const h = bg?.box.height ?? node.box.height
  const unit = Math.max(6, Math.round(Math.min(node.box.width, h) * 0.02))
  const mark: LayoutNode =
    emphasis === 'band'
      ? { k: 'rect', part: 'emphasis', box: { x: 0, y: 0, width: unit, height: h }, fill: { type: 'solid', color } }
      : { k: 'rect', part: 'emphasis', box: { x: 0, y: 0, width: unit * 5, height: unit }, fill: { type: 'solid', color } }
  return node.k === 'group' ? { ...node, children: [...node.children.slice(0, bg ? node.children.indexOf(bg) + 1 : 0), mark, ...node.children.slice(bg ? node.children.indexOf(bg) + 1 : 0)] } : node
}
