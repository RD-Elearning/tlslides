/**
 * tls.c.quiz — multiple-choice question with lettered options; the correct one is highlighted.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (a stack: question, option cards, a success
 * callout); `layout()` places the same content by hand and flattens it (see `../_kit.ts`): one rounded
 * rect per option, a lettered badge, the option text, and, when `reveal` is `shown`, the correct option
 * restyled with `positive` colours and a check mark (part `answer`), then the explanation.
 *
 * Gap vs the plan: `reveal: on-click` and per-answer build steps are NOT shipped. `PartMotionSpec`
 * has no per-part trigger, so a click reveal cannot target one part (same limit as `tls.t.qa`).
 * `reveal` is `shown | none` only; with `none` neither the answer nor the explanation is drawn.
 *
 * Validation: `answer` has static slot bounds (0..4, a `budget/overflow` error); the relation to the
 * number of options is a block `lint()` (`quiz/answer-out-of-range`, error). `layout()` ignores an
 * out-of-range answer (no highlight) and never throws.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, CapacityReport, LayoutContext, LayoutNode, LintFinding, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { capacityOf } from '../../diagram/_kit'
import { iconLeaf } from '../../text/_engine/icon'
import { onColor, readableOn, tintOf } from '../../text/_engine/color'
import { composeFlat, measureHeights, pick, pickToken, strings, toMeasurable, type Piece } from '../_kit'

export const QUIZ_MIN = 2
export const QUIZ_MAX = 5
const LETTERS = ['A', 'B', 'C', 'D', 'E']

export interface QuizProps extends Record<string, unknown> {
  question: string
  options: string[]
  answer: number
  explanation?: string
  layout?: 'list' | 'grid'
  reveal?: 'shown' | 'none'
  showExplanation?: boolean
}

export const schema: BlockSchema = {
  question: { type: { kind: 'richText', maxChars: 200 }, role: 'content', label: 'Question', required: true, guidance: 'One clear question.' },
  options: { type: { kind: 'list', of: { kind: 'text', maxChars: 80 }, min: QUIZ_MIN, max: QUIZ_MAX }, role: 'content', label: 'Options', required: true, guidance: 'Short, parallel answers; lettered A-E automatically.' },
  answer: { type: { kind: 'number', min: 0, max: QUIZ_MAX - 1 }, role: 'content', label: 'Correct option', required: true, guidance: 'Zero-based index into options (0 = A).' },
  explanation: { type: { kind: 'text', maxChars: 200 }, role: 'content', label: 'Explanation', guidance: 'Why the answer is right.' },
  layout: enumSlot(['list', 'grid'], 'Layout', 'grid = two columns.'),
  reveal: enumSlot(['shown', 'none'], 'Reveal', 'shown highlights the answer; none hides it. No click reveal.'),
  showExplanation: { type: { kind: 'boolean' }, role: 'option', label: 'Show explanation', toggles: 'explanation' },
}

export const defaults: QuizProps = {
  question: 'Which measure is least affected by one extreme value?',
  options: ['The mean', 'The median', 'The range', 'The variance'],
  answer: 1,
  explanation: 'The median depends on the middle of the ordered data, so one outlier barely moves it.',
  layout: 'list',
  reveal: 'shown',
}

const LAYOUTS = ['list', 'grid'] as const
const REVEALS = ['shown', 'none'] as const

/** `answer` as a valid option index, or -1. */
export function answerIndex(props: QuizProps): number {
  const n = strings(props.options, QUIZ_MAX).length
  const a = props.answer
  return typeof a === 'number' && Number.isInteger(a) && a >= 0 && a < n ? a : -1
}

export function lintQuiz(props: QuizProps): LintFinding[] {
  const n = Array.isArray(props.options) ? props.options.length : 0
  const a = props.answer
  if (typeof a === 'number' && Number.isInteger(a) && a >= 0 && a < n) return []
  return [
    {
      level: 'error',
      rule: 'quiz/answer-out-of-range',
      part: 'answer',
      message: `Quiz answer ${String(a)} is out of range: it must be a whole number from 0 to ${Math.max(0, n - 1)} (an index into the ${n} options, 0 = A).`,
    },
  ]
}

const explanationSpec = (props: QuizProps): BlockSpec | undefined =>
  isShown(props, 'showExplanation') && props.explanation && props.reveal !== 'none'
    ? { id: 'explanation', type: 'tls.t.callout', props: { text: props.explanation, variant: 'success', fill: 'tint', showTitle: false } }
    : undefined

