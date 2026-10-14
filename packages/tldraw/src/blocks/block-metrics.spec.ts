/**
 * LO3 — size cards (`reviews/blocks/layout-oracle/README.md` §LO3).
 */
import * as fs from 'fs'
import * as path from 'path'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import type { SurfaceContext } from './types'
import { BUILT_IN_BLOCKS } from './library'
import { defaultBlockRegistry } from './validate-deck-spec'
import { resolveTokens } from './tokens'
import { createLayoutContext } from './layout/layout-child'
import { tableMetrics } from './layout/measure'
import { DEFAULT_PROBE_HEIGHT, measureBlock } from './layout/measure-block'
import { capabilityIndex } from './capability-digest'
import {
  blockSizeHints,
  buildBlockMetrics,
  sizeHint,
  stringifyBlockMetrics,
  stringifySizeHints,
  type BlockMetricsFile,
} from './block-metrics'

const GEN = path.join(__dirname, '__generated__')
const REGEN = 'run `node tools/layout-report/gen-block-metrics.js` from the repo root and commit the result'

const registry = defaultBlockRegistry()
const file: BlockMetricsFile = buildBlockMetrics(registry)
const SURFACE: SurfaceContext = { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false }
const tokens = resolveTokens(DEFAULT_DECK_THEME)

function measured(type: string, props: Record<string, unknown>, width: number): number {
  const def = registry.get(type)!
  const ctx = createLayoutContext({
    box: { width, height: DEFAULT_PROBE_HEIGHT },
    tokens,
    surface: SURFACE,
    registry,
    measureText: tableMetrics(),
  })
  return measureBlock(def, props, width, ctx, { height: DEFAULT_PROBE_HEIGHT }).natural.height
}

function exampleProps(type: string): Record<string, unknown> {
  const def = registry.get(type)!
  return { ...(def.defaults as Record<string, unknown>), ...(def.describe?.example?.props ?? {}) }
}

