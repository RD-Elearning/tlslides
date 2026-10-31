/**
 * tls.a.match — pair each left item with its right item (kind: 'html', family 'live').
 * Poster: two columns (lefts in order, rights in a seeded shuffle). Live: click a left, then a right.
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { capacityOf } from '../../diagram/_kit'
import { htmlHostNode } from '../../../html-block'
import { cellsPoster } from '../../../activity/kit'
import { seededOrder } from '../../../activity/shuffle'
import { distinct } from '../../../activity/live-kit'
import { template } from './template'
import { interact } from './interact'

export const MATCH_MIN = 2
export const MATCH_MAX = 6
export const FOOTER_H = 64
export const EXPLANATION_H = 84

export interface Pair {
  left: string
  right: string
}
export interface MatchProps extends Record<string, unknown> {
  prompt: string
  pairs: Pair[]
  explanation?: string
  retry?: boolean
  showAnswer?: boolean
}

export const schema: BlockSchema = {
  prompt: { type: { kind: 'richText', maxChars: 160 }, role: 'content', label: 'Task', required: true, guidance: 'e.g. "Nối mỗi thuật ngữ với định nghĩa".' },
  pairs: {
    type: { kind: 'list', min: MATCH_MIN, max: MATCH_MAX, of: { kind: 'object', fields: { left: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Left', required: true }, right: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Right', required: true } } } },
    role: 'content',
    label: 'Pairs',
    required: true,
    guidance: '2-6 pairs; lefts distinct, rights distinct.',
  },
  explanation: { type: { kind: 'text', maxChars: 240 }, role: 'content', label: 'Explanation' },
  retry: { type: { kind: 'boolean' }, role: 'option', label: 'Retry button' },
  showAnswer: { type: { kind: 'boolean' }, role: 'option', label: 'Show-answer button' },
}

export const defaults: MatchProps = {
  prompt: 'Match each term with its meaning',
  pairs: [
    { left: 'Mean', right: 'Sum divided by the count' },
    { left: 'Median', right: 'Middle value of the ordered data' },
    { left: 'Mode', right: 'Most frequent value' },
  ],
}

/** Display order of the right column (never the identity). */
export function rightOrder(props: MatchProps): number[] {
  const pairs = Array.isArray(props.pairs) ? props.pairs : []
  return seededOrder(pairs.length, pairs.map((p) => `${p?.left}|${p?.right}`).join('||'), true)
}

export function lintMatch(props: MatchProps): LintFinding[] {
  const out: LintFinding[] = []
  const err = (rule: string, message: string) => out.push({ level: 'error', rule, part: 'pairs', message })
  const pairs = Array.isArray(props.pairs) ? props.pairs : []
  if (pairs.length < MATCH_MIN || pairs.length > MATCH_MAX) err('activity/pairs-count', `Give ${MATCH_MIN} to ${MATCH_MAX} pairs (got ${pairs.length}).`)
  if (pairs.some((p) => !p || !String(p.left ?? '').trim() || !String(p.right ?? '').trim())) err('activity/pair-empty', 'Every pair needs a left and a right.')
  if (!distinct(pairs.map((p) => p?.left ?? ''))) err('activity/lefts-duplicate', 'Two lefts are the same.')
  if (!distinct(pairs.map((p) => p?.right ?? ''))) err('activity/rights-duplicate', 'Two rights are the same.')
  return out
}

export function poster(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as MatchProps
  const pairs = (Array.isArray(p.pairs) ? p.pairs : []).slice(0, MATCH_MAX)
  const ord = rightOrder({ ...p, pairs })
  // row-major in two columns: cell[2r] = left r, cell[2r+1] = the r-th displayed right
  const cells = pairs.flatMap((pr, r) => [String(pr?.left ?? ''), String(pairs[ord[r]]?.right ?? '')])
  return cellsPoster(ctx, { prompt: p.prompt ?? '', cells, cols: 2, cellMin: 84, footer: FOOTER_H })
}

export const tlsAMatch: BlockDefinition = {
  type: 'tls.a.match',
  name: 'Match pairs',
  family: 'live',
  tier: 'A',
  kind: 'html',
  summary: 'Pair each left item with its right item by clicking (live in Present mode).',
  keywords: ['match', 'pairs', 'connect', 'activity', 'interactive', 'nối'],
  category: 'learning',
  scope: 'group',
  shortDescription: 'Match terms with meanings by clicking',
  related: ['tls.a.choice', 'tls.c.flashcards'],
  activity: { kind: 'match', answers: 'multi' },
  describe: {
    when: 'Connect terms with definitions, causes with effects, names with examples.',
    avoid: 'One right answer among options: tls.a.choice. Ordering: tls.a.order.',
    example: { id: 'b_match', type: 'tls.a.match', props: defaults },
  },
  schema,
  defaults,
  size: { preferred: [1500, 800], min: [1050, 620] },
  layout: ((props: Record<string, unknown>, ctx: LayoutContext) => htmlHostNode(poster, 'tls.a.match', props, ctx)) as BlockDefinition['layout'],
  poster,
  html: { template, interact: interact as NonNullable<BlockDefinition['html']>['interact'] },
  motion: { parts: ['root'], preset: 'fade-up' },
  capacity: ((props: MatchProps) => capacityOf({ pairs: { max: MATCH_MAX, used: Array.isArray(props.pairs) ? props.pairs.length : 0 } }, true, [{ kind: 'truncate', slot: 'pairs' }])) as BlockDefinition['capacity'],
  lint: ((props: MatchProps) => lintMatch(props)) as BlockDefinition['lint'],
}
