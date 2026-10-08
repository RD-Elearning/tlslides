/**
 * tls.c.journey — schema, defaults, and the path geometry shared by template and poster.
 */

import type { BlockSchema } from '../../../types'
import { safe, str } from '../_showcase'

export interface Milestone {
  when: string
  title: string
  text?: string
}

export interface JourneyProps extends Record<string, unknown> {
  milestones: Milestone[]
}

export const schema: BlockSchema = {
  milestones: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          when: { type: { kind: 'text', maxChars: 16 }, role: 'content', label: 'When', required: true },
          title: { type: { kind: 'text', maxChars: 36 }, role: 'content', label: 'Title', required: true },
          text: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Text' },
        },
      },
      min: 3,
      max: 6,
    },
    role: 'content',
    label: 'Milestones',
    required: true,
    guidance: '3-6 items in order, each { when, title, text? }: a date or stage, 2-5 words, one short line.',
  },
}

export const defaults: JourneyProps = {
  milestones: [
    { when: 'Năm 1', title: 'Nền tảng', text: 'Toán, lập trình và tư duy máy tính' },
    { when: 'Năm 2', title: 'Chuyên ngành', text: 'Cấu trúc dữ liệu, cơ sở dữ liệu, mạng' },
    { when: 'Năm 3', title: 'Thực tập', text: 'Ba tháng tại doanh nghiệp đối tác' },
    { when: 'Năm 4', title: 'Khóa luận', text: 'Đề tài nghiên cứu với giảng viên hướng dẫn' },
    { when: 'Tốt nghiệp', title: 'Sự nghiệp', text: 'Kỹ sư, nhà nghiên cứu, nhà khởi nghiệp' },
  ],
}

export const MAX_MILESTONES = 6

export function milestonesOf(props: JourneyProps): Milestone[] {
  const list = Array.isArray(props.milestones) ? props.milestones : []
  return list
    .filter((m): m is Milestone => !!m && typeof m === 'object')
    .slice(0, MAX_MILESTONES)
    .map((m) => ({ when: str(m.when, 16), title: str(m.title, 36), text: str(m.text, 90) }))
}

export interface JourneyGeometry {
  /** Path data (absolute, block coordinates) and its length. */
  d: string
  length: number
  stroke: number
  /** Node centres and radius. */
  nodes: Array<{ x: number; y: number; above: boolean }>
  r: number
  /** Label column width and the gap between node and label. */
  labelW: number
  gap: number
}

/** Cubic bezier point. */
function bez(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

export function geometry(width: number, height: number, count: number): JourneyGeometry {
  const W = safe(width)
  const H = safe(height)
  const n = Math.max(1, count)
  const mid = H / 2
  const amp = Math.min(H * 0.07, 60)
  const r = Math.max(4, Math.min(20, W / n / 10))
  const stroke = Math.max(2, Math.min(8, r * 0.35))
  const nodes = Array.from({ length: n }, (_, i) => ({
    x: (W * (i + 0.5)) / n,
    y: mid + (i % 2 === 0 ? -amp : amp),
    above: i % 2 === 0,
  }))
  const pts = [{ x: 0, y: mid }, ...nodes, { x: W, y: mid }]
  const f = (v: number) => Math.round(v * 100) / 100
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`
  let length = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const dx = (b.x - a.x) / 2
    const c1 = { x: a.x + dx, y: a.y }
    const c2 = { x: b.x - dx, y: b.y }
    d += ` C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(b.x)} ${f(b.y)}`
    let px = a.x
    let py = a.y
    for (let s = 1; s <= 16; s++) {
      const t = s / 16
      const x = bez(a.x, c1.x, c2.x, b.x, t)
      const y = bez(a.y, c1.y, c2.y, b.y, t)
      length += Math.hypot(x - px, y - py)
      px = x
      py = y
    }
  }
  return {
    d,
    length: Math.ceil(length) + 2,
    stroke,
    nodes,
    r,
    labelW: Math.max(1, Math.min(W / n - 24, 440)),
    gap: r + 20,
  }
}

/** Label font tokens by count (narrow columns get smaller text). */
export function labelTokens(count: number): { title: 'lead' | 'body'; text: 'caption' | 'footnote' } {
  return count > 4 ? { title: 'body', text: 'footnote' } : { title: 'lead', text: 'caption' }
}
