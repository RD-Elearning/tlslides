/**
 * tls.a.timer — a countdown for an in-class task (kind: 'html', family 'live'; not scored).
 * Poster: the label and the full time. Live: "Bắt đầu" / "Dừng" and a "Hết giờ" state at zero.
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { capacityOf } from '../../diagram/_kit'
import { htmlHostNode } from '../../../html-block'
import { cellsPoster } from '../../../activity/kit'
import { template } from './template'
import { interact } from './interact'

export const TIMER_MIN = 5
export const TIMER_MAX = 900
export const FOOTER_H = 64

export interface TimerProps extends Record<string, unknown> {
  label: string
  seconds: number
}

export const schema: BlockSchema = {
  label: { type: { kind: 'richText', maxChars: 120 }, role: 'content', label: 'Label', required: true, guidance: 'What the class does while the clock runs, e.g. "Thảo luận nhóm".' },
  seconds: { type: { kind: 'number' }, role: 'option', label: 'Seconds', required: true, guidance: '5 to 900.' },
}

export const defaults: TimerProps = { label: 'Discuss with your neighbour', seconds: 120 }

export const clock = (s: number): string => {
  const n = Math.max(0, Math.round(Number(s) || 0))
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

export function lintTimer(props: TimerProps): LintFinding[] {
  const out: LintFinding[] = []
  const s = Number(props.seconds)
  if (!Number.isFinite(s) || s < TIMER_MIN || s > TIMER_MAX) out.push({ level: 'error', rule: 'activity/timer-range', part: 'seconds', message: `Seconds must be ${TIMER_MIN} to ${TIMER_MAX} (got ${props.seconds}).` })
  if (!String(props.label ?? '').trim()) out.push({ level: 'error', rule: 'activity/timer-label', part: 'label', message: 'Give the timer a label.' })
  return out
}

export function poster(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  const p = props as TimerProps
  return cellsPoster(ctx, { prompt: p.label ?? '', cells: [clock(p.seconds)], cols: 1, cellMin: 260, footer: FOOTER_H })
}

export const tlsATimer: BlockDefinition = {
  type: 'tls.a.timer',
  name: 'Timer',
  family: 'live',
  tier: 'A',
  kind: 'html',
  summary: 'A countdown the teacher starts for a task (live in Present mode).',
  keywords: ['timer', 'countdown', 'clock', 'activity', 'interactive', 'đếm ngược'],
  category: 'learning',
  scope: 'group',
  shortDescription: 'A big countdown clock for a class task',
  related: ['tls.a.reveal'],
  activity: { kind: 'timer', answers: 'none' },
  describe: {
    when: 'Give the class a fixed time to discuss, solve or write.',
    avoid: 'Content to read: tls.t.bullets. A timer belongs on a task slide, not a content slide.',
    example: { id: 'b_timer', type: 'tls.a.timer', props: defaults },
  },
  schema,
  defaults,
  size: { preferred: [1200, 560], min: [900, 480] },
  layout: ((props: Record<string, unknown>, ctx: LayoutContext) => htmlHostNode(poster, 'tls.a.timer', props, ctx)) as BlockDefinition['layout'],
  poster,
  html: { template, interact: interact as NonNullable<BlockDefinition['html']>['interact'] },
  motion: { parts: ['root'], preset: 'fade-up' },
  capacity: ((props: TimerProps) => capacityOf({ label: { max: 120, used: String(props.label ?? '').length } }, true, [{ kind: 'truncate', slot: 'label' }])) as BlockDefinition['capacity'],
  lint: ((props: TimerProps) => lintTimer(props)) as BlockDefinition['lint'],
}
