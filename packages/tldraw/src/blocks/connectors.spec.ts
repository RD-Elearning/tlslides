/**
 * CMP3 — slide connectors: route geometry, compilation after layout (nested endpoints, motion
 * after the later endpoint), the round trip, the validator, the oracle findings on the fixture,
 * the dashed draw-on pattern, and DOM/SVG parity of the connector block.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { ComponentShape } from '~types'
import type { BlockSpec, DeckSpec, SlideSpec } from './types'
import { analyzeDeck } from './layout-report'
import { connectorRoute, CONNECTOR_WEIGHT, MIN_CONNECTOR_LENGTH, polylineHitsBox, resolveSides } from './layout/connector-route'
import { connectorFromBlock, connectorMotion, CONNECTOR_BLOCK_TYPE, isRoundBlock } from './connectors'
import { compileSlide } from './slide-compiler'
import { deckSpecToDocument } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'
import { validateDeckSpec, defaultBlockRegistry } from './validate-deck-spec'
import { resolveTokens } from './tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { BLOCK_PROP_KEY } from './shape-bridge'
import { dashedDraw } from './motion/play-reveal'
import { tlsGConnector } from './library/diagram/tls-g-connector'
import { CONNECTORS_LINE, capabilityDigest } from './capability-digest'

const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__/composition/connectors.json'), 'utf8')) as DeckSpec
const tokens = resolveTokens(DEFAULT_DECK_THEME)
const reg = defaultBlockRegistry()
const FRAME = { width: 1920, height: 1080 }

const shape = (id: string, label = id): BlockSpec => ({ id, type: 'tls.m.shape', props: { label, size: 'sm' } })
const rowSlide = (connectors: unknown[], extra: Partial<SlideSpec> = {}): SlideSpec =>
  ({
    id: 's',
    layout: 'blank',
    regions: { content: [{ id: 'r', type: 'tls.l.row', props: { gap: '3xl', children: [shape('a'), shape('b'), shape('c')] } }] },
    connectors: connectors as SlideSpec['connectors'],
    ...extra,
  }) as SlideSpec
const connectorShapes = (shapes: ComponentShape[]) => shapes.filter((s) => (s as any).componentId === CONNECTOR_BLOCK_TYPE)

describe('CMP3 connector route geometry', () => {
  const A = { x: 0, y: 100, width: 200, height: 100 }
  const B = { x: 500, y: 120, width: 200, height: 100 }

  it('auto sides face each other on the axis with the larger gap', () => {
    expect(resolveSides({ box: A }, { box: B })).toEqual({ from: 'right', to: 'left' })
    expect(resolveSides({ box: A }, { box: { x: 0, y: 500, width: 200, height: 100 } })).toEqual({ from: 'bottom', to: 'top' })
    expect(resolveSides({ box: A, side: 'bottom' }, { box: B })).toEqual({ from: 'bottom', to: 'top' })
  })

  it('straight between facing boxes is level, ports sit off the boxes, the head tip on the port', () => {
    const g = connectorRoute({ from: { box: A }, to: { box: B }, width: 3 })
    expect(g.ports.from.y).toBe(g.ports.to.y)
    expect(g.ports.from.x).toBeGreaterThan(200)
    expect(g.ports.to.x).toBeLessThan(500)
    expect(g.heads.end?.tip).toEqual(g.ports.to)
    expect(g.heads.start).toBeUndefined()
    // the stroke stops inside the head's notch, before the tip
    const end = Number(g.d.split('L')[1].split(' ')[0])
    expect(end).toBeLessThan(g.ports.to.x)
    expect(g.length).toBeGreaterThan(MIN_CONNECTOR_LENGTH)
  })

  it('straight between offset boxes runs on the centre line; a round end is clipped to its circle', () => {
    const C = { x: 0, y: 0, width: 200, height: 200 }
    const D = { x: 600, y: 500, width: 200, height: 200 }
    const g = connectorRoute({ from: { box: C, round: true }, to: { box: D }, width: 3 })
    const r = Math.hypot(g.ports.from.x - 100, g.ports.from.y - 100)
    expect(r).toBeGreaterThan(100)
    expect(r).toBeLessThan(100 + 20)
    const sq = connectorRoute({ from: { box: C }, to: { box: D }, width: 3 })
    expect(Math.hypot(sq.ports.from.x - 100, sq.ports.from.y - 100)).toBeGreaterThan(r)
  })

  it('elbow is orthogonal with rounded corners; curved is one cubic', () => {
    const e = connectorRoute({ from: { box: A }, to: { box: { x: 500, y: 400, width: 200, height: 100 } }, route: 'elbow', width: 3 })
    expect(e.d).toMatch(/Q/)
    for (let i = 1; i < e.samples.length; i++) {
      const [p, q] = [e.samples[i - 1], e.samples[i]]
      // straight runs are axis-aligned; only the corner arcs are diagonal (short)
      if (Math.hypot(q.x - p.x, q.y - p.y) > 12) expect(Math.min(Math.abs(q.x - p.x), Math.abs(q.y - p.y))).toBeLessThan(0.5)
    }
    const c = connectorRoute({ from: { box: A }, to: { box: { x: 500, y: 400, width: 200, height: 100 } }, route: 'curved', width: 3 })
    expect(c.d).toMatch(/^M[^C]+C[^C]+$/)
  })

  it('heads: both / none', () => {
    expect(connectorRoute({ from: { box: A }, to: { box: B }, head: 'both', width: 3 }).heads.start).toBeDefined()
    expect(connectorRoute({ from: { box: A }, to: { box: B }, head: 'none', width: 3 }).heads.end).toBeUndefined()
  })

  it('overlapping boxes are flagged; polylineHitsBox finds a crossing', () => {
    expect(connectorRoute({ from: { box: A }, to: { box: { x: 100, y: 120, width: 200, height: 100 } }, width: 3 }).overlap).toBe(true)
    expect(polylineHitsBox([{ x: 0, y: 0 }, { x: 100, y: 0 }], { x: 40, y: -5, width: 10, height: 10 })).toBe(true)
    expect(polylineHitsBox([{ x: 0, y: 0 }, { x: 100, y: 0 }], { x: 40, y: 10, width: 10, height: 10 })).toBe(false)
  })
})

describe('CMP3 compileSlide connectors', () => {
  it('appends one overlay connector shape per connector, after every block, nested endpoints resolved', () => {
    const r = compileSlide(rowSlide([{ id: 'k1', from: { block: 'a' }, to: { block: 'b' } }, { id: 'k2', from: { block: 'b' }, to: { block: 'c' }, route: 'elbow' }]), FRAME, tokens, reg)
    const cs = connectorShapes(r.shapes)
    expect(cs).toHaveLength(2)
    expect(r.shapes.slice(-2)).toEqual(cs)
    const maxBlock = Math.max(...r.shapes.filter((s) => !cs.includes(s)).map((s) => s.childIndex))
    expect(cs.every((s) => s.childIndex > maxBlock)).toBe(true)
    const p = cs[0].props as any
    expect(p.from).toEqual({ block: 'a' })
    expect(p.fromRound).toBe(true)
    // the connector's box contains both endpoint gaps; the endpoint boxes are in its coordinates
    expect(p.fromBox.x + p.fromBox.width).toBeLessThan(p.toBox.x)
    expect(r.findings).toEqual([])
  })

  it('an unknown endpoint is a connector/unresolved error and draws nothing', () => {
    const r = compileSlide(rowSlide([{ id: 'k1', from: { block: 'a' }, to: { block: 'nope' } }]), FRAME, tokens, reg)
    expect(connectorShapes(r.shapes)).toHaveLength(0)
    expect(r.findings.map((f) => f.rule)).toEqual(['connector/unresolved'])
  })

  it('a slide with no connectors compiles exactly as before', () => {
    const a = compileSlide(rowSlide([]), FRAME, tokens, reg)
    const { connectors: _c, ...noKey } = rowSlide([])
    const b = compileSlide(noKey as SlideSpec, FRAME, tokens, reg)
    const strip = (x: typeof a) => x.shapes.map((s) => ({ ...s, id: '' }))
    expect(strip(a)).toEqual(strip(b))
  })

  it('motion: the connector draws after the later endpoint (expressive), fades under subtle, nothing under static', () => {
    const ex = compileSlide(rowSlide([{ id: 'k1', from: { block: 'a' }, to: { block: 'b' } }], { motionStyle: 'expressive' }), FRAME, tokens, reg)
    const row = ex.shapes.find((s) => (s.props[BLOCK_PROP_KEY] as any).id === 'r')!
    const k = connectorShapes(ex.shapes)[0]
    expect(k.animation!.order).toBe(row.animation!.order + 0.5)
    expect(k.animation!.delayMs).toBe(row.animation!.delayMs + row.animation!.durationMs)
    expect((k.props[BLOCK_PROP_KEY] as any).styleMotion.preset).toBe('draw-path')
    const sub = compileSlide(rowSlide([{ id: 'k1', from: { block: 'a' }, to: { block: 'b' } }], { motionStyle: 'subtle' }), FRAME, tokens, reg)
    expect((connectorShapes(sub.shapes)[0].props[BLOCK_PROP_KEY] as any).styleMotion.preset).toBe('fade')
    const st = compileSlide(rowSlide([{ id: 'k1', from: { block: 'a' }, to: { block: 'b' } }], { motionStyle: 'static' }), FRAME, tokens, reg)
    expect(connectorShapes(st.shapes)[0].animation).toBeUndefined()
    expect(connectorMotion([undefined, undefined], 'expressive')).toBeUndefined()
  })

  it('round ends: circle shapes, discs and circle markers', () => {
    expect(isRoundBlock(shape('x'))).toBe(true)
    expect(isRoundBlock({ id: 'x', type: 'tls.m.shape', props: { shape: 'hexagon' } })).toBe(false)
    expect(isRoundBlock({ id: 'x', type: 'tls.m.icon', props: { iconStyle: 'disc' } })).toBe(true)
    expect(isRoundBlock({ id: 'x', type: 'tls.t.marker', props: { variant: 'numeral' } })).toBe(false)
  })
})

describe('CMP3 connectors round trip and validator', () => {
  it('deckSpecToDocument → documentToDeckSpec returns the authored connectors (only authored keys)', () => {
    const { document } = deckSpecToDocument(FIXTURE)
    const back = documentToDeckSpec(document)
    const byId = new Map(back.spec.slides.map((s) => [s.id, s]))
    for (const s of FIXTURE.slides) {
      const drawn = (s.connectors ?? []).filter((c) => c.id !== 'bad2') // bad2 is unresolved: not drawn
      expect(byId.get(s.id)!.connectors ?? []).toEqual(drawn)
      // no connector leaks into a region or free[]
      const types = JSON.stringify(byId.get(s.id)!.regions) + JSON.stringify(byId.get(s.id)!.free ?? [])
      expect(types).not.toContain(CONNECTOR_BLOCK_TYPE)
    }
    expect(connectorFromBlock({ id: 'x', type: CONNECTOR_BLOCK_TYPE, props: { from: { block: 'a' } } })).toBeUndefined()
  })

  it('the fixture validates except the deliberately unresolved connector', () => {
    const errs = validateDeckSpec(FIXTURE).filter((f) => f.level === 'error')
    expect(errs.map((f) => [f.rule, f.path])).toEqual([['connector/unresolved', 'slides[6].connectors[1].to.block']])
  })

  it('rules: malformed, duplicate id, unresolved (with a suggestion), same block, enums, label length, authored connector block', () => {
    const deck = (connectors: unknown, extra: BlockSpec[] = []): DeckSpec =>
      ({ version: 1, id: 'd', title: 't', theme: 'midnight', aspect: 'widescreen', slides: [{ ...rowSlide([]), regions: { content: [...rowSlide([]).regions.content, ...extra] }, connectors }] }) as DeckSpec
    const rules = (d: DeckSpec) => validateDeckSpec(d).filter((f) => f.rule.startsWith('connector/')).map((f) => `${f.level}:${f.rule}`)
    expect(rules(deck([{ id: 'k', from: { block: 'a' }, to: { block: 'b' } }]))).toEqual([])
    expect(rules(deck({}))).toEqual(['error:connector/malformed'])
    expect(rules(deck([{ id: 'a', from: { block: 'a' }, to: { block: 'b' } }]))).toEqual(['error:connector/duplicate-id'])
    const unresolved = validateDeckSpec(deck([{ id: 'k', from: { block: 'a' }, to: { block: 'bb' } }])).find((f) => f.rule === 'connector/unresolved')
    expect(unresolved?.suggestion).toBe('b')
    expect(rules(deck([{ id: 'k', from: { block: 'a' }, to: { block: 'a' } }]))).toEqual(['error:connector/unresolved'])
    expect(rules(deck([{ id: 'k', from: { block: 'a' }, to: { block: 'b', side: 'up' }, route: 'zigzag', dash: 'yes' }]))).toEqual([
      'error:connector/malformed',
      'error:connector/malformed',
      'error:connector/malformed',
    ])
    expect(rules(deck([{ id: 'k', from: { block: 'a' }, to: { block: 'b' }, label: 'x'.repeat(30), extra: 1 }]))).toEqual([
      'warning:connector/malformed',
      'warning:connector/malformed',
    ])
    expect(rules(deck([], [{ id: 'kk', type: CONNECTOR_BLOCK_TYPE, props: {} }]))).toEqual(['warning:connector/malformed'])
  })
})

describe('CMP3 connectors in the layout report (fixture)', () => {
  const reports = analyzeDeck(FIXTURE)
  const of = (id: string) => reports.find((r) => r.slideId === id)!
  const codes = (id: string) => of(id).findings.filter((f) => f.code.startsWith('connector/')).map((f) => `${f.code} ${f.blockIds[0]}`)

  it('the good slides have no connector findings and report every connector', () => {
    for (const s of FIXTURE.slides.filter((x) => x.id !== 'cn_bad')) {
      expect(codes(s.id)).toEqual([])
      expect((of(s.id).connectors ?? []).map((c) => c.id)).toEqual((s.connectors ?? []).map((c) => c.id))
    }
  })

  it('the bad slide: unresolved, crosses text, endpoints overlap, too short', () => {
    expect(codes('cn_bad').sort()).toEqual(['connector/crosses-text bad1', 'connector/too-short bad3', 'connector/too-short bad4', 'connector/unresolved bad2'])
    const cross = of('cn_bad').findings.find((f) => f.code === 'connector/crosses-text')!
    expect(cross.blockIds).toEqual(['bad1', 'z2'])
    expect(cross.fix).toMatch(/elbow/)
  })

  it('a connector between nested blocks of one container does not count its own endpoints\' text', () => {
    expect(codes('cn_straight')).toEqual([])
    expect(of('cn_straight').connectors![0]).toMatchObject({ from: 'c1', to: 'c2', route: 'straight' })
  })
})

describe('CMP3 dashed draw-on and the connector block', () => {
  it('dashedDraw grows the pattern up to the drawn length, then one long gap; 1 = the pattern', () => {
    expect(dashedDraw([12, 6], 100, 1)).toBe('12 6')
    expect(dashedDraw([12, 6], 100, 0)).toBe('0 101')
    // 30 drawn: dash 12, gap 6, dash 12 (=30), then the rest
    expect(dashedDraw([12, 6], 100, 0.3)).toBe('12 6 12 101')
    expect(dashedDraw([12, 6], 100, 0.2)).toBe('12 6 2 101')
  })

  it('the block draws a stroked line, heads and a label pill; dash → Stroke.dash [4w, 2w]', () => {
    const ctx = require('./library/layout/test-helpers').makeCtx({ width: 420, height: 160 })
    const t = tlsGConnector.layout({ ...(tlsGConnector.defaults as any), dash: true, label: 'then', head: 'both' }, ctx) as any
    const parts = t.children.map((c: any) => c.part)
    expect(parts).toEqual(['line', 'head-start', 'head', 'label'])
    expect(t.children[0].stroke.dash).toEqual([4 * CONNECTOR_WEIGHT.md, 2 * CONNECTOR_WEIGHT.md])
    expect(tlsGConnector.motion.preset).toBe('draw-path')
    expect(tlsGConnector.layout({} as any, ctx)).toMatchObject({ k: 'group', children: [] })
  })

  it('the full digest teaches connectors; the tier-1 index does not list the compiled block', () => {
    expect(capabilityDigest(reg)).toContain(CONNECTORS_LINE)
  })

  it('DOM and SVG agree on a connector (parity probe)', async () => {
    const { assertParity } = await import('./parity-harness')
    await assertParity(tlsGConnector, { ...(tlsGConnector.defaults as any), label: 'then' }, { width: 420, height: 160 })
    await assertParity(tlsGConnector, { ...(tlsGConnector.defaults as any), route: 'elbow', dash: true, toBox: { x: 360, y: 100, width: 60, height: 50 } }, { width: 420, height: 160 })
  }, 60000)
})
