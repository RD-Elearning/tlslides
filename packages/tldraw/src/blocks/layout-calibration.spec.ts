/**
 * LO5 / LO5b — browser calibration of the layout oracle, `needsVisualCheck`, composition hints
 * (`reviews/blocks/layout-oracle/README.md` §LO5). The Chromium numbers pinned here were measured
 * against the Inter woff2 the Next.js sample serves (canvas `measureText` == DOM span width).
 */
import * as fs from 'fs'
import * as path from 'path'
import type { BlockSpec, DeckSpec, SlideSpec } from './types'
import { analyzeDeck, analyzeSlide, formatLayoutReport } from './layout-report'
import { tableMetrics } from './layout/measure'
import { INTER_BOLD_FACTOR, interCharEm } from './layout/inter-metrics'
import { pathBounds } from './layout/measure-block'

const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__')
const FIXTURE_FILES = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json'))
const loadDeck = (file: string): DeckSpec => JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf-8'))

const style = (letterSpacing = 0, size = 100) => ({ family: '"Inter"', size, lineHeight: 1.2, letterSpacing, color: '#000' })

describe('LO5 — tableMetrics matches Chromium', () => {
  const tm = tableMetrics()

  it('uses the browser-measured Inter advances (Chromium: "Hello World" = 551 at 100px)', () => {
    expect(Math.abs(tm('Hello World', style()).width - 551)).toBeLessThanOrEqual(3)
    // Digits and "%" were 17-35% narrow in the old table.
    expect(Math.abs(tm('72%', style()).width - 216)).toBeLessThanOrEqual(2)
  })

  it('adds CSS letter-spacing after every character', () => {
    const plain = tm('Hello World', style()).width
    expect(tm('Hello World', style(-0.03)).width).toBe(Math.round(plain - 0.03 * 100 * 11))
    expect(tm('WEAKNESSES', style(0.08, 22)).width).toBeGreaterThan(tm('WEAKNESSES', style(0, 22)).width + 16)
  })

  it('widens bold runs and scales sized runs', () => {
    const plain = tm('Revenue', style()).width
    const bold = tm({ runs: [{ text: 'Revenue', bold: true }] }, style()).width
    expect(Math.abs(bold - plain * INTER_BOLD_FACTOR)).toBeLessThanOrEqual(1)
    const half = tm({ runs: [{ text: 'Revenue', size: 0.5 }] }, style()).width
    expect(Math.abs(half - plain / 2)).toBeLessThanOrEqual(1)
  })

  it('wraps on the same widths it reports, and keeps the run slices', () => {
    const m = tm({ runs: [{ text: 'Bold start ', bold: true }, { text: 'then a regular tail that wraps' }] }, style(-0.03, 40), 400)
    expect(m.lines.length).toBeGreaterThan(1)
    for (const line of m.lines) expect(line.width).toBeLessThanOrEqual(400 + 40)
    expect(m.lines.map((l) => l.text).join('')).toBe('Bold start then a regular tail that wraps')
    expect(m.lines[0].runs?.[0]).toMatchObject({ bold: true })
  })

  it('measures accented Latin as its base letter (Vietnamese)', () => {
    expect(interCharEm('ế')).toBe(interCharEm('e'))
    expect(interCharEm('Ố')).toBe(interCharEm('O'))
    expect(interCharEm('đ')).toBeCloseTo(0.612, 3)
  })
})

describe('LO5 — pathBounds bounds Béziers exactly', () => {
  it('cubic: the extremum, not the control points', () => {
    expect(pathBounds('M 0 100 C 0 0 100 0 100 100')).toEqual({ x: 0, y: 25, width: 100, height: 75 })
  })
  it('quadratic and smooth segments', () => {
    expect(pathBounds('M 0 100 Q 50 0 100 100')).toEqual({ x: 0, y: 50, width: 100, height: 50 })
    expect(pathBounds('M 0 0 C 0 50 50 50 50 0 S 100 -50 100 0')).toEqual({ x: 0, y: -37.5, width: 100, height: 75 })
    expect(pathBounds('M 0 0 Q 50 100 100 0 T 200 0')).toEqual({ x: 0, y: -50, width: 200, height: 100 })
  })
  it('lines and arcs unchanged', () => {
    expect(pathBounds('m10 10 h 30 v 20 z')).toEqual({ x: 10, y: 10, width: 30, height: 20 })
  })
})

