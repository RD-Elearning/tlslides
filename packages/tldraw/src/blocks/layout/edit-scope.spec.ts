import { bound, findValue, itemPrefix, mapChildPaths, mapOut } from './edit-scope'
import type { BlockSpec, LayoutNode } from '../types'

const text = (propPath: string): LayoutNode =>
  ({ k: 'text', box: { x: 0, y: 0, width: 1, height: 1 }, lines: [], style: {} as never, propPath }) as LayoutNode

describe('editor E02 — edit scopes', () => {
  test('an authored child maps exactly through its reference', () => {
    const child: BlockSpec = { id: 'c', type: 'tls.t.title', props: { text: 'Hi' } }
    const parent = { children: [{ id: 'a', type: 't', props: {} }, child] }
    expect(mapOut(child, child.props as Record<string, unknown>, 'text', parent)).toBe('children.1.props.text')
  })

  test('a built child maps by a unique value, never by an ambiguous one', () => {
    const spec: BlockSpec = { id: 'x', type: 'tls.t.title', props: { text: 'Cover' } }
    expect(mapOut(spec, { text: 'Cover' }, 'text', { title: 'Cover', kicker: 'K' })).toBe('title')
    expect(mapOut(spec, { text: 'Same' }, 'text', { items: [{ t: 'Same' }, { t: 'Same' }] })).toBeUndefined()
    expect(mapOut(spec, { text: 'COVER' }, 'text', { title: 'Cover' })).toBeUndefined()
  })

  test('an explicit bind wins over value matching', () => {
    const spec = bound({ id: 'x', type: 't', props: { text: 'Same' } } as BlockSpec, { text: 'items.1.title' })
    expect(mapOut(spec, { text: 'Same' }, 'text', { items: [{ title: 'Same' }, { title: 'Same' }] })).toBe('items.1.title')
  })

  test('mapChildPaths rewrites leaves, drops unknowns and names the item', () => {
    const child: BlockSpec = { id: 'c', type: 'tls.l.card', props: { children: [] } }
    const parent = { children: [child] }
    const node: LayoutNode = { k: 'group', box: { x: 0, y: 0, width: 1, height: 1 }, children: [text('title')] } as LayoutNode
    expect(mapChildPaths(node, child, { title: 'T' }, parent)).toBe('children.0')
    expect(((node as { children: LayoutNode[] }).children[0] as { propPath?: string }).propPath).toBe('children.0.props.title')
    const lost: LayoutNode = { k: 'group', box: { x: 0, y: 0, width: 1, height: 1 }, children: [text('text')] } as LayoutNode
    mapChildPaths(lost, { id: 'b', type: 't', props: {} }, { text: 'nowhere' }, { title: 'x' })
    expect(((lost as { children: LayoutNode[] }).children[0] as { propPath?: string }).propPath).toBeUndefined()
  })

  test('helpers', () => {
    expect(itemPrefix('items.2.title')).toBe('items.2')
    expect(itemPrefix('children.0.props.children.1.props.text')).toBe('children.0.props.children.1')
    expect(itemPrefix('title')).toBeUndefined()
    expect(findValue({ a: { runs: [{ text: 'x' }] } }, { runs: [{ text: 'x' }] })).toEqual(['a'])
    expect(findValue({ a: '' }, '')).toEqual([])
  })
})
