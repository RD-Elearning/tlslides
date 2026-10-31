/**
 * tls.a.fill-blank — a sentence with blanks and a word bank (kind: 'html', family 'live').
 * `text` marks each blank as `[[word]]`; `distractors` are extra bank words. Always needs "Kiểm tra".
 * Poster: the sentence with `_____` and the bank as chips (in a seeded order).
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { capacityOf } from '../../diagram/_kit'
import { htmlHostNode } from '../../../html-block'
import { cellsPoster } from '../../../activity/kit'
import { seededOrder } from '../../../activity/shuffle'
import { distinct } from '../../../activity/live-kit'
import { template } from './template'
import { interact } from './interact'

export const BLANK_MIN = 1
export const BLANK_MAX = 5
export const DISTRACTOR_MAX = 3
export const FOOTER_H = 64
export const EXPLANATION_H = 84
export const BLANK_MARK = '_____'

export interface FillBlankProps extends Record<string, unknown> {
  prompt: string
  text: string
  distractors?: string[]
  explanation?: string
  retry?: boolean
  showAnswer?: boolean
}

export const schema: BlockSchema = {
  prompt: { type: { kind: 'richText', maxChars: 160 }, role: 'content', label: 'Task', required: true, guidance: 'e.g. "Điền từ vào chỗ trống".' },
  text: { type: { kind: 'text', maxChars: 300 }, role: 'content', label: 'Sentence', required: true, guidance: 'Mark each blank as [[word]]; 1-5 blanks, each a single short word or term.' },
  distractors: { type: { kind: 'list', min: 0, max: DISTRACTOR_MAX, of: { kind: 'text', maxChars: 30 } }, role: 'content', label: 'Extra words', guidance: '0-3 wrong words added to the bank.' },
  explanation: { type: { kind: 'text', maxChars: 240 }, role: 'content', label: 'Explanation' },
  retry: { type: { kind: 'boolean' }, role: 'option', label: 'Retry button' },
  showAnswer: { type: { kind: 'boolean' }, role: 'option', label: 'Show-answer button' },
}

export const defaults: FillBlankProps = {
  prompt: 'Fill in the blanks',
  text: 'The [[median]] is the middle value, while the [[mean]] is the sum divided by the count.',
  distractors: ['mode'],
}

/** Sentence pieces: text and blank answers, in order. */
export function parseBlanks(text: string): Array<{ t: string } | { blank: string }> {
  const out: Array<{ t: string } | { blank: string }> = []
  const re = /\[\[([^\]]+)\]\]/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) })
    out.push({ blank: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ t: text.slice(last) })
  return out
}

export const answersOf = (text: string): string[] => parseBlanks(String(text ?? '')).flatMap((p) => ('blank' in p ? [p.blank] : []))

/** Bank words in a seeded order (the same order in the poster and the live block). */
export function bankOf(props: FillBlankProps): string[] {
  const words = [...answersOf(props.text), ...(Array.isArray(props.distractors) ? props.distractors.map(String) : [])]
  return seededOrder(words.length, words.join('|')).map((i) => words[i])
}

export function lintFillBlank(props: FillBlankProps): LintFinding[] {
  const out: LintFinding[] = []
  const err = (rule: string, part: string, message: string) => out.push({ level: 'error', rule, part, message })
  const ans = answersOf(props.text)
  if (ans.length < BLANK_MIN || ans.length > BLANK_MAX) err('activity/blank-count', 'text', `Mark ${BLANK_MIN} to ${BLANK_MAX} blanks as [[word]] (got ${ans.length}).`)
  if (ans.some((a) => !a || a.split(/\s+/).length > 3)) err('activity/blank-long', 'text', 'Each blank is a short word or term (at most 3 words).')
  // a blank is a concept the learner can reason out; a bare number or a code (course code, "04", a year) is a lookup
  // (spro deck a51aeac7 s3: the blanks were the course code, "04" and the lecturer's name)
  if (ans.some((a) => /^[\d\s.,%/:-]+$/.test(a) || /^[A-Z]{2,}[\s-]?\d+[A-Z\d]*$/.test(a))) err('activity/blank-lookup', 'text', 'Do not blank a bare number or a code: blank a term the learner can work out from the idea.')
  const dis = Array.isArray(props.distractors) ? props.distractors : []
  if (!distinct([...ans, ...dis])) err('activity/bank-duplicate', 'distractors', 'Two bank words are the same; blanks and extra words must be distinct.')
  return out
}

export function poster(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as FillBlankProps
  const sentence = parseBlanks(String(p.text ?? ''))
    .map((x) => ('blank' in x ? BLANK_MARK : x.t))
    .join('')
  return cellsPoster(ctx, { prompt: p.prompt ?? '', cells: [sentence], cols: 1, cellMin: 260, chips: bankOf(p), footer: FOOTER_H })
}

export const tlsAFillBlank: BlockDefinition = {
  type: 'tls.a.fill-blank',
  name: 'Fill in the blank',
  family: 'live',
  tier: 'A',
  kind: 'html',
  summary: 'A sentence with blanks filled from a word bank (live in Present mode).',
  keywords: ['fill', 'blank', 'cloze', 'word bank', 'activity', 'interactive', 'điền từ'],
  category: 'learning',
  scope: 'group',
  shortDescription: 'Fill the blanks of a definition from a word bank',
  related: ['tls.a.choice', 'tls.c.quiz'],
  activity: { kind: 'fill-blank', answers: 'multi' },
  describe: {
    when: 'Practice a definition or formula by recalling the key terms.',
    avoid: 'Open answers: tls.a.reveal. Long sentences with more than 5 blanks.',
    example: { id: 'b_fill', type: 'tls.a.fill-blank', props: defaults },
  },
  schema,
  defaults,
  size: { preferred: [1500, 720], min: [1050, 580] },
  layout: ((props: Record<string, unknown>, ctx: LayoutContext) => htmlHostNode(poster, 'tls.a.fill-blank', props, ctx)) as BlockDefinition['layout'],
  poster,
  html: { template, interact: interact as NonNullable<BlockDefinition['html']>['interact'] },
  motion: { parts: ['root'], preset: 'fade-up' },
  capacity: ((props: FillBlankProps) => capacityOf({ blanks: { max: BLANK_MAX, used: answersOf(props.text).length } }, true, [{ kind: 'truncate', slot: 'blanks' }])) as BlockDefinition['capacity'],
  lint: ((props: FillBlankProps) => lintFillBlank(props)) as BlockDefinition['lint'],
}