describe('LO5 — needsVisualCheck', () => {
  it('flags a block the editor wraps differently, with the reason', () => {
    const deck = loadDeck('motion-showcase.json')
    const [report] = analyzeDeck({ ...deck, slides: deck.slides.filter((s) => s.id === 'ms_11') })
    const body = report.needsVisualCheck.find((c) => c.blockId === 'b11_body')
    expect(body?.reason).toMatch(/editor wraps `text` to 2 lines on screen; its real width needs 1/)
    expect(formatLayoutReport(report)).toMatch(/^screenshot: .*b11_body \(the editor wraps/m)
  })

  it('flags content ending within the calibrated margin of the frame bottom', () => {
    const body: BlockSpec = { id: 'b', type: 'tls.t.body', props: { text: 'One short line' } }
    const at = (y: number): SlideSpec => ({
      id: 's',
      layout: 'blank',
      regions: {},
      free: [{ block: body, box: { x: 96, y, width: 800, height: 60 } }],
    })
    const probe = analyzeSlide(at(0)).blocks[0].painted!
    const near = analyzeSlide(at(1080 - 2 - (probe.y + probe.height)))
    expect(near.needsVisualCheck).toEqual([{ blockId: 'b', reason: expect.stringMatching(/content ends 2 units above the frame bottom/) }])
    const clear = analyzeSlide(at(1080 - 40 - (probe.y + probe.height)))
    expect(clear.needsVisualCheck).toEqual([])
    expect(formatLayoutReport(clear)).toMatch(/^screenshot: not needed$/m)
  })

  it('a minority of fixture slides need a screenshot', () => {
    const all = FIXTURE_FILES.flatMap((f) => analyzeDeck(loadDeck(f)))
    const flagged = all.filter((r) => r.needsVisualCheck.length > 0)
    // 21 / 95 at LO5 (layout-oracle §3); a ratchet, not an exact pin.
    expect(flagged.length / all.length).toBeLessThan(0.3)
  })
})

describe('LO5b — composition hints', () => {
  it('colorful sl_04: empty title region and an unbalanced kpi row, with numbers', () => {
    const deck = loadDeck('colorful-blocks-demo.json')
    const [report] = analyzeDeck({ ...deck, slides: deck.slides.filter((s) => s.id === 'sl_04') })
    const empty = report.findings.find((f) => f.code === 'region/empty')
    expect(empty?.message).toMatch(/region `title` .* has no block/)
    const unbalanced = report.findings.find((f) => f.code === 'layout/unbalanced')
    expect(unbalanced?.severity).toBe('info')
    expect(unbalanced?.message).toMatch(/the bottom 578 units \(54% of the frame\) are empty/)
    expect(unbalanced?.fix).toMatch(/fill ~302 more units of height .*move it down ~151/)
  })

  it('layout/crowded when almost nothing is free', () => {
    const block = (id: string): BlockSpec => ({ id, type: 'tls.m.image', props: { alt: 'full-bleed photo' } })
    const slide: SlideSpec = {
      id: 's',
      layout: 'blank',
      regions: {},
      free: [{ block: block('d'), box: { x: 0, y: 0, width: 1920, height: 1080 } }],
    }
    const crowded = analyzeSlide(slide).findings.filter((f) => f.code === 'layout/crowded')
    expect(crowded).toHaveLength(1)
    expect(crowded[0].fix).toMatch(/≥ 10% is free/)
  })

  it('does not spam: counts on the 4 fixture decks (95 slides)', () => {
    const findings = FIXTURE_FILES.flatMap((f) => analyzeDeck(loadDeck(f))).flatMap((r) => r.findings)
    const count = (code: string) => findings.filter((f) => f.code === code).length
    expect(count('layout/unbalanced')).toBeLessThanOrEqual(13)
    expect(count('region/empty')).toBeLessThanOrEqual(3)
    expect(count('layout/crowded')).toBe(0)
    for (const f of findings.filter((x) => ['layout/unbalanced', 'region/empty', 'layout/crowded'].includes(x.code))) {
      expect(f.severity).not.toBe('error')
      expect(f.fix).toMatch(/\d/)
    }
  })
})
