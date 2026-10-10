/**
 * Pure layout function for tls.t.title — slide title.
 *
 * Renders title text with autofit (shrink in 4% steps to 0.75 floor), optional
 * decorative rule, and maxLines truncation with a visible marker.
 */

import type { LayoutContext, LayoutNode, TypeToken } from '../../../types'
import type { TitleProps } from './schema'

/**
 * Effective font size, accounting for the style's scale multiplier.
 * Q2's `effectiveFontSize(style)` — inlined here until that helper lands.
 */
function effectiveFontSize(style: { size: number; scale?: number }): number {
  return style.size * (style.scale ?? 1)
}

/**
 * Apply a scale factor to a resolved text style, returning a new style with the
 * adjusted size. The scale is stored in `style.scale` so downstream consumers
 * (renderers) can read it back.
 */
function withScale(style: ReturnType<LayoutContext['resolveText']>, scale: number) {
  return { ...style, scale, size: style.size * scale }
}

/**
 * Truncate lines to maxLines, appending a visible truncation marker ("…") to the
 * last line. If the original text had inline runs, the marker is appended as a
 * separate run so it doesn't interfere with emphasis.
 */
function truncateLines(
  lines: Array<{ text: string; baseline: number; width: number; runs?: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> }>,
  maxLines: number,
): { lines: typeof lines; truncated: boolean } {
  if (lines.length <= maxLines) {
    return { lines, truncated: false }
  }

  const kept = lines.slice(0, maxLines)
  // Replace last line's trailing text with truncation marker
  const lastLine = { ...kept[kept.length - 1] }
  const marker = '\u2026' // ellipsis character

  if (lastLine.runs && lastLine.runs.length > 0) {
    const truncatedRuns = [...lastLine.runs]
    // Append marker as a new run
    truncatedRuns.push({ text: marker, italic: true })
    lastLine.runs = truncatedRuns
  }
  // Update the text content
  lastLine.text = lastLine.text + marker

  kept[kept.length - 1] = lastLine
  return { lines: kept, truncated: true }
}

/**
 * AC8.6 — `size: fit`: the largest step of `ladder` whose wrap in the box is stable (at most
 * `maxLines` lines, the same line count at 98.5 % and 104 % of the width, so the browser cannot wrap
 * it otherwise) and leaves no one-word first or last line; else the last step. The rule
 * `tls.c.divider` applies to its title (`stableWrap`), for a title that leads a slide alone
 * (`section-title`): display type when the words allow it, never "Why / mid-market, / why now".
 */
export const TITLE_FIT = { ladder: ['display', 'title', 'heading'] as const, maxLines: 3 } as const

export function fitToken(text: TitleProps['text'], ctx: LayoutContext): TypeToken {
  const w = Math.max(1, ctx.box.width)
  for (const token of TITLE_FIT.ladder) {
    const style = ctx.resolveText(token, { letterSpacing: -0.03 })
    const lines = ctx.measureText(text, style, w).lines
    if (lines.length > TITLE_FIT.maxLines) continue
    if (ctx.measureText(text, style, w * 0.985).lines.length !== lines.length) continue
    if (ctx.measureText(text, style, w * 1.04).lines.length !== lines.length) continue
    const words = (i: number) => lines[i].text.trim().split(/\s+/).filter(Boolean).length
    if (lines.length > 1 && (words(0) < 2 || words(lines.length - 1) < 2)) continue
    return token
  }
  return TITLE_FIT.ladder[TITLE_FIT.ladder.length - 1]
}

export function layout(props: TitleProps, ctx: LayoutContext): LayoutNode {
  const typeToken = (props.size === 'fit' ? fitToken(props.text, ctx) : props.size ?? 'title') as TypeToken
  const textColor = props.color ?? 'text'

  const style = ctx.resolveText(typeToken, { letterSpacing: -0.03 })

  // Resolve alignment via textAlign-like override on the style
  const resolvedStyle = {
    ...style,
    color: ctx.resolveColor(textColor).color,
  }

  // Inner box: no padding for a title (it positions itself within the region)
  const inner = { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height }

  // Autofit: shrink in 4% steps to a 0.75 floor, then let capacity() report overflow.
  let scale = 1
  let m = ctx.measureText(props.text, resolvedStyle, inner.width)

  while (m.height > inner.height && scale > 0.79) {
    scale -= 0.04
    m = ctx.measureText(props.text, withScale(resolvedStyle, scale), inner.width)
  }
  // Clamp to floor
  if (scale < 0.75) scale = 0.75

  const scaledStyle = withScale(resolvedStyle, scale)

  // Truncate to maxLines if specified
  let finalLines = m.lines
  let truncated = false
  if (props.maxLines && props.maxLines > 0 && m.lines.length > props.maxLines) {
    const result = truncateLines(m.lines, props.maxLines)
    finalLines = result.lines
    truncated = result.truncated
  }

  const textHeight = truncated
    ? finalLines.length * effectiveFontSize(scaledStyle) * scaledStyle.lineHeight
    : m.height

  const nodes: LayoutNode[] = [{
    k: 'text',
    part: 'text',
    // G8.4: report the true measured height, not clamped to the given box — a clamp here
    // defeats V2.1's two-pass reflow, which relies on this value to know a region needs to
    // grow (BACKLOG-visual-fix-2.md §8.0/§8.4).
    box: { ...inner, height: textHeight },
    lines: finalLines,
    style: scaledStyle,
    propPath: 'text',
  }]

  // Optional decorative rule
  if (props.rule) {
    const ruleY = textHeight + ctx.tokens.space.sm
    nodes.push({
      k: 'rect',
      part: 'rule',
      box: { x: inner.x, y: ruleY, width: 120, height: 6 },
      fill: { type: 'solid', color: ctx.resolveColor('accent').color },
      radius: 3,
    })
  }

  // Compute the intrinsic content height: text height + optional rule.
  const textNodeHeight = textHeight
  let contentHeight = textNodeHeight
  if (props.rule) {
    contentHeight = textNodeHeight + ctx.tokens.space.sm + 6 // rule height
  }

  // Return measured content height, not the full available box height.
  return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: contentHeight }, part: 'root', children: nodes }
}