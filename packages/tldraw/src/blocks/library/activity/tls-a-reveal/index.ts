/**
 * tls.a.reveal — a question (optional hints) whose answer stays hidden until "Hiện đáp án"
 * (kind: 'html', family 'live'). Not scored. Poster: question, hints as rows, an empty answer area.
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { capacityOf } from '../../diagram/_kit'
import { htmlHostNode } from '../../../html-block'
import { cellsPoster } from '../../../activity/kit'
import { template } from './template'
import { interact } from './interact'

export const HINT_MAX = 3
export const FOOTER_H = 64
export const AREA_H = 240

export interface RevealProps extends Record<string, unknown> {
  prompt: string
  hints?: string[]
  answer: string
}

export const schema: BlockSchema = {
  prompt: { type: { kind: 'richText', maxChars: 200 }, role: 'content', label: 'Question', required: true, guidance: 'A question to think about before looking.' },
  hints: { type: { kind: 'list', min: 0, max: HINT_MAX, of: { kind: 'text', maxChars: 100 } }, role: 'content', label: 'Hints', guidance: '0-3 short hints, shown one by one.' },
  answer: { type: { kind: 'text', maxChars: 240 }, role: 'content', label: 'Answer', required: true, guidance: 'Hidden until "Hiện đáp án".' },
}

export const defaults: RevealProps = {
  prompt: 'Why does the median resist outliers?',
  hints: ['Think about what the median depends on.'],
  answer: 'It depends only on the middle position of the ordered data, not on how large the extremes are.',
}

export function lintReveal(props: RevealProps): LintFinding[] {
  const out: LintFinding[] = []
  const err = (rule: string, part: string, message: string) => out.push({ level: 'error', rule, part, message })
  if (!String(props.answer ?? '').trim()) err('activity/answer-empty', 'answer', 'Give the answer that is revealed.')
  const hints = Array.isArray(props.hints) ? props.hints : []
  if (hints.length > HINT_MAX) err('activity/hints-count', 'hints', `At most ${HINT_MAX} hints (got ${hints.length}).`)
  if (hints.some((h) => !String(h ?? '').trim())) err('activity/hint-empty', 'hints', 'A hint is empty.')
  return out
}

export function poster(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as RevealProps
  const hints = (Array.isArray(p.hints) ? p.hints : []).slice(0, HINT_MAX).map(String)
  return cellsPoster(ctx, { prompt: p.prompt ?? '', cells: hints, cols: 1, area: AREA_H, footer: FOOTER_H })
}

export const tlsAReveal: BlockDefinition = {
  type: 'tls.a.reveal',
  name: 'Reveal answer',
  family: 'live',
  tier: 'A',
  kind: 'html',
  summary: 'A question with hidden hints and an answer revealed on click (live in Present mode).',
  keywords: ['reveal', 'think', 'hint', 'answer', 'activity', 'interactive', 'đáp án', 'gợi ý'],
  category: 'learning',
  scope: 'group',
  shortDescription: 'Question first, hints and answer on demand',
  related: ['tls.a.choice', 'tls.c.quiz'],
  activity: { kind: 'reveal', answers: 'none' },
  describe: {
    when: 'Open question the class thinks about (think-pair-share): ask, hint, then reveal.',
    avoid: 'A question with fixed options: tls.a.choice.',
    example: { id: 'b_reveal', type: 'tls.a.reveal', props: defaults },
  },
  schema,
  defaults,
  size: { preferred: [1500, 760], min: [1050, 540] },
  layout: ((props: Record<string, unknown>, ctx: LayoutContext) => htmlHostNode(poster, 'tls.a.reveal', props, ctx)) as BlockDefinition['layout'],
  poster,
  html: { template, interact: interact as NonNullable<BlockDefinition['html']>['interact'] },
  motion: { parts: ['root'], preset: 'fade-up' },
  capacity: ((props: RevealProps) => capacityOf({ hints: { max: HINT_MAX, used: Array.isArray(props.hints) ? props.hints.length : 0 } }, true, [{ kind: 'truncate', slot: 'hints' }])) as BlockDefinition['capacity'],
  lint: ((props: RevealProps) => lintReveal(props)) as BlockDefinition['lint'],
}
