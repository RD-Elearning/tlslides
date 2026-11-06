/**
 * tls.c.step-through — spro sprint 2026-11b S10-3: a process of 3–6 steps. Static form: every step at
 * full weight with its detail. In the viewer the current step is at full weight and the others dim; a
 * click on the block brings the next step, a click (or Enter / Space) on a step's number or title goes
 * to that step.
 */
import type { ActivityRuntime, BlockSchema } from '../../../types'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'
import { control, focusRing, ITEM, P, revealScope, textOf } from '../../../activity/reveal-kit'

export interface StepThroughProps extends Record<string, unknown> {
  steps: Array<{ title: string; text: string }>
}

export const schema: BlockSchema = {
  steps: {
    type: { kind: 'list', of: objectOf({ title: { kind: 'text', maxChars: 50 }, text: { kind: 'text', maxChars: 200 } }), min: 3, max: 6 },
    role: 'content',
    label: 'Steps',
    required: true,
    guidance: 'In order. Each: `title` (≤ 50) and `text` = what to do and why (≤ 200).',
  },
}

export const defaults: StepThroughProps = {
  steps: [
    { title: 'Read the problem', text: 'Underline what is given and circle what is asked, so you know where you start and where you must arrive.' },
    { title: 'Choose a method', text: 'Match the problem to a method you know: a formula, a diagram or a table.' },
    { title: 'Solve and check', text: 'Work it out, then put the answer back into the problem to see that it fits.' },
  ],
}

const stepsOf = (p: StepThroughProps) => rows<{ title?: unknown; text?: unknown }>(p.steps, 6).map((x) => ({ lead: txt(x.title, 50), text: txt(x.text, 200) }))

/** Viewer: a spotlight on the current step. */
export function revealSteps(root: HTMLElement, rt: ActivityRuntime, props: StepThroughProps): () => void {
  const n = stepsOf(props).length
  const scope = revealScope(root, rt)
  const accent = getComputedStyle(root).getPropertyValue('--tls-accent').trim() || 'currentColor'
  let cur = 0
  const offs: Array<() => void> = []
  const render = () => {
    let css = focusRing(scope.sel, accent)
    for (let i = 0; i < n; i++) if (i !== cur) css += `${ITEM(scope.sel, i)}{opacity:.28}`
    css += `${P(scope.sel, `item[${cur}].lead`)}{transform:translateX(6px)}`
    scope.css(css)
    for (let i = 0; i < n; i++) {
      const m = scope.part(`item[${i}].marker`)
      if (i === cur) m?.setAttribute('aria-current', 'step')
      else m?.removeAttribute('aria-current')
    }
  }
  for (let i = 0; i < n; i++) {
    const go = () => {
      cur = i
      render()
    }
    const lead = scope.part(`item[${i}].lead`)
    offs.push(control(scope.group(`item[${i}].marker`), 'button', textOf(lead), go))
    offs.push(control(lead, 'button', textOf(lead), go))
  }
  // a click anywhere else on the block: the next step (the last stays)
  const next = (e: Event) => {
    e.stopPropagation()
    if (cur < n - 1) {
      cur++
      render()
    }
  }
  root.addEventListener('click', next)
  render()
  return () => {
    root.removeEventListener('click', next)
    offs.forEach((f) => f())
    scope.dispose()
  }
}

export const tlsCStepThrough = defineRichBlock<StepThroughProps>({
  type: 'tls.c.step-through',
  name: 'Step-through',
  summary: '3–6 steps; when presented, each click brings the next step forward and dims the others.',
  keywords: ['steps', 'process', 'spotlight', 'step by step', 'interactive', 'từng bước', 'quy trình'],
  category: 'learning',
  shortDescription: 'Steps the teacher brings forward one by one',
  related: ['tls.c.process-detail', 'tls.c.steps', 'tls.c.worked-example'],
  schema,
  defaults,
  size: { preferred: [1600, 760], min: [960, 560] },
  describe: {
    when: 'An in-class slide that walks through 3–6 steps one at a time: the teacher clicks, the next step comes forward, the others dim.',
    avoid: 'A self-study or printed deck: tls.c.process-detail shows the same steps at once. An example solved with formulas: tls.c.worked-example.',
    example: { id: 'b_step_through', type: 'tls.c.step-through', props: { steps: defaults.steps } },
  },
  shape: (p) => ({ items: stepsOf(p), opts: { columns: 1, marker: 'number', markerSide: 'left' } }),
  reveal: revealSteps as never,
})
