/**
 * tls.a.choice — an interactive multiple-choice question (kind: 'html', family 'live', category
 * 'learning'; learning L03 §3).
 *
 * Static everywhere except DeckViewer: the poster is `tls.c.quiz`'s layout with `reveal: 'none'` (no
 * answer, no explanation) plus a footer band that the live block fills with its feedback and
 * controls. The live DOM puts one real `<button>` over each poster option, so the poster, the PDF
 * and the live block share the same geometry. See `template.ts` (markup) and `interact.ts` (the
 * behaviour: instant / confirm / multi, retry, show-answer, keyboard).
 *
 * Differences from the plan: 2-5 options (the quiz layout draws A-E), not 2-6; a multi-answer choice keeps the lettered badges of the poster (the plan
 * said square boxes); `why` (per-option feedback) is validated and shown in the live block only.
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { capacityOf } from '../../diagram/_kit'
import { enumSlot } from '../../data/_chart/schema-kit'
import { htmlHostNode } from '../../../html-block'
import { layoutQuiz, QUIZ_MAX, QUIZ_MIN, type QuizProps } from '../../composite/tls-c-quiz'
import { template } from './template'
import { interact } from './interact'

export const FOOTER_H = 64
export const EXPLANATION_H = 84

export interface ChoiceBlockProps extends Record<string, unknown> {
  prompt: string
  options: string[]
  answer: number[]
  multiple?: boolean
  why?: string[]
  explanation?: string
  layout?: 'list' | 'grid'
  submit?: 'instant' | 'confirm'
  retry?: boolean
  showAnswer?: boolean
}

export const schema: BlockSchema = {
  prompt: { type: { kind: 'richText', maxChars: 200 }, role: 'content', label: 'Question', required: true, guidance: 'One clear question.' },
  options: { type: { kind: 'list', of: { kind: 'text', maxChars: 90 }, min: QUIZ_MIN, max: QUIZ_MAX }, role: 'content', label: 'Options', required: true, guidance: 'Short, parallel answers; lettered A-E automatically.' },
  answer: { type: { kind: 'list', of: { kind: 'number', min: 0, max: QUIZ_MAX - 1 }, min: 1, max: QUIZ_MAX }, role: 'content', label: 'Correct options', required: true, guidance: 'Zero-based indices into options (0 = A). One index unless `multiple`.' },
  multiple: { type: { kind: 'boolean' }, role: 'option', label: 'Several correct answers', guidance: 'true: the learner picks all correct options and presses "Kiểm tra".' },
  why: { type: { kind: 'list', of: { kind: 'text', maxChars: 120 }, min: 0, max: QUIZ_MAX }, role: 'content', label: 'Why (per option)', guidance: 'Optional feedback for each option, same length as options.' },
  explanation: { type: { kind: 'text', maxChars: 240 }, role: 'content', label: 'Explanation', guidance: 'Shown after a correct answer and after "Hiện đáp án".' },
  layout: enumSlot(['list', 'grid'], 'Layout', 'grid = two columns.'),
  submit: enumSlot(['instant', 'confirm'], 'Answer mode', 'instant: the click gives the result; confirm: select, then "Kiểm tra". Absent = the deck default.'),
  retry: { type: { kind: 'boolean' }, role: 'option', label: 'Retry button', guidance: 'Default true.' },
  showAnswer: { type: { kind: 'boolean' }, role: 'option', label: 'Show-answer button', guidance: 'Default true.' },
}

export const defaults: ChoiceBlockProps = {
  prompt: 'Which measure is least affected by one extreme value?',
  options: ['The mean', 'The median', 'The range', 'The variance'],
  answer: [1],
  explanation: 'The median depends on the middle of the ordered data, so one outlier barely moves it.',
  layout: 'list',
}

const norm = (s: string) => s.trim().toLowerCase()

export function lintChoice(props: ChoiceBlockProps): LintFinding[] {
  const out: LintFinding[] = []
  const err = (rule: string, message: string, part = 'root') => out.push({ level: 'error', rule, part, message })
  const options = Array.isArray(props.options) ? props.options : []
  const answer = Array.isArray(props.answer) ? props.answer : []
  const n = options.length
  if (answer.length === 0) err('activity/no-answer', 'A choice needs at least one correct option in `answer`.', 'answer')
  const bad = answer.filter((i) => !Number.isInteger(i) || i < 0 || i >= n)
  if (bad.length) err('activity/answer-out-of-range', `Answer ${bad.map(String).join(', ')} is out of range: use whole numbers from 0 to ${Math.max(0, n - 1)} (indices into the ${n} options, 0 = A).`, 'answer')
  if (new Set(answer).size !== answer.length) err('activity/answer-duplicate', '`answer` lists the same option twice.', 'answer')
  if (!props.multiple && answer.length > 1) err('activity/answer-count', '`multiple` is false, so exactly one option may be correct; set `multiple: true` or keep one index.', 'answer')
  if (new Set(options.map((o) => norm(String(o)))).size !== n) err('activity/options-duplicate', 'Two options say the same thing (compared without case and spaces); make them distinct.', 'options')
  if (props.why && props.why.length !== n) err('activity/why-length', `\`why\` has ${props.why.length} entries for ${n} options; give one per option or leave it out.`, 'why')
  return out
}

export const toQuizProps = (props: ChoiceBlockProps): QuizProps => ({
  question: props.prompt,
  options: props.options,
  answer: Array.isArray(props.answer) && props.answer.length ? props.answer[0] : -1,
  layout: props.layout,
  reveal: 'none',
})

/** The poster: the quiz layout without answer, plus the footer band (feedback + controls, and room
 *  for the explanation when the block has one). Honest about height: the live block fills the band. */
