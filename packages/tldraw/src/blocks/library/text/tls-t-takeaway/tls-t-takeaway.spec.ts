/**
 * Tests for tls.t.takeaway — highlighted insight text.
 */

import { tlsTTakeaway } from './index'
import { makeCtx as rv02Ctx } from '../test-helpers'
import { makeCtx, makeRegistry, SIZES, assertValidNode, collectParts } from '../test-helpers'

describe('tls.t.takeaway', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsTTakeaway.layout(tlsTTakeaway.defaults, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children!.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('parts', () => {
    it('emits accent-bar, label, and text parts', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout(tlsTTakeaway.defaults, ctx)
      const parts = collectParts(node)
      expect(parts).toContain('accent-bar')
      expect(parts).toContain('label')
      expect(parts).toContain('text')
    })

    it('omits label when empty', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout(
        { ...tlsTTakeaway.defaults, label: '' },
        ctx,
      )
      const parts = collectParts(node)
      expect(parts).not.toContain('label')
      expect(parts).toContain('text')
    })
  })

  describe('accent bar', () => {
    it('is a rect node with rounded corners', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout(tlsTTakeaway.defaults, ctx)
      const bar = node.children!.find((c) => c.part === 'accent-bar')
      expect(bar).toBeDefined()
      expect(bar!.k).toBe('rect')
    })

    it('uses accent colour for the default tone', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout(
        { ...tlsTTakeaway.defaults, tone: 'accent' },
        ctx,
      )
      const bar = node.children!.find((c) => c.part === 'accent-bar')
      expect(bar).toBeDefined()
      expect(bar!.fill).toBeDefined()
    })

    it('changes colour with tone', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const accentNode = tlsTTakeaway.layout(
        { ...tlsTTakeaway.defaults, tone: 'accent' },
        ctx,
      )
      const warningNode = tlsTTakeaway.layout(
        { ...tlsTTakeaway.defaults, tone: 'warning' },
        ctx,
      )
      const accentBar = accentNode.children!.find((c) => c.part === 'accent-bar')
      const warningBar = warningNode.children!.find((c) => c.part === 'accent-bar')
      expect(accentBar!.fill).not.toEqual(warningBar!.fill)
    })
  })

  describe('text content', () => {
    it('displays the takeaway text', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout(tlsTTakeaway.defaults, ctx)
      const textNode = node.children!.find((c) => c.part === 'text')
      expect(textNode).toBeDefined()
      expect(textNode!.k).toBe('text')
      const combinedText = textNode!.lines.map((l) => l.text).join('')
      expect(combinedText).toContain('Revenue')
    })
  })

  describe('layout purity', () => {
    it('throws from no document / window / Date / Math.random', () => {
      const origDoc = globalThis.document
      const origWindow = globalThis.window
      const origDate = globalThis.Date
      const origRandom = Math.random
      try {
        delete (globalThis as Record<string, unknown>).document
        delete (globalThis as Record<string, unknown>).window
        globalThis.Date = undefined as never
        Math.random = () => { throw new Error('Math.random called') }

        const ctx = makeCtx({ width: 960, height: 540 }, registry)
        const node = tlsTTakeaway.layout(tlsTTakeaway.defaults, ctx)
        assertValidNode(node)
      } finally {
        globalThis.document = origDoc
        globalThis.window = origWindow
        globalThis.Date = origDate
        Math.random = origRandom
      }
    })
  })

  describe('all tones', () => {
    it.each(['accent', 'positive', 'warning', 'muted'] as const)('tone=%s produces valid tree', (tone) => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout({ ...tlsTTakeaway.defaults, tone }, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      const parts = collectParts(node)
      expect(parts).toContain('accent-bar')
      expect(parts).toContain('text')
    })
  })
})

describe('RV02 — honest size (review G02)', () => {
  const DEF = tlsTTakeaway
  const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
    const x = ox + n.box.x
    const y = oy + n.box.y
    if (n.k !== 'group') out.push({ x, y, w: n.box.width, h: n.box.height })
    for (const c of n.children ?? []) leaves(c, x, y, out)
    return out
  }

  it.each([
    ['preferred', DEF.size.preferred],
    ['min', DEF.size.min],
  ])('the example fits size.%s with nothing escaping it', (_label, [w, h]) => {
    const node = DEF.layout(DEF.describe!.example.props as any, rv02Ctx({ width: w, height: h }))
    expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
    for (const l of leaves(node)) {
      expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
      expect(l.y + l.h).toBeLessThanOrEqual(h + 0.5)
    }
  })

  it('the accent bar spans the content with equal insets and never leaves the surface', () => {
    for (const [w, h] of [[800, 200], [1760, 600], [400, 210]]) {
      const node: any = DEF.layout(DEF.describe!.example.props as any, rv02Ctx({ width: w, height: h }))
      const surface = node.children.find((c: any) => c.part === 'surface')
      const bar = node.children.find((c: any) => c.part === 'accent-bar')
      const top = bar.box.y - surface.box.y
      const bottom = surface.box.y + surface.box.height - (bar.box.y + bar.box.height)
      expect(top).toBeGreaterThan(0)
      expect(Math.abs(top - bottom)).toBeLessThan(1)
    }
  })

  it('avoid steers tips and warnings to tls.t.callout', () => {
    expect(DEF.describe!.avoid).toContain('tls.t.callout')
  })
})

describe('AC2 — size knob', () => {
  const DEF = tlsTTakeaway
  const textOf = (n: any): any => (n.children ?? []).find((c: any) => c.part === 'text')

  it('lists the size knob with body and lead', () => {
    expect((DEF.schema.size.type as any).values).toEqual(['body', 'lead'])
  })

  it.each([
    ['preferred', DEF.size.preferred],
    ['min', DEF.size.min],
  ])('size: lead fits size.%s (lead tier at preferred, body when the box is too short)', (label, [w, h]) => {
    const props = { ...(DEF.describe!.example.props as any), size: 'lead' }
    const lead: any = DEF.layout(props, rv02Ctx({ width: w, height: h }))
    const body: any = DEF.layout({ ...props, size: 'body' }, rv02Ctx({ width: w, height: h }))
    expect(lead.box.height).toBeLessThanOrEqual(h + 0.5)
    const t = textOf(lead)
    expect(t.box.y + t.box.height).toBeLessThanOrEqual(h + 0.5)
    expect(t.box.x + t.box.width).toBeLessThanOrEqual(w + 0.5)
    if (label === 'preferred') expect(t.style.size).toBeGreaterThan(textOf(body).style.size)
    else expect(t.style.size).toBeGreaterThanOrEqual(textOf(body).style.size)
  })

  it('size: lead picks the lead tier whenever the box has the height', () => {
    const props = { ...(DEF.describe!.example.props as any), size: 'lead' }
    const [w] = DEF.size.min
    const lead: any = DEF.layout(props, rv02Ctx({ width: w, height: 400 }))
    const body: any = DEF.layout({ ...props, size: 'body' }, rv02Ctx({ width: w, height: 400 }))
    expect(textOf(lead).style.size).toBeGreaterThan(textOf(body).style.size)
    expect(lead.box.height).toBeLessThanOrEqual(400)
  })
})
