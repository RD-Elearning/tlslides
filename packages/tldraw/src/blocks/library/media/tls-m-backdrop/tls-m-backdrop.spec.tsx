/**
 * tls.m.backdrop (sprint 2026-11b S13-b/c) — sixteen kinds: each renders in both renderers, stays in
 * its box, is deterministic for a seed; the declared luminance envelope matches the drawn colours;
 * busy kinds read as a photo under text; the deck set places it per role and replaces the master's
 * texture.
 */
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as fs from 'fs'
import * as path from 'path'
import { tlsMBackdrop } from './index'
import { BACKDROP_KINDS, type BackdropKind } from './schema'
import { backdropColors, backdropEnvelope, backdropBusy } from './layout'
import { standardBlockSuite, absoluteLeaves } from '../../text/standard-suite'
import { ctxNoAssets } from '../media-test'
import { renderNodeToSvg } from '../../../render-svg'
import { renderNodeToDom } from '../../../render-dom'
import { hexToRgb, mixHex, parseColorAlpha, relativeLuminance } from '../../../color-math'
import { slideBackdrop } from '../../../backdrops'
import { deckSpecToDocument } from '../../../deck-document'
import { analyzeDeck } from '../../../layout-report'
import type { DeckSpec, LayoutNode } from '../../../types'

const W = 1920
const H = 1080
const lay = (props: Record<string, unknown>) => tlsMBackdrop.layout({ ...(tlsMBackdrop.defaults as object), ...props } as never, ctxNoAssets(W, H))

standardBlockSuite(tlsMBackdrop, { noCapacity: true })

/** Every drawn colour with its alpha (fills, gradient stops, strokes); images (grain) are textures. */
function drawn(node: LayoutNode, out: Array<{ color: string; alpha: number }> = []): Array<{ color: string; alpha: number }> {
  const push = (c: string) => {
    const p = parseColorAlpha(c)
    if (p) out.push({ color: c, alpha: p.alpha })
  }
  if (node.k === 'group') node.children.forEach((c) => drawn(c, out))
  if ((node.k === 'rect' || node.k === 'path') && node.fill) {
    if (node.fill.type === 'solid') push(node.fill.color)
    else node.fill.stops.forEach((s) => push(s.color))
  }
  if ((node.k === 'rect' || node.k === 'path') && node.stroke) push(node.stroke.color)
  return out
}

describe.each(BACKDROP_KINDS.map((k) => [k]))('kind %s', (kind) => {
  test.each(['soft', 'medium'])('%s: both renderers, inside the box, deterministic', (intensity) => {
    const tree = lay({ kind, intensity, seed: 7 })
    expect(JSON.stringify(lay({ kind, intensity, seed: 7 }))).toBe(JSON.stringify(tree))
    const svg = renderNodeToSvg(tree, 'b-')
    const dom = renderToStaticMarkup(<>{renderNodeToDom(tree)}</>)
    expect(svg).toMatch(/^<svg/)
    expect(dom.length).toBeGreaterThan(0)
    const leaves = absoluteLeaves(tree)
    if (kind !== 'flat') expect(leaves.length).toBeGreaterThan(0)
    for (const l of leaves) {
      expect(l.x).toBeGreaterThanOrEqual(-0.5)
      expect(l.y).toBeGreaterThanOrEqual(-0.5)
      expect(l.x + l.width).toBeLessThanOrEqual(W + 0.5)
      expect(l.y + l.height).toBeLessThanOrEqual(H + 0.5)
    }
  })

  test('the envelope matches the drawn colours within 0.05', () => {
    const ctx = ctxNoAssets(W, H)
    const colors = backdropColors(ctx)
    const env = backdropEnvelope(kind as BackdropKind, 'medium', 'calm', colors)
    const g = colors.ground
    const lums = [relativeLuminance(hexToRgb(g))]
    for (const d of drawn(lay({ kind, intensity: 'medium' }))) {
      const p = parseColorAlpha(d.color)!
      lums.push(relativeLuminance(hexToRgb(mixHex(g, p.hex, p.alpha))))
    }
    expect(Math.abs(Math.min(...lums) - env.min)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(Math.max(...lums) - env.max)).toBeLessThanOrEqual(0.05)
  })
})

