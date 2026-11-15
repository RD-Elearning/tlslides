/** tls.c.section-brief — spro sprint 2026-11b S07-c (the shared wave-1 suite + a teaching check). */
import { tlsCSectionBrief, buildSectionBrief, restatesTitle } from './index'
import { wave1Suite } from '../wave1-test'

const L = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip'

wave1Suite({
  def: tlsCSectionBrief, build: buildSectionBrief, category: 'divider', scope: 'slide',
  overflow: { title: L.slice(0, 71) },
  variants: { slot: 'variant', values: ['left-rail', 'split', 'numbered'] },
  long: { title: L.slice(0, 68), question: L.slice(0, 138), points: [L.slice(0, 88), L.slice(1, 89), L.slice(2, 90), L.slice(3, 91)] },
  parts: ['title'],
})

describe('tls.c.section-brief — a question that restates the title (spro S29)', () => {
  it('is a restatement when it only adds up to two words to the title', () => {
    expect(restatesTitle('Vì sao có ngày và đêm?', 'Vì sao chúng ta có ngày và đêm?')).toBe(true)
    expect(restatesTitle('Sets of numbers', 'Sets of numbers')).toBe(true)
    expect(restatesTitle('Sets of numbers', 'How do the natural numbers grow into the rationals?')).toBe(false)
    expect(restatesTitle('Mặt Trời', '')).toBe(false)
  })
})

describe('T31: the author\'s question is never dropped', () => {
  const { layoutAt } = require('../composite-test')
  const texts = (n: any, out: string[] = []): string[] => {
    if (n.k === 'text') out.push(n.lines.map((l: any) => l.text).join(' '))
    for (const c of n.children ?? []) texts(c, out)
    return out
  }
  it('a restating question shows once, in its fuller wording', () => {
    const t = texts(layoutAt(tlsCSectionBrief, { number: '03', title: 'Vì sao có ngày và đêm?', question: 'Vì sao chúng ta có ngày và đêm?', points: [] }, 1600, 700)).join(' | ')
    expect(t.replace(/\s+/g, ' ')).toContain('chúng ta')
    expect(t.replace(/\s+/g, ' ').split('ngày và').length - 1).toBe(1)
  })
  it('a title that is not a question gives way to the author\'s question of the same words', () => {
    const t = texts(layoutAt(tlsCSectionBrief, { number: '01', title: 'Sets of numbers', question: 'Sets of numbers?', points: [] }, 1600, 700)).join(' ')
    expect(t).toContain('?')
  })
})
