/**
 * tls.a.sort — put each item into its bin (kind: 'html', family 'live').
 * Poster: the items as a grid and the bins as chips under it. Live: click an item, then a bin;
 * an assigned item shows its bin's number.
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { capacityOf } from '../../diagram/_kit'
import { htmlHostNode } from '../../../html-block'
import { cellsPoster } from '../../../activity/kit'
import { seededOrder } from '../../../activity/shuffle'
import { distinct } from '../../../activity/live-kit'
import { template } from './template'
import { interact } from './interact'

export const BIN_MIN = 2
export const BIN_MAX = 3
export const SORT_MIN = 3
export const SORT_MAX = 9
export const FOOTER_H = 64
export const EXPLANATION_H = 84

export interface SortItem {
  text: string
  bin: number
}
export interface SortProps extends Record<string, unknown> {
  prompt: string
  bins: string[]
  items: SortItem[]
  explanation?: string
  retry?: boolean
  showAnswer?: boolean
}

export const schema: BlockSchema = {
  prompt: { type: { kind: 'richText', maxChars: 160 }, role: 'content', label: 'Task', required: true, guidance: 'e.g. "Phân loại các ví dụ vào đúng nhóm".' },
  bins: { type: { kind: 'list', min: BIN_MIN, max: BIN_MAX, of: { kind: 'text', maxChars: 40 } }, role: 'content', label: 'Bins', required: true, guidance: '2-3 category names.' },
  items: {
    type: { kind: 'list', min: SORT_MIN, max: SORT_MAX, of: { kind: 'object', fields: { text: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Item', required: true }, bin: { type: { kind: 'number' }, role: 'content', label: 'Bin index', required: true } } } },
    role: 'content',
    label: 'Items',
    required: true,
    guidance: '3-9 items; bin = the 0-based index in bins; every bin gets at least one item.',
  },
  explanation: { type: { kind: 'text', maxChars: 240 }, role: 'content', label: 'Explanation' },
  retry: { type: { kind: 'boolean' }, role: 'option', label: 'Retry button' },
  showAnswer: { type: { kind: 'boolean' }, role: 'option', label: 'Show-answer button' },
}

export const defaults: SortProps = {
  prompt: 'Sort the numbers',
  bins: ['Even', 'Odd'],
  items: [
    { text: '4', bin: 0 },
    { text: '7', bin: 1 },
    { text: '10', bin: 0 },
    { text: '13', bin: 1 },
    { text: '22', bin: 0 },
  ],
}

/** Display position → item index. */
export function displayOrder(props: SortProps): number[] {
  const items = Array.isArray(props.items) ? props.items : []
  return seededOrder(items.length, items.map((x) => x?.text).join('|'))
}

export function lintSort(props: SortProps): LintFinding[] {
  const out: LintFinding[] = []
  const err = (rule: string, part: string, message: string) => out.push({ level: 'error', rule, part, message })
  const bins = Array.isArray(props.bins) ? props.bins : []
  const items = Array.isArray(props.items) ? props.items : []
  if (bins.length < BIN_MIN || bins.length > BIN_MAX) err('activity/bins-count', 'bins', `Give ${BIN_MIN} to ${BIN_MAX} bins (got ${bins.length}).`)
  if (!distinct(bins) || bins.some((b) => !String(b ?? '').trim())) err('activity/bins-invalid', 'bins', 'Bins must be non-empty and distinct.')
  if (items.length < SORT_MIN || items.length > SORT_MAX) err('activity/items-count', 'items', `Give ${SORT_MIN} to ${SORT_MAX} items (got ${items.length}).`)
  if (items.some((x) => !x || !String(x.text ?? '').trim())) err('activity/item-empty', 'items', 'An item has no text.')
  if (!distinct(items.map((x) => x?.text ?? ''))) err('activity/items-duplicate', 'items', 'Two items have the same text.')
  if (items.some((x) => !Number.isInteger(x?.bin) || x.bin < 0 || x.bin >= bins.length)) err('activity/bin-out-of-range', 'items', 'An item names a bin that does not exist.')
  else if (bins.length >= BIN_MIN && bins.some((_, bi) => !items.some((x) => x.bin === bi))) err('activity/bin-unused', 'items', 'Every bin needs at least one item.')
  return out
}

export function poster(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as SortProps
  const items = (Array.isArray(p.items) ? p.items : []).slice(0, SORT_MAX)
  const ord = displayOrder({ ...p, items })
  const bins = (Array.isArray(p.bins) ? p.bins : []).slice(0, BIN_MAX).map((b, i) => `${i + 1}. ${b}`)
  return cellsPoster(ctx, { prompt: p.prompt ?? '', cells: ord.map((i) => String(items[i]?.text ?? '')), cols: items.length <= 4 ? 2 : 3, cellMin: 76, chips: bins, footer: FOOTER_H })
}

export const tlsASort: BlockDefinition = {
  type: 'tls.a.sort',
  name: 'Sort into groups',
  family: 'live',
  tier: 'A',
  kind: 'html',
  summary: 'Click an item, then its bin (live in Present mode).',
  keywords: ['sort', 'classify', 'categorise', 'group', 'activity', 'interactive', 'phân loại'],
  category: 'learning',
  scope: 'group',
  shortDescription: 'Classify items into two or three categories by clicking',
  related: ['tls.a.match', 'tls.a.order'],
  activity: { kind: 'sort', answers: 'multi' },
  describe: {
    when: 'Classify examples into categories (e.g. fact / opinion, even / odd).',
    avoid: 'Items with one correct sequence: tls.a.order.',
    example: { id: 'b_sort', type: 'tls.a.sort', props: defaults },
  },
  schema,
  defaults,
  size: { preferred: [1500, 800], min: [1050, 600] },
  layout: ((props: Record<string, unknown>, ctx: LayoutContext) => htmlHostNode(poster, 'tls.a.sort', props, ctx)) as BlockDefinition['layout'],
  poster,
  html: { template, interact: interact as NonNullable<BlockDefinition['html']>['interact'] },
  motion: { parts: ['root'], preset: 'fade-up' },
  capacity: ((props: SortProps) => capacityOf({ items: { max: SORT_MAX, used: Array.isArray(props.items) ? props.items.length : 0 } }, true, [{ kind: 'truncate', slot: 'items' }])) as BlockDefinition['capacity'],
  lint: ((props: SortProps) => lintSort(props)) as BlockDefinition['lint'],
}
