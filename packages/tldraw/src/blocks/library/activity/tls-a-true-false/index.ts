/**
 * tls.a.true-false — a list of statements, each judged true or false (kind: 'html', family 'live').
 * Always needs "Kiểm tra" (several answers). Poster: the statements as rows with two empty
 * "Đúng / Sai" slots; the live block puts a button pair over each row.
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { capacityOf } from '../../diagram/_kit'
import { htmlHostNode } from '../../../html-block'
import { cellsPoster } from '../../../activity/kit'
import { distinct } from '../../../activity/live-kit'
import { template } from './template'
import { interact } from './interact'

export const TF_MIN = 2
export const TF_MAX = 6
export const FOOTER_H = 64
export const EXPLANATION_H = 84

export interface Statement {
  text: string
  answer: boolean
  why?: string
}
export interface TrueFalseProps extends Record<string, unknown> {
  prompt: string
  statements: Statement[]
  explanation?: string
  retry?: boolean
  showAnswer?: boolean
}

export const schema: BlockSchema = {
  prompt: { type: { kind: 'richText', maxChars: 200 }, role: 'content', label: 'Task', required: true, guidance: 'e.g. "Đúng hay sai?"' },
  statements: {
    type: {
      kind: 'list',
      min: TF_MIN,
      max: TF_MAX,
      of: {
        kind: 'object',
        fields: {
          text: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Statement', required: true },
          answer: { type: { kind: 'boolean' }, role: 'content', label: 'True?', required: true },
          why: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Why' },
        },
      },
    },
    role: 'content',
    label: 'Statements',
    required: true,
    guidance: '2-6 short statements; with 3 or more, at least one true and one false.',
  },
  explanation: { type: { kind: 'text', maxChars: 240 }, role: 'content', label: 'Explanation', guidance: 'Shown after a fully correct answer and after "Hiện đáp án".' },
  retry: { type: { kind: 'boolean' }, role: 'option', label: 'Retry button' },
  showAnswer: { type: { kind: 'boolean' }, role: 'option', label: 'Show-answer button' },
}

export const defaults: TrueFalseProps = {
  prompt: 'True or false?',
  statements: [
    { text: 'The median is not moved by one extreme value.', answer: true },
    { text: 'The mean ignores outliers.', answer: false },
    { text: 'The range uses only the two extreme values.', answer: true },
  ],
  explanation: 'The median and the range are about position; the mean uses every value.',
}

export function lintTrueFalse(props: TrueFalseProps): LintFinding[] {
  const out: LintFinding[] = []
  const err = (rule: string, message: string, part = 'statements') => out.push({ level: 'error', rule, part, message })
  const st = Array.isArray(props.statements) ? props.statements : []
  if (st.length < TF_MIN) err('activity/statements-count', `Give ${TF_MIN} to ${TF_MAX} statements (got ${st.length}).`)
  if (st.some((s) => !s || typeof s.text !== 'string' || !s.text.trim())) err('activity/statement-empty', 'Every statement needs text.')
  if (st.some((s) => typeof s?.answer !== 'boolean')) err('activity/statement-answer', 'Every statement needs `answer: true` or `false`.')
  if (!distinct(st.map((s) => s?.text ?? ''))) err('activity/statements-duplicate', 'Two statements say the same thing; make them distinct.')
  if (st.length >= 3 && st.every((s) => s?.answer === true)) err('activity/statements-balance', 'With 3 or more statements at least one must be false.')
  if (st.length >= 3 && st.every((s) => s?.answer === false)) err('activity/statements-balance', 'With 3 or more statements at least one must be true.')
  return out
}

export function poster(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as TrueFalseProps
  const st = (Array.isArray(p.statements) ? p.statements : []).slice(0, TF_MAX)
  return cellsPoster(ctx, { prompt: p.prompt, cells: st.map((s) => String(s?.text ?? '')), cols: 1, cellMin: 72, footer: FOOTER_H + (p.explanation ? EXPLANATION_H : 0) })
}

export const tlsATrueFalse: BlockDefinition = {
  type: 'tls.a.true-false',
  name: 'True or false',
  family: 'live',
  tier: 'A',
  kind: 'html',
  summary: 'Interactive true/false statements checked together (live in Present mode).',
  keywords: ['true false', 'đúng sai', 'statements', 'quiz', 'activity', 'interactive', 'check understanding'],
  category: 'learning',
  scope: 'group',
  shortDescription: 'Interactive list of true/false statements',
  related: ['tls.c.quiz', 'tls.t.qa'],
  activity: { kind: 'true-false', answers: 'multi' },
  describe: {
    when: 'Quick check of 2-6 claims, e.g. misconceptions: the class judges each as true or false.',
    avoid: 'One question with options: tls.a.choice. Open questions: tls.t.qa.',
    example: { id: 'b_tf', type: 'tls.a.true-false', props: defaults },
  },
  schema,
  defaults,
  size: { preferred: [1500, 820], min: [1050, 600] },
  layout: ((props: Record<string, unknown>, ctx: LayoutContext) => htmlHostNode(poster, 'tls.a.true-false', props, ctx)) as BlockDefinition['layout'],
  poster,
  html: { template, interact: interact as NonNullable<BlockDefinition['html']>['interact'] },
  motion: { parts: ['root'], preset: 'fade-up' },
  capacity: ((props: TrueFalseProps) => capacityOf({ statements: { max: TF_MAX, used: Array.isArray(props.statements) ? props.statements.length : 0 } }, true, [{ kind: 'truncate', slot: 'statements' }])) as BlockDefinition['capacity'],
  lint: ((props: TrueFalseProps) => lintTrueFalse(props)) as BlockDefinition['lint'],
}
