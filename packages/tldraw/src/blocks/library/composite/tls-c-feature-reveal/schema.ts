/**
 * tls.c.feature-reveal — schema, defaults and the card grid geometry shared by template and poster.
 */

import type { BlockSchema } from '../../../types'
import { safe, str } from '../_showcase'

export interface RevealItem {
  icon?: string
  title: string
  text?: string
}

export interface FeatureRevealProps extends Record<string, unknown> {
  items: RevealItem[]
}

export const MAX_ITEMS = 6

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
          title: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'Title', required: true },
          text: { type: { kind: 'text', maxChars: 110 }, role: 'content', label: 'Text' },
        },
      },
      min: 3,
      max: MAX_ITEMS,
    },
    role: 'content',
    label: 'Cards',
    required: true,
    guidance: '3-6 cards, each { icon, title, text? }: a 1-4 word title and one sentence.',
  },
}

export const defaults: FeatureRevealProps = {
  items: [
    { icon: 'brain', title: 'Tư duy phản biện', text: 'Đặt câu hỏi đúng trước khi tìm câu trả lời.' },
    { icon: 'handshake', title: 'Làm việc nhóm', text: 'Dự án thật với vai trò rõ ràng trong nhóm.' },
    { icon: 'code', title: 'Kỹ năng số', text: 'Lập trình, dữ liệu và công cụ cộng tác.' },
    { icon: 'lightbulb', title: 'Sáng tạo', text: 'Biến ý tưởng thành nguyên mẫu trong một tuần.' },
    { icon: 'message', title: 'Giao tiếp', text: 'Trình bày rõ ràng trước lớp và doanh nghiệp.' },
    { icon: 'graduation-cap', title: 'Tự học', text: 'Học suốt đời với lộ trình cá nhân hóa.' },
  ],
}

export function itemsOf(props: FeatureRevealProps): RevealItem[] {
  const list = Array.isArray(props.items) ? props.items : []
  return list
    .filter((m): m is RevealItem => !!m && typeof m === 'object')
    .slice(0, MAX_ITEMS)
    .map((m) => ({ icon: str(m.icon, 40), title: str(m.title, 32), text: str(m.text, 110) }))
}

export interface CardBox {
  x: number
  y: number
  w: number
  h: number
}

export interface RevealGeometry {
  cards: CardBox[]
  pad: number
  icon: number
  compact: boolean
}

export function geometry(width: number, height: number, count: number): RevealGeometry {
  const W = safe(width)
  const H = safe(height)
  const n = Math.max(0, count)
  const cols = n <= 3 ? Math.max(1, n) : n === 4 ? 2 : 3
  const rows = Math.max(1, Math.ceil(n / cols))
  const gap = Math.min(32, W * 0.02)
  const w = Math.max(0, (W - gap * (cols - 1)) / cols)
  const h = Math.max(0, (H - gap * (rows - 1)) / rows)
  const cards: CardBox[] = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols)
    const inRow = Math.min(cols, n - row * cols)
    const offset = ((cols - inRow) * (w + gap)) / 2
    cards.push({ x: offset + (i % cols) * (w + gap), y: row * (h + gap), w, h })
  }
  const compact = rows > 1 || cols > 3
  const pad = Math.max(8, Math.min(40, w * 0.08, h * 0.12))
  const icon = Math.max(16, Math.min(compact ? 64 : 84, h * 0.25))
  return { cards, pad, icon, compact }
}
