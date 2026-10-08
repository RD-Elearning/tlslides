/**
 * tls.m.icon-label — icon steps, label beneath, shrink to the box, scaled icon path.
 */

import { tlsMIconLabel } from './index'
import { standardBlockSuite, leavesOf } from '../../text/standard-suite'
import { ctxNoAssets } from '../media-test'

standardBlockSuite(tlsMIconLabel, { noCapacity: true })

const lay = (props: Record<string, unknown>, w: number, h: number) =>
  tlsMIconLabel.layout({ ...(tlsMIconLabel.defaults as any), ...props } as any, ctxNoAssets(w, h))
const icon = (tree: any) => leavesOf(tree, 'icon')[0]
const label = (tree: any) => leavesOf(tree, 'label')[0]

describe('tls.m.icon-label', () => {
  it('icon size steps sm < md < lg, label sits beneath the icon', () => {
    const s = (size: string) => icon(lay({ size }, 400, 300)).width
    expect(s('sm')).toBeLessThan(s('md'))
    expect(s('md')).toBeLessThan(s('lg'))
    const tree = lay({ size: 'lg' }, 400, 300)
    expect(label(tree).y).toBeGreaterThanOrEqual(icon(tree).y + icon(tree).height)
  })

  it('the example fits its preferred and min size (icon shrinks, label stays inside)', () => {
    for (const [w, h] of [tlsMIconLabel.size.preferred, tlsMIconLabel.size.min]) {
      const tree = lay(tlsMIconLabel.describe!.example.props, w, h)
      const i = icon(tree)
      const l = label(tree)
      expect(i.x + i.width).toBeLessThanOrEqual(w + 1)
      expect(l.y + l.height).toBeLessThanOrEqual(h + 1)
    }
  })

  it('the icon path is scaled to its box', () => {
    const small = (icon(lay({ size: 'sm' }, 400, 300)).node as any).icon
    const big = (icon(lay({ size: 'lg' }, 400, 300)).node as any).icon
    expect(small).not.toBe(big)
  })
})