describe('LO3 size cards', () => {
  it('committed block-metrics.json and block-size-hints.ts are fresh', () => {
    const json = fs.readFileSync(path.join(GEN, 'block-metrics.json'), 'utf8')
    const hints = fs.readFileSync(path.join(GEN, 'block-size-hints.ts'), 'utf8')
    if (json !== stringifyBlockMetrics(file)) throw new Error(`__generated__/block-metrics.json is stale: ${REGEN}`)
    if (hints !== stringifySizeHints(blockSizeHints(file))) {
      throw new Error(`__generated__/block-size-hints.ts is stale: ${REGEN}`)
    }
  })

  it('has one card per built-in block, with its definition metadata', () => {
    expect(Object.keys(file.blocks).sort()).toEqual(BUILT_IN_BLOCKS.map((d) => d.type).sort())
    expect(file.widths).toEqual([1728, 840, 544])
    for (const def of BUILT_IN_BLOCKS) {
      const c = file.blocks[def.type]
      expect(c.size.preferred).toEqual(def.size.preferred)
      expect(c.size.min).toEqual(def.size.min)
      expect(c.scope).toBe(def.scope ?? 'element')
      // Every card either has a model or says why not.
      if (!c.model) expect(c.note).toBeTruthy()
      // Below the min width there is no number.
      if (c.model) {
        for (const w of file.widths) if (w < def.size.min[0]) expect(c.model.at[String(w)]).toBeNull()
      }
    }
  })

  it('a title is pure lines: base ≈ 0, per ≈ its line height', () => {
    const c = file.blocks['tls.t.title']
    expect(c.model?.var).toBe('lines')
    const f = c.model!.at['840']!
    expect(Math.abs(f.base)).toBeLessThanOrEqual(2)
    expect(f.per).toBeCloseTo(c.text.text.lineHeight, 0)
    expect(f.poor).toBeUndefined()
  })

  it('charts and images fill their box and carry no model', () => {
    for (const t of ['tls.d.bar', 'tls.d.line', 'tls.m.image']) {
      expect(file.blocks[t].fill).toBe(true)
      expect(file.blocks[t].model).toBeNull()
      expect(sizeHint(file.blocks[t])).toBe('h=fill')
    }
  })

  it('containers say so instead of inventing a number', () => {
    const c = file.blocks['tls.l.row']
    expect(c.model).toBeNull()
    expect(c.note).toMatch(/container/)
  })

  it('step-shaped blocks are marked poor and hinted as a range', () => {
    const poor = Object.entries(file.blocks).filter(([, c]) => c.model && Object.values(c.model.at).some((f) => f?.poor))
    expect(poor.length).toBeGreaterThan(0)
    const [type, card] = poor.find(([, c]) => c.model!.at['840']?.poor) ?? poor[0]
    expect(sizeHint(card)).toMatch(/^h \d+–\d+@\d+$/)
    expect(type).toBeTruthy()
  })

  it('LO8: a poor fit carries its measured samples, and they are exact', () => {
    for (const [type, card] of Object.entries(file.blocks)) {
      for (const f of Object.values(card.model?.at ?? {})) {
        if (!f) continue
        if (f.poor) {
          expect({ type, samples: (f.samples ?? []).length > 0 }).toEqual({ type, samples: true })
          expect(Math.min(...f.samples!.map((s) => s[1]))).toBe(f.h[0])
          expect(Math.max(...f.samples!.map((s) => s[1]))).toBe(f.h[1])
        } else {
          expect(f.samples).toBeUndefined()
        }
      }
    }
    // tls.g.steps at 840: 5 steps keep one row (187), 8 turn vertical (333) — no line fits that.
    const steps = file.blocks['tls.g.steps'].model!.at['840']!
    const s = new Map(steps.samples)
    const ex = exampleProps('tls.g.steps')
    const src = ex.steps as unknown[]
    for (const n of [5, 8]) {
      const h = measured('tls.g.steps', { ...ex, steps: Array.from({ length: n }, (_, k) => src[k % src.length]) }, 840)
      expect(Math.round(h)).toBe(s.get(n))
    }
    expect(s.get(8)! - s.get(5)!).toBeGreaterThan(100)
  })

  it('LO8: every measurable example fits its own size.min box (atMin.fits)', () => {
    const misfits = Object.entries(file.blocks)
      .filter(([, c]) => c.atMin && !c.atMin.fits)
      .map(([t, c]) => `${t} min ${c.size.min.join('×')} occupies ${c.atMin!.h}`)
    expect(misfits).toEqual([])
    expect(Object.values(file.blocks).filter((c) => !c.fill && c.model).every((c) => c.atMin)).toBe(true)
  })

  // The model is a planning hint: predicted from the card, checked against measureBlock on
  // content the generator never sampled.
  describe('model vs measureBlock on new content', () => {
    const S =
      'Our pilot programme cut onboarding time from eleven days to four, and support tickets in the first ' +
      'month fell by a third across every region we measured.'
    const lineCases: Array<[string, number, string, string]> = [
      ['tls.t.title', 840, 'text', 'Why the Q3 pilot changed how we onboard customers in every region'],
      ['tls.t.callout', 840, 'text', S],
      ['tls.c.testimonial', 840, 'quote', S],
    ]
    it.each(lineCases)('%s @%i (lines)', (type, w, slot, text) => {
      const card = file.blocks[type]
      const f = card.model!.at[String(w)]!
      const props = { ...exampleProps(type), [slot]: text }
      const def = registry.get(type)!
      const ctx = createLayoutContext({ box: { width: w, height: DEFAULT_PROBE_HEIGHT }, tokens, surface: SURFACE, registry, measureText: tableMetrics() })
      const m = measureBlock(def, props, w, ctx, { height: DEFAULT_PROBE_HEIGHT })
      const lines = m.text.filter((t) => t.propPath === slot || (!t.propPath && t.part === slot)).reduce((n, t) => n + t.lines, 0)
      expect(Math.abs(f.base + f.per * lines - m.natural.height)).toBeLessThanOrEqual(Math.max(f.err, 2) + 2)
      // Planner-side line estimate from the card: lines ≈ ceil(chars / (0.85 · cpl)) never under-counts here.
      const cpl = card.text[slot].cpl[file.widths.indexOf(w)]!
      expect(Math.ceil(text.length / (0.85 * cpl))).toBeGreaterThanOrEqual(lines)
    })

    const itemCases: Array<[string, number, number]> = [
      ['tls.t.bullets', 840, 5],
      ['tls.d.ranking', 840, 6],
      ['tls.c.contact', 840, 3],
    ]
    it.each(itemCases)('%s @%i with %i items', (type, w, n) => {
      const card = file.blocks[type]
      const f = card.model!.at[String(w)]!
      const ex = exampleProps(type)
      const src = ex[card.model!.slot!] as unknown[]
      // Rotated items: not the generator's order.
      const items = Array.from({ length: n }, (_, k) => src[(k + 1) % src.length])
      const h = measured(type, { ...ex, [card.model!.slot!]: items }, w)
      expect(Math.abs(f.base + f.per * n - h)).toBeLessThanOrEqual(Math.max(f.err, 2) + 2)
    })
  })

  it('the digest index carries the hints and stays under 20k chars', () => {
    const md = capabilityIndex(registry)
    expect(md.length).toBeLessThanOrEqual(20000)
    expect(md).toContain(`tls.t.title · heading · element — ${registry.get('tls.t.title')!.shortDescription} [h≈0+104/L@840]`)
    expect(md).toContain('[h=fill]')
  })
})
