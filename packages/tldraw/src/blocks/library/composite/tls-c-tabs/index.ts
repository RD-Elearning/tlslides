/**
 * tls.c.tabs — spro sprint 2026-11b S10-1: 2–5 labelled panels. Static form (editor, exports, checks,
 * self-study): every panel shown with its label, in a 2–3 column grid (`top-tabs`) or as rows with the
 * label in a left column (`side-tabs`). In the viewer (in-class presented decks) one panel's text shows
 * at a time; the labels are tabs (click, Enter, Space).
 */
import type { ActivityRuntime, BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { defineRichBlock, objectOf, rows, strs, txt } from '../_rich-block'
import { control, focusRing, ITEM, P, revealScope, textOf } from '../../../activity/reveal-kit'

export interface TabsProps extends Record<string, unknown> {
  tabs: Array<{ label: string; text: string; points?: string[] }>
  variant?: 'top-tabs' | 'side-tabs'
}
const VARIANTS = ['top-tabs', 'side-tabs'] as const

export const schema: BlockSchema = {
  tabs: {
    type: { kind: 'list', of: objectOf({ label: { kind: 'text', maxChars: 24 }, text: { kind: 'text', maxChars: 320 }, points: { kind: 'list', of: { kind: 'text', maxChars: 90 }, min: 0, max: 4 } }), min: 2, max: 5 },
    role: 'content',
    label: 'Tabs',
    required: true,
    guidance: 'Each: `label` (≤ 24), `text` (≤ 320) and optional `points` (0–4 × ≤ 90).',
  },
  variant: enumSlot([...VARIANTS], 'Variant', 'top-tabs (default: panels side by side when shown whole) or side-tabs (labels in a left column).'),
}

export const defaults: TabsProps = {
  tabs: [
    { label: 'Solid', text: 'Particles are packed tightly and only vibrate in place, so a solid keeps its shape and volume.' },
    { label: 'Liquid', text: 'Particles stay close but slide past each other, so a liquid keeps its volume and takes the shape of its container.' },
    { label: 'Gas', text: 'Particles move fast and far apart, so a gas fills any container it is in.' },
  ],
  variant: 'top-tabs',
}

const tabsOf = (p: TabsProps) => rows<{ label?: unknown; text?: unknown; points?: unknown }>(p.tabs, 5).map((t) => ({ label: txt(t.label, 24), text: txt(t.text, 320), points: strs(t.points, 4) }))

/** Viewer: one panel at a time; the labels are the tabs. */
export function revealTabs(root: HTMLElement, rt: ActivityRuntime, props: TabsProps): () => void {
  const n = tabsOf(props).length
  const side = pick(props.variant, VARIANTS, 'top-tabs') === 'side-tabs'
  const labelKey = side ? 'marker' : 'lead'
  const scope = revealScope(root, rt)
  const accent = getComputedStyle(root).getPropertyValue('--tls-accent').trim() || 'currentColor'
  let active = 0
  const offs: Array<() => void> = []
  const render = () => {
    let css = focusRing(scope.sel, accent)
    for (let i = 0; i < n; i++) {
      if (i === active) {
        css += `${P(scope.sel, `item[${i}].card`)}{outline:4px solid ${accent};outline-offset:-2px;border-radius:16px}`
        continue
      }
      css += `${ITEM(scope.sel, i)}:not([data-part^="item[${i}].${labelKey}"]):not([data-part^="item[${i}].card"]){opacity:0;visibility:hidden}`
      css += `${P(scope.sel, `item[${i}].card`)}{opacity:.55}`
    }
    scope.css(css)
    for (let i = 0; i < n; i++) scope.part(`item[${i}].${labelKey}`)?.setAttribute('aria-selected', String(i === active))
  }
  root.setAttribute('role', 'tablist')
  for (let i = 0; i < n; i++) {
    const label = scope.group(`item[${i}].${labelKey}`)
    const go = () => {
      active = i
      render()
    }
    offs.push(control(label, 'tab', textOf(label[0] ?? null), go))
    offs.push(control(scope.group(`item[${i}].card`), 'presentation', '', go))
  }
  render()
  return () => {
    offs.forEach((f) => f())
    root.removeAttribute('role')
    scope.dispose()
  }
}

export const tlsCTabs = defineRichBlock<TabsProps>({
  type: 'tls.c.tabs',
  name: 'Tabs',
  summary: '2–5 labelled panels; one at a time when presented, all shown in the static form.',
  keywords: ['tabs', 'panels', 'reveal', 'interactive', 'thẻ', 'tab'],
  category: 'learning',
  shortDescription: 'Labelled panels, one shown at a time when presented',
  related: ['tls.c.cards', 'tls.c.compare-detail', 'tls.c.accordion'],
  schema,
  defaults,
  size: { preferred: [1600, 700], min: [960, 520] },
  describe: {
    when: 'An in-class slide whose 2–5 parallel parts (states, types, cases) the teacher opens one by one; each part a label and a short explanation.',
    avoid: 'A self-study or printed deck: tls.c.cards or tls.c.compare-detail show the same content at once. Steps in order: tls.c.step-through.',
    example: { id: 'b_tabs', type: 'tls.c.tabs', props: { tabs: defaults.tabs } },
  },
  shape: (p) => {
    const items = tabsOf(p)
    if (pick(p.variant, VARIANTS, 'top-tabs') === 'side-tabs') return { items: items.map((t) => ({ marker: t.label, text: t.text, points: t.points })), opts: { columns: 1, marker: 'label', markerSide: 'left', card: 'card', labelShare: 0.24 } }
    const n = items.length
    return { items: items.map((t) => ({ lead: t.label, text: t.text, points: t.points })), opts: { columns: (n <= 3 ? n : n === 4 ? 2 : 3) as 1 | 2 | 3, card: 'card' } }
  },
  reveal: revealTabs as never,
})
