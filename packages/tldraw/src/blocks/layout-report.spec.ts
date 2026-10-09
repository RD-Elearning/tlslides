/**
 * LO1 — `analyzeSlide` / `formatLayoutReport` (`reviews/blocks/layout-oracle/README.md` §LO1).
 */
import * as fs from 'fs'
import * as path from 'path'
import type { ComponentShape } from '~types'
import type { BlockSpec, DeckSpec, LayoutNode, SlideSpec } from './types'
import { BlockRegistry } from './registry'
import { BUILT_IN_BLOCKS } from './library'
import { deckSpecToDocument } from './deck-document'
import { definitionLayer } from './block-layer'
import { defaultBlockRegistry } from './validate-deck-spec'
import {
  analyzeDeck,
  analyzeSlide,
  classifyOverlap,
  formatLayoutReport,
  layoutMap,
  type OverlapParty,
} from './layout-report'

const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__')
const FIXTURE_FILES = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json'))

function loadDeck(file: string): DeckSpec {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf-8'))
}

function title(id: string, text: string): BlockSpec {
  return { id, type: 'tls.t.title', props: { text } }
}

const LONG_BODY =
  'Design systems scale because every decision is made once and reused everywhere. ' +
  'This keeps teams aligned while reducing drift between products, platforms and releases. ' +
  'It also means a single change to a token reaches every slide at once, which is exactly ' +
  'why the token layer has to be small, named by role and never by hex value. '

describe('LO1 — every fixture deck produces a report', () => {
  for (const file of FIXTURE_FILES) {
    it(file, () => {
      const deck = loadDeck(file)
      const reports = analyzeDeck(deck)
      expect(reports).toHaveLength(deck.slides.length)
      const { document } = deckSpecToDocument(deck)
      for (const report of reports) {
        // One block report per compiled shape, boxes identical to the editor's.
        const shapes = Object.values(document.pages[report.slideId].shapes).filter(
          (s): s is ComponentShape => s.type === 'component'
        )
        expect(report.blocks).toHaveLength(shapes.length)
        for (const b of report.blocks) {
          const shape = shapes.find((s) => s.childIndex === b.z)!
          expect([b.id, b.box.x, b.box.y, b.box.width, b.box.height]).toEqual([
            b.id,
            shape.point[0],
            shape.point[1],
            shape.size[0],
            shape.size[1],
          ])
          expect(Number.isFinite(b.natural.height)).toBe(true)
          // LO2: no fixture sets an instance `layer`, so every block is on its definition's layer.
          expect(b.layer).toBe(definitionLayer(defaultBlockRegistry().get(b.type)))
        }
        const text = formatLayoutReport(report)
        expect(text).toBe(formatLayoutReport(report)) // deterministic
        expect(text.startsWith(`SLIDE ${report.slideId} `)).toBe(true)
        const map = layoutMap(report)
        expect(map).toHaveLength(27)
        expect(map.every((row) => row.length === 48)).toBe(true)
        for (const f of report.findings) expect(f.message.length).toBeGreaterThan(0)
      }
    })
  }
})