test('quiet is plainer than calm', () => {
  const colors = backdropColors(ctxNoAssets(W, H))
  for (const k of BACKDROP_KINDS) {
    const calm = backdropEnvelope(k, 'medium', 'calm', colors)
    const quiet = backdropEnvelope(k, 'medium', 'quiet', colors)
    expect(quiet.max - quiet.min).toBeLessThanOrEqual(calm.max - calm.min + 1e-9)
  }
})

test('topo seeds differ', () => {
  expect(JSON.stringify(lay({ kind: 'topo', seed: 1 }))).not.toBe(JSON.stringify(lay({ kind: 'topo', seed: 2 })))
})

test('busy kinds', () => {
  expect(backdropBusy('halftone', 'soft')).toBe(true)
  expect(backdropBusy('topo', 'medium')).toBe(true)
  expect(backdropBusy('topo', 'soft')).toBe(false)
  expect(backdropBusy('mesh', 'medium')).toBe(false)
})

test('a slide picks the backdrop of its role; its own fields win', () => {
  const deck = { backdrops: { deep: { kind: 'aurora' }, accent: { kind: 'split', intensity: 'medium' as const }, calm: { kind: 'paper' }, quiet: { kind: 'flat' } } }
  expect(slideBackdrop(deck, { id: 'a', tone: 'deep' })?.kind).toBe('aurora')
  expect(slideBackdrop(deck, { id: 'a', tone: 'accent' })).toMatchObject({ kind: 'split', intensity: 'medium', tone: 'accent' })
  expect(slideBackdrop(deck, { id: 'a' })?.kind).toBe('paper')
  expect(slideBackdrop(deck, { id: 'a', backdrop: { tone: 'quiet' } })?.kind).toBe('flat')
  expect(slideBackdrop(deck, { id: 'a', backdrop: { kind: 'waves' } })?.kind).toBe('waves')
  expect(slideBackdrop({}, { id: 'a' })).toBeUndefined()
  expect(slideBackdrop(deck, { id: 'a' })?.seed).toBe(slideBackdrop(deck, { id: 'a' })?.seed)
})

const deckOf = (style: string): DeckSpec => JSON.parse(fs.readFileSync(path.join(__dirname, '../../../__fixtures__/styles', `${style}.json`), 'utf8'))

test('the deck set draws under every page and replaces the master texture; round trip drops the block', () => {
  const deck: DeckSpec = { ...deckOf('gradient'), backdrops: { calm: { kind: 'blueprint' }, deep: { kind: 'aurora' } } }
  const { document } = deckSpecToDocument(deck)
  for (const s of deck.slides) {
    const shapes = Object.values(document.pages[s.id].shapes)
    const bd = shapes.find((sh) => sh.id === `style:backdrop:${s.id}`)
    expect(bd).toBeTruthy()
    expect(shapes.every((sh) => sh === bd || (sh.childIndex ?? 1) > (bd!.childIndex ?? 0))).toBe(true)
    // gradient's master mesh/grain are tls.m.pattern: gone
    expect(shapes.some((sh) => (sh as { componentId?: string }).componentId === 'tls.m.pattern')).toBe(false)
  }
  expect(document.backdrops).toEqual(deck.backdrops)
})

test('text straight on a busy backdrop is reported like text on a photo', () => {
  const deck = deckOf('corporate')
  const quiet = analyzeDeck(deck)
  const busy = analyzeDeck({ ...deck, backdrops: { calm: { kind: 'halftone' } } })
  const photo = (r: ReturnType<typeof analyzeDeck>[number]) => (r.findings ?? []).filter((f) => /photo/.test(String((f as { message?: string }).message ?? ''))).length
  const before = quiet.reduce((n, r) => n + photo(r), 0)
  const after = busy.reduce((n, r) => n + photo(r), 0)
  expect(after).toBeGreaterThan(before)
})
