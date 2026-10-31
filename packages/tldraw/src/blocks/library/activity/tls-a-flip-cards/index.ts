/**
 * tls.a.flip-cards — term / definition cards that flip on click (kind: 'html', family 'live').
 * Not scored. Poster: the fronts as a grid of cards. Live: each card is a `<button aria-pressed>`
 * showing front or back; "Lật hết" / "Úp hết" flip all.
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { capacityOf } from '../../diagram/_kit'
import { htmlHostNode } from '../../../html-block'
import { cellsPoster } from '../../../activity/kit'
import { distinct } from '../../../activity/live-kit'
import { template } from './template'
import { interact } from './interact'

export const FLIP_MIN = 2
export const FLIP_MAX = 8
export const FOOTER_H = 64

export interface Card {
  front: string
  back: string
}
export interface FlipProps extends Record<string, unknown> {
  prompt?: string
  cards: Card[]
}

export const schema: BlockSchema = {
  prompt: { type: { kind: 'richText', maxChars: 120 }, role: 'content', label: 'Heading', guidance: 'Optional, e.g. "Ôn thuật ngữ".' },
  cards: {
    type: {
      kind: 'list',
      min: FLIP_MIN,
      max: FLIP_MAX,
      of: {
        kind: 'object',
        fields: {
          front: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Front', required: true, guidance: 'A term or a question.' },
          back: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Back', required: true, guidance: 'Its definition or answer.' },
        },
      },
    },
    role: 'content',
    label: 'Cards',
    required: true,
    guidance: '2-8 cards; distinct fronts.',
  },
}

export const defaults: FlipProps = {
  prompt: 'Review the terms',
  cards: [
    { front: 'Mean', back: 'The sum of the values divided by their number.' },
    { front: 'Median', back: 'The middle value of the ordered data.' },
    { front: 'Range', back: 'The largest value minus the smallest.' },
    { front: 'Variance', back: 'The mean squared distance from the mean.' },
  ],
}

export function lintFlip(props: FlipProps): LintFinding[] {
  const out: LintFinding[] = []
  const err = (rule: string, message: string) => out.push({ level: 'error', rule, part: 'cards', message })
  const cards = Array.isArray(props.cards) ? props.cards : []
  if (cards.length < FLIP_MIN) err('activity/cards-count', `Give ${FLIP_MIN} to ${FLIP_MAX} cards (got ${cards.length}).`)
  if (cards.some((c) => !c || !String(c.front ?? '').trim() || !String(c.back ?? '').trim())) err('activity/card-empty', 'Every card needs a front and a back.')
  if (!distinct(cards.map((c) => c?.front ?? ''))) err('activity/cards-duplicate', 'Two cards have the same front; make them distinct.')
  return out
}

export function poster(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as FlipProps
  const cards = (Array.isArray(p.cards) ? p.cards : []).slice(0, FLIP_MAX)
  return cellsPoster(ctx, { prompt: p.prompt ?? '', cells: cards.map((c) => String(c?.front ?? '')), cols: cards.length <= 4 ? 2 : 3, cellMin: 190, footer: FOOTER_H })
}

export const tlsAFlipCards: BlockDefinition = {
  type: 'tls.a.flip-cards',
  name: 'Flip cards',
  family: 'live',
  tier: 'A',
  kind: 'html',
  summary: 'Cards that flip from term to definition on click (live in Present mode).',
  keywords: ['flashcards', 'flip', 'terms', 'review', 'activity', 'interactive', 'thẻ ghi nhớ'],
  category: 'learning',
  scope: 'group',
  shortDescription: 'Interactive flip cards: term on the front, meaning on the back',
  related: ['tls.c.flashcards', 'tls.c.quiz'],
  activity: { kind: 'flip', answers: 'none' },
  describe: {
    when: 'Review terms or facts at the end of a section: the learner recalls, then flips.',
    avoid: 'Scored questions: tls.a.choice. Print handouts: tls.c.flashcards.',
    example: { id: 'b_flip', type: 'tls.a.flip-cards', props: defaults },
  },
  schema,
  defaults,
  size: { preferred: [1500, 800], min: [1050, 640] },
  layout: ((props: Record<string, unknown>, ctx: LayoutContext) => htmlHostNode(poster, 'tls.a.flip-cards', props, ctx)) as BlockDefinition['layout'],
  poster,
  html: { template, interact: interact as NonNullable<BlockDefinition['html']>['interact'] },
  motion: { parts: ['root'], preset: 'fade-up' },
  capacity: ((props: FlipProps) => capacityOf({ cards: { max: FLIP_MAX, used: Array.isArray(props.cards) ? props.cards.length : 0 } }, true, [{ kind: 'truncate', slot: 'cards' }])) as BlockDefinition['capacity'],
  lint: ((props: FlipProps) => lintFlip(props)) as BlockDefinition['lint'],
}