/** Reference tree (stack > option card > body, plus a callout): used for depth and measure checks. */
export function buildQuiz(props: QuizProps): BlockSpec {
  const opts = strings(props.options, QUIZ_MAX).map((t, i) => ({
    id: `option-${i}`,
    type: 'tls.l.card',
    props: { padding: 'md', children: [{ id: `text-${i}`, type: 'tls.t.body', props: { text: `${LETTERS[i]}  ${t}` } }] },
  }))
  const kids = [{ id: 'question', type: 'tls.t.title', props: { text: toMeasurable(props.question), size: 'heading' } }, ...opts, explanationSpec(props)].filter(Boolean) as BlockSpec[]
  return { id: 'quiz', type: 'tls.l.stack', props: { gap: 'md', sizing: 'content', children: kids } }
}

interface Plan {
  qSize: 'heading' | 'subheading'
  qH: number
  opts: string[]
  cols: number
  optW: number
  textW: number
  rowH: number[]
  textH: number[]
  expl?: BlockSpec
  explH: number
  needed: number
  gap: number
  badge: number
  padX: number
  revealed: boolean
}

function plan(props: QuizProps, ctx: LayoutContext): Plan {
  const W = Math.max(0, ctx.box.width) || 0
  const gap = ctx.tokens.space.md
  const padX = ctx.tokens.space.lg
  const padY = ctx.tokens.space.sm
  const opts = strings(props.options, QUIZ_MAX)
  const cols = pick(props.layout, LAYOUTS, 'list') === 'grid' && opts.length > 1 ? 2 : 1
  const optW = Math.max(1, (W - gap * (cols - 1)) / cols)
  const revealed = pick(props.reveal, REVEALS, 'shown') === 'shown' && answerIndex(props) >= 0
  const badge = 52
  const markW = revealed ? 40 + gap : 0
  const textW = Math.max(1, optW - 2 * padX - badge - gap - markW)
  const qSize = pickToken(ctx, props.question, W, ['heading', 'subheading'], 3) as 'heading' | 'subheading'
  const qH = measureHeights(ctx, [{ id: 'q', type: 'tls.t.title', props: { text: toMeasurable(props.question), size: qSize } }], W)[0]
  const textH = measureHeights(ctx, opts.map((t, i) => ({ id: `o${i}`, type: 'tls.t.body', props: { text: t } })), textW)
  const rowH: number[] = opts.map((_, i) => Math.max(badge + 2 * padY, textH[i] + 2 * padY + 4))
  // Equal height within a grid row.
  if (cols === 2) for (let i = 0; i < opts.length; i += 2) rowH[i] = rowH[i + 1] = Math.max(rowH[i], rowH[i + 1] ?? 0)
  const expl = revealed ? explanationSpec(props) : undefined
  const explH = expl ? measureHeights(ctx, [expl], W)[0] : 0
  const rows = cols === 2 ? Math.ceil(opts.length / 2) : opts.length
  const rowsH = cols === 2 ? rowH.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) : rowH.reduce((a, b) => a + b, 0)
  const needed = qH + gap * 1.5 + rowsH + gap * Math.max(0, rows - 1) + (explH ? gap * 1.5 + explH : 0)
  return { qSize, qH, opts, cols, optW, textW, rowH, textH, expl, explH, needed, gap, badge, padX, revealed }
}

