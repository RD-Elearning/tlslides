import { cloneSpecWithFreshIds } from './clone-spec'
import { BUILT_IN_BLOCKS } from './library'
import type { BlockSpec } from './types'

describe('cloneSpecWithFreshIds', () => {
  it('gives the block and every nested block spec a fresh id', () => {
    const spec: BlockSpec = {
      id: 'b_row',
      type: 'tls.l.row',
      props: { children: [{ id: 'c1', type: 'tls.t.title', props: { text: 'A' } }, { id: 'c2', type: 'tls.t.title', props: { text: 'B' } }] },
      children: [{ id: 'k1', type: 'tls.t.body', props: { text: 'C' } }],
    }
    const out = cloneSpecWithFreshIds(spec)
    const ids = [out.id, ...(out.props.children as BlockSpec[]).map((c) => c.id), out.children![0].id]
    expect(ids.some((id) => ['b_row', 'c1', 'c2', 'k1'].includes(id))).toBe(false)
    expect(new Set(ids).size).toBe(ids.length)
    expect((out.props.children as BlockSpec[]).map((c) => c.props.text)).toEqual(['A', 'B'])
    expect(spec.id).toBe('b_row') // the source is never mutated
  })

  it('S20: keeps data ids inside props, so references between them still resolve', () => {
    const flow = BUILT_IN_BLOCKS.find((d) => d.type === 'tls.g.flow')!
    const example = { id: 'b_flow', type: flow.type, props: flow.describe!.example!.props } as BlockSpec
    const out = cloneSpecWithFreshIds(example)
    expect(out.id).not.toBe('b_flow')
    const nodes = out.props.nodes as { id: string }[]
    const edges = out.props.edges as { from: string; to: string }[]
    expect(nodes.map((n) => n.id)).toEqual((example.props.nodes as { id: string }[]).map((n) => n.id))
    const ids = new Set(nodes.map((n) => n.id))
    expect(edges.length).toBeGreaterThan(0)
    for (const e of edges) expect([e.from, ids.has(e.from), e.to, ids.has(e.to)]).toEqual([e.from, true, e.to, true])
  })

  it('every built-in example clones to a spec whose nested block ids are all fresh and unique', () => {
    for (const def of BUILT_IN_BLOCKS) {
      const src = { id: 'b_src', type: def.type, props: (def.describe?.example?.props ?? def.defaults) as Record<string, unknown> } as BlockSpec
      const out = cloneSpecWithFreshIds(src)
      const seen: string[] = []
      const walk = (s: BlockSpec) => {
        seen.push(s.id)
        ;(s.children ?? []).forEach(walk)
        ;((s.props?.children as BlockSpec[] | undefined) ?? []).forEach((c) => c && typeof c === 'object' && 'type' in c && walk(c))
      }
      walk(out)
      expect([def.type, new Set(seen).size === seen.length]).toEqual([def.type, true])
    }
  })
})
