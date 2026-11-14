/**
 * spro sprint 2026-11c c1 (MĂM s13): filling a tall room never grows a title past its longest word —
 * four narrow cards printed "Delivera|bles" after the type step.
 */
import type { LayoutNode } from '../types'
import { brokenWords, fillLayout } from './fill'
import { makeCtx } from '../library/layout/test-helpers'
import { registry } from '../library/composite/composite-test'
import { tlsCCards } from '../library/composite/tls-c-cards/index'

const broken = (n: LayoutNode): number => (n.k === 'group' ? n.children.reduce((t, c) => t + broken(c), 0) : n.k === 'text' ? brokenWords(n.lines) : 0)
const sizes = (n: LayoutNode): number[] => (n.k === 'group' ? n.children.flatMap(sizes) : n.k === 'text' ? [n.style.size] : [])

describe('fill keeps words whole', () => {
  it('brokenWords counts a cut, not a break at a space or between Han characters', () => {
    expect(brokenWords([{ text: 'Delivera' }, { text: 'bles' }])).toBe(1)
    expect(brokenWords([{ text: 'Food ' }, { text: 'explorers' }])).toBe(0)
    expect(brokenWords([{ text: 'Food' }, { text: ' explorers' }])).toBe(0)
    expect(brokenWords([{ text: '中文' }, { text: '字' }])).toBe(0)
  })

  it('four narrow cards in a tall room: filled, and no title cut', () => {
    const cards = [['Vai trò', 'Senior Product Designer + Mobile UX Architect, không sao chép giao diện app nào.'], ['Deliverables', 'Màn hình high-fidelity, prototype clickable, design system, mock data thống nhất.'], ['Tài liệu kèm', 'Tóm tắt IA/UX, ghi chú mock vs API, để xuất MVP và tính năng phase sau.'], ['Chất lượng', 'Visual concept trước, viewport 390 x 844 px, kiểm tra empty/loading/error.']].map(([title, text]) => ({ icon: 'user', title, text }))
    const ctx = makeCtx({ width: 1800, height: 800 }, registry(), { fill: true } as never)
    const plain = tlsCCards.layout({ ...(tlsCCards.defaults as object), cards } as never, makeCtx({ width: 1800, height: 800 }, registry()))
    const filled = fillLayout(tlsCCards, { ...(tlsCCards.defaults as object), cards }, ctx)
    expect(broken(filled)).toBeLessThanOrEqual(broken(plain))
    expect(broken(filled)).toBe(0)
    expect(Math.max(...sizes(filled))).toBeGreaterThanOrEqual(Math.max(...sizes(plain)))
  })
})
