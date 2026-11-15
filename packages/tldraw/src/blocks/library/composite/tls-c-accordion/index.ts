/**
 * tls.c.accordion — spro sprint 2026-11b S10-2: 3–6 headed sections. Static form: every section open.
 * In the viewer one section is open at a time (the first at the start); a head opens its section
 * (click, Enter, Space) and the sections below it close up the space.
 */
import type { ActivityRuntime, BlockSchema } from '../../../types'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'
import { boxOf, control, focusRing, ITEM, P, revealScope, textOf } from '../../../activity/reveal-kit'

export interface AccordionProps extends Record<string, unknown> {
  items: Array<{ head: string; text: string }>
}

export const schema: BlockSchema = {
  items: {
    type: { kind: 'list', of: objectOf({ head: { kind: 'text', maxChars: 70 }, text: { kind: 'text', maxChars: 240 } }), min: 3, max: 6 },
    role: 'content',
    label: 'Sections',
    required: true,
    guidance: 'Each: `head` = a question or a heading (≤ 70), `text` = its answer or explanation (≤ 240).',
  },
}

export const defaults: AccordionProps = {
  items: [
    { head: 'What is a variable?', text: 'A named box in memory that holds a value; the value can change while the program runs.' },
    { head: 'Why give it a type?', text: 'The type says what the value can be (a number, a text) and so which operations make sense on it.' },
    { head: 'What is scope?', text: 'The part of the program where the name can be used; outside it the variable does not exist.' },
  ],
}

const itemsOf = (p: AccordionProps) => rows<{ head?: unknown; text?: unknown }>(p.items, 6).map((x) => ({ lead: txt(x.head, 70), text: txt(x.text, 240) }))

/** Viewer: one section open; the heads below a closed section move up into its space. */
export function revealAccordion(root: HTMLElement, rt: ActivityRuntime, props: AccordionProps): () => void {
  const n = itemsOf(props).length
  const scope = revealScope(root, rt)
  const accent = getComputedStyle(root).getPropertyValue('--tls-accent').trim() || 'currentColor'
  const muted = getComputedStyle(root).getPropertyValue('--tls-text-muted').trim() || 'currentColor'
  // how much of the block each section gives back when it is closed: from its head's bottom to its last part's
  const give = Array.from({ length: n }, (_, i) => {
    const head = boxOf(scope.part(`item[${i}].lead`))
    const body = scope.parts(`item[${i}].`).filter((e) => e.dataset.part !== `item[${i}].lead`).map(boxOf).filter((b): b is { top: number; height: number } => !!b)
    if (!head || !body.length) return 0
    return Math.max(0, Math.max(...body.map((b) => b.top + b.height)) - (head.top + head.height))
  })
  let open = 0
  const offs: Array<() => void> = []
  const render = () => {
    let css = focusRing(scope.sel, accent)
    let shift = 0
    for (let i = 0; i < n; i++) {
      const head = `${scope.sel} [data-part="item[${i}].lead"]`
      css += `${head}::before{content:"";position:absolute;left:-20px;top:8%;height:84%;width:6px;border-radius:3px;background:${i === open ? accent : muted};opacity:${i === open ? 1 : 0.4}}`
      if (shift) css += `${ITEM(scope.sel, i)}{transform:translateY(-${shift}px)}`
      if (i !== open) {
        css += `${ITEM(scope.sel, i)}:not([data-part="item[${i}].lead"]){opacity:0;visibility:hidden}`
        shift += give[i]
      }
    }
    scope.css(css)
    for (let i = 0; i < n; i++) scope.part(`item[${i}].lead`)?.setAttribute('aria-expanded', String(i === open))
  }
  for (let i = 0; i < n; i++) {
    const head = scope.part(`item[${i}].lead`)
    offs.push(control(head, 'button', textOf(head), () => {
      open = i
      render()
    }))
  }
  render()
  return () => {
    offs.forEach((f) => f())
    scope.dispose()
  }
}

export const tlsCAccordion = defineRichBlock<AccordionProps>({
  type: 'tls.c.accordion',
  name: 'Accordion',
  summary: '3–6 headed sections; one open at a time when presented, all open in the static form.',
  keywords: ['accordion', 'faq', 'sections', 'reveal', 'interactive', 'mở rộng', 'hỏi đáp'],
  category: 'learning',
  shortDescription: 'Headed sections, one open at a time when presented',
  related: ['tls.c.faq', 'tls.c.key-points', 'tls.c.tabs'],
  schema,
  defaults,
  size: { preferred: [1600, 760], min: [960, 560] },
  describe: {
    when: 'An in-class slide of 3–6 questions or headings the teacher opens one at a time, each with its short answer.',
    avoid: 'A self-study or printed deck: tls.c.faq or tls.c.key-points show the answers at once. Parallel parts side by side: tls.c.tabs.',
    example: { id: 'b_accordion', type: 'tls.c.accordion', props: { items: defaults.items } },
  },
  shape: (p) => ({ items: itemsOf(p), opts: { columns: 1, gap: 'md' } }),
  reveal: revealAccordion as never,
})
