/**
 * tls.a.order — put the items in the right order (kind: 'html', family 'live').
 * `items` is the correct order; it is displayed in a seeded shuffle that is never the identity.
 * Poster: the shuffled items as rows. Live: click the items in the order you think; they get 1..n.
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { capacityOf } from '../../diagram/_kit'
import { htmlHostNode } from '../../../html-block'
import { cellsPoster } from '../../../activity/kit'
import { seededOrder } from '../../../activity/shuffle'
import { distinct } from '../../../activity/live-kit'
import { template } from './template'
import { interact } from './interact'

export const ORDER_MIN = 3
export const ORDER_MAX = 7
export const FOOTER_H = 64
export const EXPLANATION_H = 84

export interface OrderProps extends Record<string, unknown> {
  prompt: string
  items: string[]
  explanation?: string
  retry?: boolean
  showAnswer?: boolean
}

export const schema: BlockSchema = {
  prompt: { type: { kind: 'richText', maxChars: 160 }, role: 'content', label: 'Task', required: true, guidance: 'e.g. "Sắp xếp các bước theo đúng thứ tự".' },
  items: { type: { kind: 'list', min: ORDER_MIN, max: ORDER_MAX, of: { kind: 'text', maxChars: 90 } }, role: 'content', label: 'Items', required: true, guidance: '3-7 items, written in the CORRECT order; they are shown shuffled.' },
  explanation: { type: { kind: 'text', maxChars: 240 }, role: 'content', label: 'Explanation' },
  retry: { type: { kind: 'boolean' }, role: 'option', label: 'Retry button' },
  showAnswer: { type: { kind: 'boolean' }, role: 'option', label: 'Show-answer button' },
}

export const defaults: OrderProps = {
  prompt: 'Put the steps in order',
  items: ['Collect the data', 'Clean the data', 'Analyse it', 'Report the result'],
}

/** Display position → index in the correct order. */
export function displayOrder(props: OrderProps): number[] {
  const items = Array.isArray(props.items) ? props.items : []
  return seededOrder(items.length, items.join('|'), true)
}

export function lintOrder(props: OrderProps): LintFinding[] {
  const out: LintFinding[] = []
  const err = (rule: string, message: string) => out.push({ level: 'error', rule, part: 'items', message })
  const items = Array.isArray(props.items) ? props.items : []
  if (items.length < ORDER_MIN || items.length > ORDER_MAX) err('activity/items-count', `Give ${ORDER_MIN} to ${ORDER_MAX} items (got ${items.length}).`)
  if (items.some((x) => !String(x ?? '').trim())) err('activity/item-empty', 'An item is empty.')
  if (!distinct(items)) err('activity/items-duplicate', 'Two items are the same.')
  return out
}

export function poster(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as OrderProps
  const items = (Array.isArray(p.items) ? p.items : []).slice(0, ORDER_MAX).map(String)
  const ord = displayOrder({ ...p, items })
  return cellsPoster(ctx, { prompt: p.prompt ?? '', cells: ord.map((i) => items[i]), cols: 1, cellMin: 76, footer: FOOTER_H })
}

export const tlsAOrder: BlockDefinition = {
  type: 'tls.a.order',
  name: 'Put in order',
  family: 'live',
  tier: 'A',
  kind: 'html',
  summary: 'Click the items in the right order (live in Present mode).',
  keywords: ['order', 'sequence', 'steps', 'rank', 'activity', 'interactive', 'sắp xếp'],
  category: 'learning',
  scope: 'group',
  shortDescription: 'Sequence steps or events by clicking them in order',
  related: ['tls.a.match', 'tls.a.choice'],
  activity: { kind: 'order', answers: 'multi' },
  describe: {
    when: 'Steps of a procedure, events of a history, stages of a cycle that must be sequenced.',
    avoid: 'Items with no single right order: tls.a.sort.',
    example: { id: 'b_order', type: 'tls.a.order', props: defaults },
  },
  schema,
  defaults,
  size: { preferred: [1500, 800], min: [1050, 620] },
  layout: ((props: Record<string, unknown>, ctx: LayoutContext) => htmlHostNode(poster, 'tls.a.order', props, ctx)) as BlockDefinition['layout'],
  poster,
  html: { template, interact: interact as NonNullable<BlockDefinition['html']>['interact'] },
  motion: { parts: ['root'], preset: 'fade-up' },
  capacity: ((props: OrderProps) => capacityOf({ items: { max: ORDER_MAX, used: Array.isArray(props.items) ? props.items.length : 0 } }, true, [{ kind: 'truncate', slot: 'items' }])) as BlockDefinition['capacity'],
  lint: ((props: OrderProps) => lintOrder(props)) as BlockDefinition['lint'],
}
