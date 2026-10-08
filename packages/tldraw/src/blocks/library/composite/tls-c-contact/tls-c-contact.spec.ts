/**
 * tls.c.contact — icon per kind, person toggle, depth, capacity, intrinsic size.
 */

import { tlsCContact, buildContact, KIND_ICONS } from './index'
import { standardBlockSuite, leavesOf, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { makeCtx } from '../../layout/test-helpers'
import { ICONS } from '../../../icons'
import { depthOk, layoutAt, hasPart, registry } from '../composite-test'

standardBlockSuite(tlsCContact, { withRegistry: true, overflowProps: { items: Array.from({ length: 7 }, () => ({ kind: 'email', value: 'a@b.c' })) } })

const EX = tlsCContact.describe!.example.props as Record<string, unknown>
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('|')

describe('tls.c.contact', () => {
  it('is a group-scope closing composite', () => {
    expect(tlsCContact.scope).toBe('group')
    expect(tlsCContact.category).toBe('closing')
  })

  it('every kind maps to an icon that exists in the icon set', () => {
    expect(Object.keys(KIND_ICONS).sort()).toEqual(['address', 'email', 'phone', 'social', 'web'])
    for (const name of Object.values(KIND_ICONS)) expect(Object.prototype.hasOwnProperty.call(ICONS, name)).toBe(true)
  })

  it('build() depth <= 4 and no depth overflow at max content', () => {
    const items = ['email', 'phone', 'web', 'address', 'social', 'email'].map((kind) => ({ kind, value: 'v'.repeat(80) }))
    depthOk(tlsCContact, buildContact, { ...EX, person: { name: 'n'.repeat(40), role: 'r'.repeat(50) }, items }, 800, 700)
  })

  it('draws one icon per line, in the order given, and their text', () => {
    const items = [{ kind: 'email', value: 'a@x.org' }, { kind: 'phone', value: '+84 1' }, { kind: 'web', value: 'x.org' }, { kind: 'address', value: 'Vinh' }, { kind: 'social', value: '@x' }]
    const t = layoutAt(tlsCContact, { ...EX, items }, 800, 600)
    expect(leavesOf(t, 'items').filter((l) => l.k === 'icon')).toHaveLength(5)
    expect(textOf(t, 'items')).toBe('a@x.org|+84 1|x.org|Vinh|@x')
    // distinct glyphs per kind
    const paths = leavesOf(t, 'items').filter((l) => l.k === 'icon').map((l) => (l.node as any).icon)
    expect(new Set(paths).size).toBe(5)
  })

  it('showPerson removes only the person; the list sits below the person', () => {
    const on = layoutAt(tlsCContact, EX, 800, 600)
    const off = layoutAt(tlsCContact, { ...EX, showPerson: false }, 800, 600)
    expect(hasPart(on, 'person')).toBe(true)
    expect(hasPart(off, 'person')).toBe(false)
    expect(hasPart(off, 'items')).toBe(true)
    expect(Math.min(...leavesOf(on, 'items').map((l) => l.y))).toBeGreaterThanOrEqual(Math.max(...leavesOf(on, 'person').map((l) => l.y + l.height)) - 1)
    assertNoTextOverlap(on)
    assertContained(on, { width: 800, height: Math.ceil(on.box.height) })
  })

  it('works without a person and with unknown kinds (falls back to the globe)', () => {
    const t = layoutAt(tlsCContact, { person: undefined, items: [{ kind: 'fax', value: '123' }] }, 800, 400)
    expect(hasPart(t, 'person')).toBe(false)
    expect(leavesOf(t, 'items').filter((l) => l.k === 'icon')).toHaveLength(1)
  })

  it('intrinsicSize grows with the number of lines', () => {
    const ctx = makeCtx({ width: 800, height: 600 }, registry())
    const one = tlsCContact.intrinsicSize!({ ...EX, items: [{ kind: 'email', value: 'a' }] } as any, ctx).height
    const many = tlsCContact.intrinsicSize!({ ...EX, items: Array.from({ length: 5 }, () => ({ kind: 'email', value: 'a' })) } as any, ctx).height
    expect(many).toBeGreaterThan(one)
  })
})
