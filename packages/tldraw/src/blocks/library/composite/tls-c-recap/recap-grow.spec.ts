/** spro S29 7c — a recap alone in a tall region steps its points' type up; a full one keeps it. */
import { tlsCRecap } from './index'
import { registry } from '../composite-test'
import type { LayoutNode } from '../../../types'
const { createLayoutContext } = require('../../../layout/layout-child')
const { TEST_TOKENS, TEST_SURFACE } = require('../../layout/test-helpers')

/** The size of the text that sets the first point. */
const pointSize = (n: LayoutNode): number => {
  const a = n as any
  if (a.k === 'text' && a.lines.some((l: any) => l.text.includes('ngắn'))) return a.style.size
  for (const k of a.children ?? []) {
    const s = pointSize(k)
    if (s) return s
  }
  return 0
}
const at = (props: Record<string, unknown>, w: number, h: number) =>
  tlsCRecap.layout({ ...(tlsCRecap.defaults as any), ...props } as any, createLayoutContext({ box: { width: w, height: h }, tokens: TEST_TOKENS, surface: TEST_SURFACE, registry: registry() }))

describe('S29 7c — recap grows into its room', () => {
  it.each(['numbered', 'cards'])('%s: three short points in a tall region set larger type than in a short one', (style) => {
    const props = { style, points: ['Một ý ngắn', 'Ý thứ hai', 'Ý thứ ba'], takeaway: '' }
    const tall = pointSize(at(props, 1600, 760))
    const tight = pointSize(at(props, 1600, 200))
    expect(tight).toBeGreaterThan(0)
    expect(tall).toBeGreaterThan(tight)
  })
  it('the grown recap stays in its box', () => {
    const node = at({ style: 'numbered', points: ['Một ý ngắn', 'Ý thứ hai', 'Ý thứ ba'] }, 1600, 760)
    expect(node.box.height).toBeLessThanOrEqual(761)
  })
})
