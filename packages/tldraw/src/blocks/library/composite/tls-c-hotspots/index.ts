/**
 * tls.c.hotspots — spro sprint 2026-11b S10-4: a figure or photo with 2–6 numbered markers. Static form:
 * the markers and every note in the notes column (as `tls.c.image-notes`). In the viewer only the chosen
 * marker's note shows (the first at the start), in the notes column — never over the picture; a marker
 * is a button (click, Enter, Space).
 */
import type { ActivityRuntime, BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'
import { layoutPinned, num } from '../tls-c-image-notes'
import { control, focusRing, ITEM, P, revealScope, textOf } from '../../../activity/reveal-kit'

export interface HotspotsProps extends Record<string, unknown> {
  image: string
  alt: string
  aspect?: number
  spots: Array<{ fx: number; fy: number; label: string; text: string }>
  variant?: 'notes-right' | 'notes-below'
}
const VARIANTS = ['notes-right', 'notes-below'] as const

export const schema: BlockSchema = {
  image: { type: { kind: 'image' }, role: 'content', label: 'Picture', required: true, guidance: 'A figure of the document (`fig:`) or a library picture (`img:`).' },
  alt: { type: { kind: 'text', maxChars: 200 }, role: 'content', label: 'Alt text', required: true, guidance: 'What the picture shows (≤ 200).' },
  aspect: { type: { kind: 'number', min: 0.2, max: 8 }, role: 'option', label: 'Aspect', help: 'Width / height of the picture when the asset table does not know it.' },
  spots: {
    type: { kind: 'list', of: objectOf({ fx: { kind: 'number', min: 0, max: 1 }, fy: { kind: 'number', min: 0, max: 1 }, label: { kind: 'text', maxChars: 24 }, text: { kind: 'text', maxChars: 160 } }), min: 2, max: 6 },
    role: 'content',
    label: 'Spots',
    required: true,
    guidance: 'Each: where the marker goes (`fx`, `fy` = fractions 0–1 from the left / top of the picture), `label` (≤ 24) and `text` (≤ 160).',
  },
  variant: enumSlot([...VARIANTS], 'Variant', 'notes-right (default) or notes-below.'),
}

export const defaults: HotspotsProps = {
  image: 'img:plant-cell',
  alt: 'A plant cell with its wall, nucleus and chloroplasts',
  spots: [
    { fx: 0.08, fy: 0.5, label: 'Cell wall', text: 'A stiff layer of cellulose that keeps the cell rigid.' },
    { fx: 0.5, fy: 0.45, label: 'Nucleus', text: 'Holds the genetic material and controls the cell.' },
    { fx: 0.72, fy: 0.25, label: 'Chloroplast', text: 'Captures light and makes sugar by photosynthesis.' },
  ],
  variant: 'notes-right',
}

const spotsOf = (p: HotspotsProps) => rows<{ fx?: unknown; fy?: unknown; label?: unknown; text?: unknown }>(p.spots, 6).map((s) => ({ fx: num(s.fx), fy: num(s.fy), lead: txt(s.label, 24), text: txt(s.text, 160) }))

/** Viewer: the chosen marker's note only; the markers are the buttons. */
export function revealHotspots(root: HTMLElement, rt: ActivityRuntime, props: HotspotsProps): () => void {
  const n = spotsOf(props).length
  const scope = revealScope(root, rt)
  const accent = getComputedStyle(root).getPropertyValue('--tls-accent').trim() || 'currentColor'
  let sel = 0
  const offs: Array<() => void> = []
  const render = () => {
    let css = focusRing(scope.sel, accent)
    for (let i = 0; i < n; i++) {
      if (i === sel) css += `${P(scope.sel, `pin[${i}]`)}{transform:scale(1.25)}`
      else css += `${ITEM(scope.sel, i)}{opacity:0;visibility:hidden}${P(scope.sel, `pin[${i}]`)}{opacity:.7}`
    }
    scope.css(css)
    for (let i = 0; i < n; i++) scope.part(`pin[${i}]`)?.setAttribute('aria-expanded', String(i === sel))
  }
  for (let i = 0; i < n; i++) {
    const lead = scope.part(`item[${i}].lead`)
    offs.push(control(scope.group(`pin[${i}]`), 'button', `${i + 1}. ${textOf(lead)}`, () => {
      sel = i
      render()
    }))
  }
  render()
  return () => {
    offs.forEach((f) => f())
    scope.dispose()
  }
}

export const tlsCHotspots = defineRichBlock<HotspotsProps>({
  type: 'tls.c.hotspots',
  name: 'Hotspots',
  summary: 'A picture with 2–6 numbered markers; when presented, a marker shows its note beside the picture.',
  keywords: ['hotspots', 'image', 'markers', 'explore', 'interactive', 'điểm nóng', 'hình'],
  category: 'learning',
  shortDescription: 'A picture whose markers open their notes when presented',
  related: ['tls.c.image-notes', 'tls.g.annotated', 'tls.m.image'],
  schema,
  defaults,
  size: { preferred: [1600, 760], min: [960, 540] },
  fillPolicy: ['type'],
  describe: {
    when: 'An in-class slide that explores a figure or photo part by part: the teacher clicks a numbered marker and its note shows beside the picture.',
    avoid: 'A self-study or printed deck: tls.c.image-notes shows every note at once. A picture with one caption: tls.m.image.',
    example: { id: 'b_hotspots', type: 'tls.c.hotspots', props: { image: defaults.image, alt: defaults.alt, spots: defaults.spots } },
  },
  sections: { head: ['image'], foot: ['pin'] },
  shape: (p) => {
    const spots = spotsOf(p)
    return {
      items: spots.map((s) => ({ lead: s.lead, text: s.text })),
      opts: { columns: 1, marker: 'number' },
      head: [{ spec: { id: 'image', type: 'tls.m.image', props: { src: String(p.image ?? ''), alt: txt(p.alt, 200) } } }],
      layout: (ctx) => layoutPinned(ctx, p, spots, spots.map((s) => ({ lead: s.lead, text: s.text }))),
    }
  },
  reveal: revealHotspots as never,
})
