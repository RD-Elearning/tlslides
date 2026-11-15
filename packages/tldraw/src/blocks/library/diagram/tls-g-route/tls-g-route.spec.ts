/** spro sprint 2026-11c S25 (carry-over pass 2) — tls.g.route and tls.m.screen draw whole in a slide region. */
import type { BlockDefinition, LayoutNode } from '../../../types'
import { tlsGRoute } from './index'
import { tlsMScreen } from '../../media/tls-m-screen'
import { registry } from '../../composite/composite-test'
import { assertContained } from '../../text/standard-suite'

const { createLayoutContext } = require('../../../layout/layout-child')
const { TEST_TOKENS, TEST_SURFACE } = require('../../layout/test-helpers')

const at = (def: BlockDefinition, props: Record<string, unknown>, W = 1600, H = 600) =>
  def.layout({ ...(def.defaults as any), ...props } as any, createLayoutContext({ box: { width: W, height: H }, tokens: TEST_TOKENS, surface: TEST_SURFACE, registry: registry() }))

function texts(n: LayoutNode, out: string[] = []): string[] {
  const a = n as any
  if (a.k === 'text') out.push((a.lines ?? []).map((l: any) => (typeof l === 'string' ? l : l.text ?? '')).join(' '))
  for (const k of a.children ?? []) texts(k, out)
  return out
}
function parts(n: LayoutNode, out: string[] = []): string[] {
  const a = n as any
  if (a.part) out.push(a.part)
  for (const k of a.children ?? []) parts(k, out)
  return out
}

describe('tls.g.route', () => {
  it('draws every stop, its note and the legs, contained', () => {
    const t = at(tlsGRoute, {})
    assertContained(t, { width: 1600, height: 600 })
    const s = texts(t).join(' ')
    for (const w of ['Hà Nội', 'Quản Bạ', 'Đồng Văn', 'Mã Pí Lèng', '300 km', '25 km']) expect(s).toContain(w)
    expect(parts(t)).toContain('route.line')
  })
  it('stays inside a narrow region with eight stops', () => {
    const stops = Array.from({ length: 8 }, (_, i) => ({ name: `Stop ${i + 1}`, note: 'A short note', leg: i ? `${i * 10} km` : '' }))
    assertContained(at(tlsGRoute, { stops }, 1200, 420), { width: 1200, height: 420 })
  })
  it('an empty list draws the empty state', () => {
    expect(texts(at(tlsGRoute, { stops: [] })).join(' ')).toMatch(/No stops/)
  })
})

describe('tls.m.screen', () => {
  it.each(['phone', 'tablet', 'browser'])('%s: a frame, one numbered part per entry and the legend, contained', (device) => {
    const t = at(tlsMScreen, { device }, 1500, 680)
    assertContained(t, { width: 1500, height: 680 })
    const p = parts(t)
    expect(p).toContain('device.screen')
    for (let i = 0; i < 5; i++) {
      expect(p).toContain(`part[${i}]`)
      expect(p).toContain(`item[${i}]`)
    }
    const s = texts(t).join(' ')
    for (const w of ['Thanh tiêu đề', 'Ô tìm kiếm', 'Danh mục', 'Món gợi ý', 'Thanh điều hướng', '1', '5']) expect(s).toContain(w)
  })
  it('every part kind draws, an unknown kind falls back to a list', () => {
    const kinds = ['bar', 'media', 'list', 'map', 'button', 'fab', 'nav', 'nope']
    const t = at(tlsMScreen, { parts: kinds.map((k, i) => ({ kind: k, label: `P${i}` })) }, 1500, 680)
    assertContained(t, { width: 1500, height: 680 })
    const p = parts(t)
    expect(p).toContain('part[3].pin')
    expect(p).toContain('part[5].button')
    expect(p.some((x) => x.startsWith('part[7].row'))).toBe(true)
  })
})