export function poster(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as ChoiceBlockProps
  const base = layoutQuiz(toQuizProps(p), ctx)
  const extra = ctx.tokens.space.md * 1.5 + FOOTER_H + (p.explanation ? EXPLANATION_H : 0)
  const height = base.box.height + extra
  if (base.k !== 'group') return base
  // an empty, unpainted rect at the bottom edge: the band is part of the block's extent (the live
  // block paints its feedback and controls there; exports bound the poster by its leaves)
  const band: LayoutNode = { k: 'rect', part: 'footer', box: { x: 0, y: height - 1, width: base.box.width, height: 1 } }
  return { ...base, box: { ...base.box, height }, children: [...base.children, band] }
}

function capacity(props: ChoiceBlockProps) {
  const used = Array.isArray(props.options) ? props.options.length : 0
  return capacityOf({ options: { max: QUIZ_MAX, used } }, true, [{ kind: 'truncate', slot: 'options' }])
}

function layout(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  return htmlHostNode(poster, 'tls.a.choice', props, ctx)
}

export const tlsAChoice: BlockDefinition = {
  type: 'tls.a.choice',
  name: 'Choice question',
  family: 'live',
  tier: 'A',
  kind: 'html',
  summary: 'Interactive multiple-choice question with feedback (live in Present mode).',
  keywords: ['quiz', 'multiple choice', 'question', 'check understanding', 'activity', 'interactive', 'poll', 'trắc nghiệm'],
  category: 'learning',
  scope: 'group',
  shortDescription: 'Interactive multiple-choice question with feedback',
  related: ['tls.c.quiz', 'tls.t.qa'],
  activity: { kind: 'choice', answers: 'single' },
  describe: {
    when: 'Check understanding after a definition or example: one question with a clear right answer.',
    avoid: 'Open questions with no single right answer: tls.t.qa. Print handouts: tls.c.quiz.',
    example: {
      id: 'b_choice',
      type: 'tls.a.choice',
      props: {
        prompt: 'Which measure resists outliers?',
        options: ['The mean', 'The median', 'The range'],
        answer: [1],
        explanation: 'The median ignores how far the extremes are.',
        layout: 'list',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1500, 860], min: [1050, 640] },
  layout: layout as BlockDefinition['layout'],
  poster,
  html: { template, interact: interact as NonNullable<BlockDefinition['html']>['interact'] },
  motion: { parts: ['root'], preset: 'fade-up' },
  capacity: capacity as BlockDefinition['capacity'],
  lint: ((props: ChoiceBlockProps): LintFinding[] => lintChoice(props)) as BlockDefinition['lint'],
}

export { QUIZ_MAX }
