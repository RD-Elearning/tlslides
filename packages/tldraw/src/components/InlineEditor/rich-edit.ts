/**
 * Inline editing of a text slot whose value is a plain string or a `RichText` (`{ runs }`).
 *
 * Editor E03: the overlay edits **runs**, not marked-up text — bold shows bold (no `**` markers),
 * and italic / colour / size runs keep their formatting while their text is edited.
 * - A string slot reads `**…**` as bold (the convention the text blocks parse, `parseStrong`) and
 *   writes bold runs back as `**…**`; it cannot hold italic/colour, so those never appear.
 * - A rich slot round-trips its runs (equal neighbours merged).
 *
 * Pure and DOM-free (the DOM glue is in `InlineEditor.tsx`).
 */

import { parseStrong } from '../../blocks/library/text/_engine/rich'
import type { RichText } from '../../blocks/types'

export interface EditRun {
  text: string
  bold?: boolean
  italic?: boolean
  color?: string
  size?: number
}

function isRich(value: unknown): value is RichText {
  return !!value && typeof value === 'object' && Array.isArray((value as RichText).runs)
}

/** Whether a slot value can be edited inline at all (a string, a rich text, or empty). */
export function isEditableValue(value: unknown): boolean {
  return value == null || typeof value === 'string' || isRich(value)
}

/** The runs the overlay starts with, or `null` when the value is not text. */
export function runsOf(value: unknown): EditRun[] | null {
  if (value == null) return []
  if (typeof value === 'string') return parseStrong(value).map((s) => (s.strong ? { text: s.text, bold: true } : { text: s.text }))
  if (!isRich(value)) return null
  return value.runs
    .filter((r) => r && typeof r.text === 'string')
    .map((r) => {
      const out: EditRun = { text: r.text }
      if (r.bold) out.bold = true
      if (r.italic) out.italic = true
      if (r.color !== undefined) out.color = r.color
      if (r.size !== undefined) out.size = r.size
      return out
    })
}

const same = (a: EditRun, b: EditRun) => !!a.bold === !!b.bold && !!a.italic === !!b.italic && a.color === b.color && a.size === b.size

/** Drop empty runs and merge neighbours with the same formatting. */
export function normalizeRuns(runs: EditRun[]): EditRun[] {
  const out: EditRun[] = []
  for (const r of runs) {
    if (!r.text) continue
    const last = out[out.length - 1]
    if (last && same(last, r)) last.text += r.text
    else out.push({ ...r })
  }
  return out
}

export function plainText(runs: EditRun[]): string {
  return runs.map((r) => r.text).join('')
}

/** The new slot value: same shape as the old one (string stays string, rich stays rich). */
export function valueFromRuns(original: unknown, runs: EditRun[]): string | RichText {
  const clean = normalizeRuns(runs)
  if (isRich(original)) return { runs: clean.map((r) => ({ ...r })) }
  return clean.map((r) => (r.bold && r.text.trim() ? `**${r.text}**` : r.text)).join('')
}

/** Bold on `[start, end)` (character offsets): on when any of it is not bold yet, else off. */
export function toggleBold(runs: EditRun[], start: number, end: number): EditRun[] {
  if (end <= start) return runs
  const pieces: EditRun[] = []
  let at = 0
  for (const r of runs) {
    const a = at
    const b = at + r.text.length
    at = b
    const cuts = [a, Math.min(Math.max(start, a), b), Math.min(Math.max(end, a), b), b]
    for (let i = 0; i < 3; i++) if (cuts[i + 1] > cuts[i]) pieces.push({ ...r, text: r.text.slice(cuts[i] - a, cuts[i + 1] - a) })
  }
  let pos = 0
  const inside = (p: EditRun, from: number) => from >= start && from + p.text.length <= end
  const allBold = pieces.every((p) => {
    const ok = !inside(p, pos) || !!p.bold
    pos += p.text.length
    return ok
  })
  pos = 0
  const out = pieces.map((p) => {
    const from = pos
    pos += p.text.length
    if (!inside(p, from)) return p
    const n = { ...p }
    if (allBold) delete n.bold
    else n.bold = true
    return n
  })
  return normalizeRuns(out)
}
