/**
 * spro sprint 2026-11c c1 (MĂM s13): filling a tall room never grows a title past its longest word —
 * four narrow cards printed "Delivera|bles" after the type step.
 */
import type { LayoutNode } from '../types'
import { brokenWords, fillLayout } from './fill'
import { cutWordsIn } from './words'
import { makeCtx } from '../library/layout/test-helpers'
import { registry } from '../library/composite/composite-test'
import { tlsCCards } from '../library/composite/tls-c-cards/index'

const broken = (n: LayoutNode): number => cutWordsIn(n)
const sizes = (n: LayoutNode): number[] => (n.k === 'group' ? n.children.flatMap(sizes) : n.k === 'text' ? [n.style.size] : [])

describe('fill keeps words whole', () => {
  it('brokenWords counts a cut, not a break at a space or between Han characters', () => {
    expect(brokenWords([{ text: 'Delivera' }, { text: 'bles' }])).toBe(1)
    expect(brokenWords([{ text: 'Food ' }, { text: 'explorers' }])).toBe(0)
    expect(brokenWords([{ text: 'Food' }, { text: ' explorers' }])).toBe(0)
    expect(brokenWords([{ text: '中文' }, { text: '字' }])).toBe(0)
  })

  it('a centred text placed one node per line is read as one text', () => {
    const t = (part: string, text: string) => ({ k: 'text', part, lines: [{ text }] })
    expect(cutWordsIn({ k: 'group', children: [t('title[1][0]', 'Deliverable'), t('title[1][1]', 's'), t('title[2][0]', 'Tài liệu '), t('title[2][1]', 'kèm')] } as never)).toBe(1)
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
