import type { TLBounds } from '@tlslides/core'
import { AlignStyle, DeckTheme, ShapeStyles } from '~types'
import { getFontSize, getLetterSpacingCss, resolveFont, unquoteFontFamily } from './shape-styles'
import { getTextAlign } from './getTextAlign'
import { LINE_HEIGHT } from '~constants'

export function getTextSvgElement(
  text: string,
  style: ShapeStyles,
  bounds: TLBounds,
  deckTheme?: DeckTheme
) {
  // Phase 15 fix, found by screenshotting `renderPageToSvg`'s output (see that module's report):
  // this drew every line at the *unscaled* font size while centering/right-aligning it against
  // `bounds`, which — for any shape whose live rendering measured/laid out text with `getFontStyle`
  // (which does multiply by `scale`) — is a bounds computed for the *scaled* size. The starter
  // templates (Phase 13) set `scale` on nearly every text shape (0.5–1.3), so this silently made
  // "Copy as SVG"/PNG export (and any label on a scaled shape) render text noticeably too large,
  // overflowing its centered box and, for adjacent shapes, overlapping — invisible until this
  // phase actually rendered an export to a screenshot instead of only asserting on its markup.
  const { font, face } = resolveFont(style, deckTheme)
  const fontSize = getFontSize(style.size, font) * (style.scale ?? 1)
  // Phase 17 — line spacing is now overridable (`ShapeStyles.lineHeight`); undefined keeps the
  // exact pre-existing constant (checked against `style.lineHeight` directly, not against
  // `getLineHeight`'s resolved `1` — that default is for the *live CSS* convention, not this SVG
  // baseline-multiple one; see `ShapeStyles.lineHeight`'s own comment for why the two differ).
  // Letter-spacing is a genuinely NEW attribute on this element: it was applied live (TextUtil/
  // TextLabel's CSS) but never emitted into export SVG before this phase — a small, pre-existing
  // live/export gap, closed here as part of making the value itself overridable rather than left
  // as a second, unrelated inconsistency to fix later.
  const lineHeight = style.lineHeight ?? LINE_HEIGHT
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const textLines = text.split('\n').map((line, i) => {
    const textElm = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElm.textContent = line
    textElm.setAttribute('y', lineHeight * fontSize * (0.5 + i) + '')
    g.appendChild(textElm)
    return textElm
  })
  g.setAttribute('font-size', fontSize + '')
  g.setAttribute('font-family', unquoteFontFamily(face))
  g.setAttribute('letter-spacing', getLetterSpacingCss(style))
  g.setAttribute('text-align', getTextAlign(style.textAlign))
  switch (style.textAlign) {
    case AlignStyle.Middle: {
      g.setAttribute('text-align', 'center')
      g.setAttribute('text-anchor', 'middle')
      textLines.forEach((textElm) => textElm.setAttribute('x', bounds.width / 2 + ''))
      break
    }
    case AlignStyle.End: {
      g.setAttribute('text-align', 'right')
      g.setAttribute('text-anchor', 'end')
      textLines.forEach((textElm) => textElm.setAttribute('x', bounds.width + ''))
      break
    }
    case AlignStyle.Start: {
      g.setAttribute('text-anchor', 'start')
      g.setAttribute('alignment-baseline', 'central')
    }
  }
  return g
}