describe('LO1 — findings', () => {
  it('two overlapping titles → layout/overlap and text/collision', () => {
    const slide: SlideSpec = {
      id: 's_overlap',
      layout: 'blank',
      regions: {},
      free: [
        { block: title('t1', 'Revenue grew 42%'), box: { x: 96, y: 96, width: 1200, height: 140 } },
        { block: title('t2', 'Costs fell 12%'), box: { x: 160, y: 120, width: 1200, height: 140 } },
      ],
    }
    const report = analyzeSlide(slide)
    const codes = report.findings.map((f) => `${f.severity}:${f.code}`)
    expect(codes).toContain('error:layout/overlap')
    expect(codes).toContain('error:text/collision')
    const overlap = report.findings.find((f) => f.code === 'layout/overlap')!
    expect(overlap.blockIds).toEqual(['t1', 't2'])
    expect(overlap.fix).toMatch(/move t2 (down|sideways) \d+ units/)
    expect(formatLayoutReport(report)).toContain('#')
  })

  it('a too-long body in a short box → text/overflow with a numeric fix', () => {
    const slide: SlideSpec = {
      id: 's_long',
      layout: 'blank',
      regions: {},
      free: [{ block: { id: 'body', type: 'tls.t.body', props: { text: LONG_BODY + LONG_BODY } }, box: { x: 96, y: 600, width: 900, height: 160 } }],
    }
    const report = analyzeSlide(slide)
    const b = report.blocks[0]
    expect(b.contentOverflow.dy).toBeGreaterThan(0)
    expect(b.natural.height).toBeGreaterThan(b.box.height)
    const f = report.findings.find((x) => x.code === 'text/overflow')!
    expect(f).toBeDefined()
    expect(f.severity).toBe('error')
    expect(f.message).toMatch(/needs \+\d+ units/)
    expect(f.fix).toMatch(/cut `[^`]+` to ≤ \d+ lines? \(~\d+ chars\/line, ≤ \d+ chars; now \d+ lines, \d+ chars\)/)
    // Spilled content shows in the map.
    expect(layoutMap(report).join('')).toContain('!')
  })

  it('a region overfilled by a stack of blocks that each fit → region/overflow with a cut', () => {
    const body = (id: string): BlockSpec => ({ id, type: 'tls.t.body', props: { text: LONG_BODY } })
    const slide: SlideSpec = {
      id: 's_stack',
      layout: 'two-column',
      regions: { title: [title('t', 'Why tokens')], right: [body('b1'), body('b2'), body('b3'), body('b4')] },
    }
    const report = analyzeSlide(slide)
    const f = report.findings.find((x) => x.code === 'region/overflow')!
    expect(f).toBeDefined()
    expect(f.blockIds).toEqual(['b1', 'b2', 'b3', 'b4'])
    expect(f.message).toMatch(/region `right` stacks 4 blocks = \d+ units, \d+ more than its \d+ height/)
    expect(f.fix).toMatch(/cut `[^`]+` to ≤ \d+ lines?/)
    expect(f.fix).toMatch(/move b\d to region `left`/)
  })

  // LO1.5: this slide used to pin the compiler bug (an overfull `left` pushed `right` below it).
  // The re-flow is column-aware now: the overflow is still reported, the side-by-side column stays.
  it('an overfull column → region/overflow, but the side-by-side region is not displaced (LO1.5)', () => {
    const slide: SlideSpec = {
      id: 's_reflow',
      layout: 'two-column',
      regions: {
        title: [title('t', 'Why tokens')],
        left: [{ id: 'body', type: 'tls.t.body', props: { text: LONG_BODY.repeat(5) } }], // AC3: Inter body (was mono-measured)
        right: [{ id: 'cap', type: 'tls.t.caption', props: { text: 'Source: internal survey' } }],
      },
    }
    const report = analyzeSlide(slide)
    expect(report.findings.map((f) => f.code)).toContain('region/overflow')
    expect(report.findings.find((x) => x.code === 'region/displaced')).toBeUndefined()
    const cap = report.blocks.find((b) => b.id === 'cap')!
    expect(cap.box.y).toBe(report.regions.right.y)
  })

  it('fill blocks whose minimum heights cannot fit their region are still reported (LO1.5)', () => {
    // LO1.5 shares a region among fill blocks, but never below `size.min`: 4 bars × min 240 +
    // gaps exceed the 888 `blank` region, so content still ends past the frame — never silently.
    const data = { data: [{ label: 'A', value: 3 }, { label: 'B', value: 2 }] }
    const bars = ['b1', 'b2', 'b3', 'b4'].map((id) => ({ id, type: 'tls.d.bar', props: data }))
    const report = analyzeSlide({ id: 's_fill_min', layout: 'blank', regions: { content: bars } })
    const codes = report.findings.map((f) => f.code)
    expect(codes).toContain('region/overflow')
    expect(codes).toContain('slide/overflow')
    const last = report.blocks.find((b) => b.id === 'b4')!
    expect(last.box.y + last.box.height).toBeGreaterThan(report.frame.height)
  })

  it('an overfull region pushing the region below it down → region/displaced', () => {
    const slide: SlideSpec = {
      id: 's_reflow_stack',
      layout: 'quote',
      regions: {
        quote: [{ id: 'q', type: 'tls.t.body', props: { text: LONG_BODY.repeat(2) } }], // AC3: Inter body (was mono-measured)
        attribution: [{ id: 'cap', type: 'tls.t.caption', props: { text: 'Source: internal survey' } }],
      },
    }
    const report = analyzeSlide(slide)
    expect(report.findings.map((f) => f.code)).toContain('region/overflow')
    const f = report.findings.find((x) => x.code === 'region/displaced')!
    expect(f).toBeDefined()
    expect(f.blockIds).toEqual(['cap'])
    expect(f.fix).toMatch(/fix the overflow of region `quote`/)
  })

  it('a block past the frame edge → slide/overflow', () => {
    const slide: SlideSpec = {
      id: 's_edge',
      layout: 'blank',
      regions: {},
      free: [{ block: title('t', 'Edge of the frame'), box: { x: 1700, y: 96, width: 400, height: 120 } }],
    }
    const report = analyzeSlide(slide)
    const f = report.findings.find((x) => x.code === 'slide/overflow')!
    expect(f.message).toMatch(/180 past right/)
    expect(report.margins.right).toBeLessThan(0)
  })

  it('a clean region slide has no errors and fits the 2.5k budget', () => {
    const deck = loadDeck('demo-deck.json')
    const [report] = analyzeDeck({ ...deck, slides: deck.slides.filter((s) => s.id === 'sl_03') })
    expect(report.blocks).toHaveLength(5)
    expect(report.findings.filter((f) => f.severity === 'error')).toEqual([])
    expect(formatLayoutReport(report).length).toBeLessThanOrEqual(2500)
  })

  it('reports capacity() results for blocks that define it', () => {
    const deck = loadDeck('block-library-tour.json')
    const reports = analyzeDeck(deck)
    const withCapacity = reports.flatMap((r) => r.blocks).filter((b) => b.capacity)
    expect(withCapacity.length).toBeGreaterThan(0)
    for (const b of withCapacity) expect(typeof b.capacity!.fits).toBe('boolean')
  })

  it('html blocks are trusted when their template paints the poster (LO7), flagged otherwise', () => {
    const deck = loadDeck('demo-deck.json')
    const slide = { ...deck, slides: deck.slides.filter((s) => s.id === 'sl_01') }
    const [report] = analyzeDeck(slide)
    expect(report.blocks[0].type).toBe('tls.c.hero')
    expect(report.blocks[0].confidence).toBe('high')
    expect(report.needsVisualCheck).toEqual([])

    // The same hero with a host that does not declare posterGeometry: the poster is only an
    // approximation of the live DOM, so the block needs a screenshot.
    const hero = defaultBlockRegistry().get('tls.c.hero')!
    const approx = new BlockRegistry()
    for (const d of BUILT_IN_BLOCKS) {
      approx.register(
        d.type !== 'tls.c.hero'
          ? d
          : { ...hero, layout: (p, c) => ({ ...(hero.layout(p, c) as Extract<LayoutNode, { k: 'host' }>), posterGeometry: undefined }) }
      )
    }
    const [flagged] = analyzeDeck(slide, { registry: approx })
    expect(flagged.blocks[0].confidence).toBe('medium')
    expect(flagged.needsVisualCheck.map((c) => c.blockId)).toEqual([flagged.blocks[0].id])
    expect(flagged.needsVisualCheck[0].reason).toMatch(/confidence medium: .*poster/)
  })
})