export function layoutQuiz(props: QuizProps, ctx: LayoutContext): LayoutNode {
  const p = plan(props, ctx)
  const ans = p.revealed ? answerIndex(props) : -1
  const total = Math.max(1, Math.ceil(p.needed))
  const surfaceAlt = ctx.resolveColor('surfaceAlt').color
  const surface = ctx.resolveColor('surface').color
  const accent = ctx.resolveColor('accent').color
  const positive = ctx.resolveColor('positive').color
  const okBg = tintOf(surface, positive, 0.16)
  const okInk = readableOn(positive, okBg, 3)
  const pieces: Piece[] = []
  pieces.push({ id: 'question', spec: { id: 'question', type: 'tls.t.title', props: { text: toMeasurable(props.question), size: p.qSize } }, box: { x: 0, y: 0, width: Math.max(0, ctx.box.width), height: p.qH } })

  let y = p.qH + p.gap * 1.5
  const letterStyle = ctx.resolveText('subheading')
  const letterH = Math.ceil(letterStyle.size * letterStyle.lineHeight)
  const radius = ctx.tokens.radius.lg
  const rowTops: number[] = []
  p.opts.forEach((_, i) => {
    if (p.cols === 2 && i % 2 === 1) rowTops.push(rowTops[i - 1])
    else {
      rowTops.push(y)
      y += p.rowH[i] + p.gap
    }
  })
  p.opts.forEach((text, i) => {
    const col = p.cols === 2 ? i % 2 : 0
    const x = col * (p.optW + p.gap)
    const top = rowTops[i]
    const h = p.rowH[i]
    const right = i === ans
    const bgBox = { x, y: top, width: p.optW, height: h }
    const bg: LayoutNode = right
      ? ({ k: 'rect', box: bgBox, fill: { type: 'solid', color: okBg }, stroke: { color: positive, width: 3 }, radius } as LayoutNode)
      : ({ k: 'rect', box: bgBox, fill: { type: 'solid', color: surfaceAlt }, radius } as LayoutNode)
    pieces.push({ id: right ? 'answer' : `optionbg[${i}]`, raw: [bg], box: bgBox })
    const bx = x + p.padX
    const by = top + (h - p.badge) / 2
    const badgeFill = right ? positive : accent
    pieces.push({
      id: `badge[${i}]`,
      raw: [{ k: 'rect', box: { x: bx, y: by, width: p.badge, height: p.badge }, fill: { type: 'solid', color: badgeFill }, radius: p.badge / 2 } as LayoutNode],
      box: { x: bx, y: by, width: p.badge, height: p.badge },
    })
    pieces.push({
      id: `letter[${i}]`,
      spec: { id: `letter-${i}`, type: 'tls.t.title', props: { text: LETTERS[i], size: 'subheading', color: onColor(ctx, badgeFill) } },
      box: { x: bx, y: by + (p.badge - letterH) / 2, width: p.badge, height: letterH },
      align: 'center',
    })
    const tx = bx + p.badge + p.gap
    const bodyH = p.textH[i]
    pieces.push({ id: `option[${i}]`, spec: { id: `option-${i}`, type: 'tls.t.body', props: { text: text } }, box: { x: tx, y: top + (h - bodyH) / 2, width: p.textW, height: bodyH } })
    if (right) {
      const m = 40
      pieces.push({ id: 'answermark', raw: [iconLeaf('check-circle', { x: x + p.optW - p.padX - m, y: top + (h - m) / 2, width: m, height: m }, okInk)], box: bgBox })
    }
  })
  if (p.expl) {
    pieces.push({ id: 'explanation', spec: p.expl, box: { x: 0, y: y - p.gap + p.gap * 1.5, width: Math.max(0, ctx.box.width), height: p.explH } })
  }
  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<QuizProps>({
  type: 'tls.c.quiz',
  name: 'Quiz',
  family: 'composite',
  tier: 'A',
  summary: 'Multiple-choice question with lettered options; the correct answer is highlighted.',
  keywords: ['quiz', 'multiple choice', 'question', 'knowledge check', 'poll', 'test', 'answer'],
  category: 'learning',
  scope: 'group',
  shortDescription: 'Multiple-choice question with lettered options and the correct answer marked',
  related: ['tls.t.qa'],
  schema,
  defaults,
  size: { preferred: [1500, 780], min: [560, 360] },
  describe: {
    when: 'Knowledge checks in lectures and training.',
    avoid: 'Open questions with a written answer: tls.t.qa.',
    example: {
      id: 'b_quiz',
      type: 'tls.c.quiz',
      props: {
        question: 'Which measure resists outliers?',
        options: ['The mean', 'The median', 'The range'],
        answer: 1,
        explanation: 'The median ignores how far the extremes are.',
        layout: 'list',
        reveal: 'shown',
      },
    },
  },
  motion: { parts: ['root'], preset: 'stagger-lines' },
  build: buildQuiz,
})

function capacity(props: QuizProps): CapacityReport {
  const used = Array.isArray(props.options) ? props.options.length : 0
  return capacityOf({ options: { max: QUIZ_MAX, used } }, true, [{ kind: 'truncate', slot: 'options' }])
}

export const tlsCQuiz: BlockDefinition = {
  ...composite,
  layout: ((props: QuizProps, ctx: LayoutContext): LayoutNode => layoutQuiz(props, ctx)) as BlockDefinition['layout'],
  intrinsicSize: ((props: QuizProps, ctx: LayoutContext): Size => ({ width: Math.max(0, ctx.box.width), height: Math.max(1, Math.ceil(plan(props, ctx).needed)) })) as BlockDefinition['intrinsicSize'],
  capacity: capacity as BlockDefinition['capacity'],
  lint: ((props: QuizProps): LintFinding[] => lintQuiz(props)) as BlockDefinition['lint'],
}

