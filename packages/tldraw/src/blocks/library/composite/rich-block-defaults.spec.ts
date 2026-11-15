/**
 * spro sprint 2026-11c (c0 baseline): a text-rich block never prints its catalog sample under an
 * authored spec. A board deck's NRR stat without a `source` showed "Study of 1,200 first-year
 * students" — the block's demo default, a fact nobody gave.
 */
import { BUILT_IN_BLOCKS } from '../index'
import { richBuilder } from './_rich-block'
import { tlsCStatExplain } from './tls-c-stat-explain/index'
import { makeCtx, collectParts } from '../layout/test-helpers'
import { registry } from './composite-test'

const rich = BUILT_IN_BLOCKS.filter((d) => { try { return !!richBuilder(d) } catch { return false } })
const strings = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out))
  return out
}

describe('text-rich blocks keep empty content empty', () => {
  it('finds the rich blocks', () => expect(rich.length).toBeGreaterThan(10))

  it.each(rich.map((d) => [d.type, d] as const))('%s: an empty spec prints no sample text', (_t, def) => {
    const samples = new Set(
      Object.entries(def.defaults as Record<string, unknown>)
        .filter(([k]) => def.schema[k]?.role === 'content')
        .flatMap(([, v]) => strings(v))
        // a sample phrase; a one-word heading ("Definition", "Summary") is the block's own label for an untitled part
        .filter((s) => s.trim().split(/\s+/).length >= 3),
    )
    const printed = strings(richBuilder(def)({})).filter((s) => samples.has(s))
    expect(printed).toEqual([])
  })

  it('stat-explain without a source draws no source line, and keeps its variant default', () => {
    const ctx = makeCtx({ width: 1600, height: 640 }, registry())
    const props = { value: '118%', label: 'Net revenue retention', text: 'Every dollar renewed and grew by 18 cents.' }
    const parts = collectParts(tlsCStatExplain.layout(props as never, ctx))
    expect(parts).not.toContain('item[0].source')
    expect(JSON.stringify(richBuilder(tlsCStatExplain)(props))).not.toContain('first-year')
    const withSource = collectParts(tlsCStatExplain.layout({ ...props, source: "Board pack, Q3" } as never, ctx))
    expect(withSource).toContain('item[0].source')
  })
})