describe('LO1 — layer policy (LO2 plugs blockLayer() into this)', () => {
  const box = { x: 0, y: 0, width: 100, height: 100 }
  const p = (id: string, layer: OverlapParty['layer'], z: number, text = [box]): OverlapParty => ({ id, layer, z, text })

  it.each([
    ['content', 'content', true, 'layout/overlap', 'error'],
    ['content', 'content', false, 'layout/overlap', 'warning'],
    ['backdrop', 'content', true, 'layout/overlap', 'info'],
    ['overlay', 'content', true, 'text/occluded', 'error'],
    ['overlay', 'overlay', true, 'layout/overlap', 'warning'],
  ] as const)('%s (z1) under %s (z2), painted meet=%s → %s %s', (la, lb, meet, code, severity) => {
    // `a` paints first (z1), `b` on top (z2); for the overlay row the overlay is on top.
    const a = la === 'overlay' && lb === 'content' ? p('a', la, 2) : p('a', la, 1)
    const b = la === 'overlay' && lb === 'content' ? p('b', lb, 1) : p('b', lb, 2)
    const cls = classifyOverlap(a, b, box, meet)
    expect([cls.code, cls.severity]).toEqual([code, severity])
  })

  it('a backdrop painted on top of content is an error', () => {
    expect(classifyOverlap(p('d', 'backdrop', 5), p('c', 'content', 1), box, true).severity).toBe('error')
  })

  it('an overlay that covers no text is allowed', () => {
    const cls = classifyOverlap(p('badge', 'overlay', 2), p('card', 'content', 1, [{ x: 500, y: 500, width: 10, height: 10 }]), box, true)
    expect([cls.code, cls.severity]).toEqual(['layout/overlap', 'info'])
  })
})

describe('LO1 — committed text snapshot', () => {
  // sl_03: a clean two-column slide; sl_08: the compiler pushes a fill block off the frame.
  it.each(['sl_03', 'sl_08'])('demo-deck %s', (slideId) => {
    const deck = loadDeck('demo-deck.json')
    const [report] = analyzeDeck({ ...deck, slides: deck.slides.filter((s) => s.id === slideId) })
    expect(formatLayoutReport(report)).toMatchSnapshot()
  })
})
