/** tls.c.number-story — spro creative CR13 (the shared wave suite). */
import { tlsCNumberStory, buildNumberStory } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCNumberStory, build: buildNumberStory, category: 'metric', scope: 'slide',
  overflow: { steps: [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: 'x' })) },
  variants: { slot: 'variant', values: ["arrow-row", "staircase", "zoom"] },
  long: { steps: [{ value: '1,200,000', label: 'Lorem ipsum dolor sit amet consectetur adipisc', note: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor i' }, { value: '4 h', label: 'Lorem ipsum dolor sit amet con' }, { value: '1 in 5', label: 'leave' }] }, parts: ["step[0]", "step[1]"],
})

import { layoutAt } from '../composite-test'
import { breaksWord } from '../_poster'
import type { LayoutNode } from '../../../types'

const lines = (n: LayoutNode, out: string[][] = []): string[][] => {
  if (n.k === 'text') out.push(n.lines.map((l) => l.text))
  if (n.k === 'group') n.children.forEach((c) => lines(c, out))
  return out
}

describe('spro S17: a number or a word is never cut in two', () => {
  it('four steps in a wide poster keep each value on one line (nova s3 "85,0 / 00")', () => {
    const props = { steps: [{ label: 'units in year one', value: '85,000' }, { label: 'year-one revenue', value: '$31M' }, { label: 'launch budget', value: '$6.4M' }, { label: 'break-even', value: 'Month 14' }], variant: 'arrow-row' }
    const tree = layoutAt(tlsCNumberStory as any, props, 1600, 560)
    expect(breaksWord(tree)).toBe(false)
    expect(lines(tree).find((l) => l.join('').includes('85,000'))).toEqual(['85,000'])
  })
  it('three steps in a narrow region stack instead of cutting labels (nova s4 "househ / old")', () => {
    const props = { steps: [{ label: 'of the household energy bill', value: '45%' }, { label: 'annual market growth to 2030', value: '19%' }, { label: 'open complaints: installs, apps', value: '2' }] }
    expect(breaksWord(layoutAt(tlsCNumberStory as any, props, 620, 760))).toBe(false)
  })
  it('breaksWord tells a cut word from a soft break', () => {
    const t = (ls: string[]): LayoutNode => ({ k: 'text', box: { x: 0, y: 0, width: 10, height: 10 }, lines: ls.map((text) => ({ text })), style: {} } as any)
    expect(breaksWord(t(['85,0', '00']))).toBe(true)
    expect(breaksWord(t(['year-one ', 'revenue']))).toBe(false)
    expect(breaksWord(t(['one line']))).toBe(false)
  })
})
