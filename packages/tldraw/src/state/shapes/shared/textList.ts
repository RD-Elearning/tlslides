import { TextListStyle } from '~types'

// Phase 17 — bullet/numbered lists. `TextShape` only (see `ShapeStyles.list`'s comment for why
// shape labels and `StickyShape` are a named scope cut, not a silent one). The marker is applied
// to a *copy* of the text, never persisted: `shape.text`/the editing textarea always hold the raw,
// unmarked string the user typed, so undo/redo, copy/paste, and re-editing a list all operate on
// plain text with no marker syntax to strip back out. Every place that measures or renders the
// *display* form of a `TextShape` (`TextUtil.getBounds`'s DOM measurement, its non-editing render,
// `getTextSvgElement`, `renderPageToSvg`'s `renderText`) calls this exact function first, so a
// bullet/number's own width is accounted for everywhere consistently — an easy thing to get wrong
// once, since a marker widens a line beyond what the raw text alone would measure.
//
// Every line gets a marker, including a blank one — no special-casing "skip empty lines," which
// would also raise the question of whether a numbered list should skip a number for a blank line
// (renumbering the item after it, or not) and doesn't have an obviously-right answer either way.
// Uniform is the simplest, most honest rule and the one least likely to itself look like a bug.
export function applyListMarkers(text: string, list: TextListStyle | undefined): string {
  if (!list) return text
  return text
    .split('\n')
    .map((line, i) => (list === 'bullet' ? `•  ${line}` : `${i + 1}.  ${line}`))
    .join('\n')
}
