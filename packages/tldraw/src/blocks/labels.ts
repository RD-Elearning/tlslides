/**
 * spro sprint 2026-11c S18-k (T30, D61): the few words a block prints by itself (a table head, a status, a
 * label over a takeaway), in the deck's language (`ResolvedTokens.locale`). Words the author gave always win;
 * an unknown locale falls back to English. The activity controls keep their own table (`activity/labels.ts`).
 */

const EN = {
  remember: 'Remember',
  metric: 'Metric',
  actual: 'Actual',
  target: 'Target',
  status: 'Status',
  note: 'Note',
  onTrack: 'On track',
  watch: 'Watch',
  offTrack: 'Off track',
} as const

export type BlockWord = keyof typeof EN

const VI: Record<BlockWord, string> = {
  remember: 'Ghi nhớ',
  metric: 'Chỉ số',
  actual: 'Thực tế',
  target: 'Mục tiêu',
  status: 'Trạng thái',
  note: 'Ghi chú',
  onTrack: 'Đúng tiến độ',
  watch: 'Cần theo dõi',
  offTrack: 'Chậm tiến độ',
}

const TABLES: Record<string, Record<BlockWord, string>> = { en: EN, vi: VI }

export function blockWord(key: BlockWord, locale?: string): string {
  const t = TABLES[(locale ?? 'en').toLowerCase().split(/[-_]/)[0]] ?? EN
  return t[key]
}
