/**
 * L03 — labels of activity controls, in the deck locale (`DeckTokens.locale`: `vi`, `en`, …).
 * An unknown locale falls back to English; Vietnamese is the product's first language.
 */

import type { ActivityLabels } from '../types'

const VI: ActivityLabels = {
  check: 'Kiểm tra',
  retry: 'Làm lại',
  correct: 'Chính xác!',
  wrong: 'Chưa đúng',
  showAnswer: 'Hiện đáp án',
  hint: 'Gợi ý',
  flip: 'Lật',
  flipAll: 'Lật hết',
  unflipAll: 'Úp hết',
  start: 'Bắt đầu',
  stop: 'Dừng',
  timeUp: 'Hết giờ',
  of: 'trên',
}

const EN: ActivityLabels = {
  check: 'Check',
  retry: 'Try again',
  correct: 'Correct!',
  wrong: 'Not quite',
  showAnswer: 'Show answer',
  hint: 'Hint',
  flip: 'Flip',
  flipAll: 'Flip all',
  unflipAll: 'Flip back',
  start: 'Start',
  stop: 'Stop',
  timeUp: "Time's up",
  of: 'of',
}

export function activityLabels(locale?: string): ActivityLabels {
  const lang = (locale ?? '').toLowerCase().split(/[-_]/)[0]
  return lang === 'vi' ? VI : EN
}
