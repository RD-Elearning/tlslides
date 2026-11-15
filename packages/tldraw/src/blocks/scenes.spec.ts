/**
 * spro sprint 2026-11c S26-a — frame scenes from the deck's motif icons: placed clear of the page's
 * text, degrade along the fallback chain, idempotent, kept by the round trip, drawn in both looks.
 */
import { placeScenes, freeZone, SCENE_IDS, SCENE_PREFIX, type SceneId } from './scenes'
import { placeDeckMotifs, isDeckMotif } from './motif-zone'
import { validateDeckSpec } from './validate-deck-spec'
import { analyzeDeck } from './layout-report'
import { deckSpecToDocument } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'
import { BUILT_IN_STYLES } from './styles'
import type { Box, DeckSpec, SlideSpec } from './types'

const ICONS = ['coffee', 'pizza', 'leaf', 'heart', 'star']

const cover = (id: string, scene?: SceneId, seed = 1): SlideSpec => ({
  id,
  role: 'cover',
  layout: 'title',
  ...(scene ? { scene: { id: scene, seed } } : {}),
  regions: { title: [{ id: `${id}-t`, type: 'tls.t.title', props: { text: { runs: [{ text: 'Món ngon quanh bạn' }] } } }] },
} as SlideSpec)

const deck = (style: string, slides: SlideSpec[], icons: string[] = ICONS): DeckSpec =>
  ({ version: 1, id: 'd', style, theme: BUILT_IN_STYLES.find((s) => s.id === style)!.palettes[0].id, aspect: 'widescreen', motifs: { icons }, slides }) as DeckSpec

const sceneBlocks = (s: SlideSpec) => (s.free ?? []).filter((f) => f.block.id.startsWith(SCENE_PREFIX))
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

describe('S26-a scenes', () => {
  test('a deck without scenes is returned as is', () => {
    const d = deck('corporate', [cover('s1')])
    expect(placeScenes(d)).toBe(d)
  })

  test.each(['sticker-burst', 'tile-row', 'tile-corner', 'icon-arc', 'tile-column', 'edge-strip'] as const)('%s keeps its art clear of the text', (id) => {
    const d = deck('corporate', [cover('s1', id)])
    const placed = placeScenes(d)
    const s = placed.slides[0]
    const art = sceneBlocks(s)
    expect(art.length).toBeGreaterThan(0)
    const report = analyzeDeck({ ...placed, slides: [s] })[0]
    const text = report.blocks.filter((b) => b.layer !== 'backdrop').flatMap((b) => b.text.map((t) => t.painted))
    for (const a of art) for (const t of text) expect(overlap(a.box, t)).toBe(false)
  })

  test('ghost-mark sits on a frame corner, cropped toward it; icon-field sets the ground', () => {
    const g = sceneBlocks(placeScenes(deck('corporate', [cover('s1', 'ghost-mark')])).slides[0])
    expect(g).toHaveLength(1)
    expect((g[0].block.props as { crop?: string }).crop).toMatch(/^(top|bottom)-(left|right)$/)
    const f = placeScenes(deck('corporate', [cover('s1', 'icon-field')])).slides[0]
    expect(f.backdrop?.kind).toBe('icon-field')
  })

  test('needs not met degrade: one icon turns a sticker burst into a tile, none into nothing', () => {
    const one = sceneBlocks(placeScenes(deck('corporate', [cover('s1', 'sticker-burst')], ['coffee'])).slides[0])
    expect(one.map((b) => b.block.type)).toEqual(['tls.m.icon'])
    const none = placeScenes(deck('corporate', [cover('s1', 'sticker-burst')], []))
    expect(sceneBlocks(none.slides[0])).toHaveLength(0)
  })

  test('idempotent, and the round trip keeps the scene and its blocks', () => {
    const d = deck('corporate', [cover('s1', 'tile-row')])
    const once = placeDeckMotifs(d)
    expect(placeDeckMotifs(once)).toEqual(once)
    const back = documentToDeckSpec(deckSpecToDocument(d).document).spec
    expect(back.slides[0].scene).toEqual({ id: 'tile-row', seed: 1 })
    expect(placeDeckMotifs(back).slides[0].free?.filter((f) => f.block.id.startsWith(SCENE_PREFIX)).length).toBe(sceneBlocks(once.slides[0]).length)
  })

  test('a page with a scene takes no signature motif', () => {
    const hero = (id: string, scene?: SceneId): SlideSpec =>
      ({ id, role: 'cover', layout: 'blank', ...(scene ? { scene: { id: scene } } : {}), regions: { content: [{ id: `${id}-h`, type: 'tls.c.hero', props: { title: 'Món ngon' } }] } }) as SlideSpec
    const d = { ...deck('doodle', [hero('s1', 'ghost-mark'), hero('s2')]), motifZone: 'auto' as const }
    const placed = placeDeckMotifs(d)
    expect(placed.slides[0].free?.some((f) => isDeckMotif(f.block.id)) ?? false).toBe(false)
    expect(placed.slides[1].free?.some((f) => isDeckMotif(f.block.id))).toBe(true)
  })

  test('C9: several pages with a signature motif or the same scene keep block ids unique across the deck', () => {
    const hero = (id: string, scene?: SceneId): SlideSpec =>
      ({ id, role: 'cover', layout: 'blank', ...(scene ? { scene: { id: scene } } : {}), regions: { content: [{ id: `${id}-h`, type: 'tls.c.hero', props: { title: 'Món ngon' } }] } }) as SlideSpec
    const d = { ...deck('doodle', [hero('s1'), hero('s2', 'ghost-mark'), hero('s3'), hero('s4', 'ghost-mark')]), motifZone: 'auto' as const }
    const placed = placeDeckMotifs(d)
    const ids = placed.slides.flatMap((s) => (s.free ?? []).map((f) => f.block.id))
    expect(ids.filter(isDeckMotif)).toHaveLength(2)
    expect(ids.filter((i) => i.startsWith(SCENE_PREFIX))).toHaveLength(2)
    expect(new Set(ids).size).toBe(ids.length)
    expect(validateDeckSpec(placed).filter((v) => v.rule === 'block/duplicate-id')).toEqual([])
  })

  test('every scene on a light and a dark look: no new layout errors', () => {
    for (const style of ['corporate', 'gradient']) {
      for (const id of SCENE_IDS) {
        const d = placeDeckMotifs(deck(style, [cover('s1', id, 3)]))
        const errors = analyzeDeck(d)[0].findings.filter((f) => f.severity === 'error')
        expect({ style, id, errors: errors.map((e) => e.code) }).toEqual({ style, id, errors: [] })
      }
    }
  })

  test('freeZone picks the widest band beside the ink', () => {
    const z = freeZone([{ x: 100, y: 300, width: 700, height: 200 }], { width: 1920, height: 1080 })!
    expect(z.x).toBeGreaterThan(800)
    expect(freeZone([], { width: 1920, height: 1080 })!.width).toBeGreaterThan(1700)
  })
})

describe('S26 carry-over pass 2: icon-arc, tile-column, edge-strip', () => {
  test('two icons are too few: each falls back along its chain', () => {
    for (const id of ['icon-arc', 'tile-column', 'edge-strip'] as const) {
      const got = sceneBlocks(placeScenes(deck('corporate', [cover('s1', id)], ['coffee', 'leaf'])).slides[0])
      expect(got.length).toBeLessThanOrEqual(1)
    }
  })
  test('icon-arc draws three to five icons of falling size; edge-strip a row of equal small icons', () => {
    const arc = sceneBlocks(placeScenes(deck('corporate', [cover('s1', 'icon-arc')])).slides[0])
    expect(arc.length).toBeGreaterThanOrEqual(3)
    expect(arc[0].box.width).toBeGreaterThan(arc[arc.length - 1].box.width)
    const strip = sceneBlocks(placeScenes(deck('corporate', [cover('s1', 'edge-strip')])).slides[0])
    expect(strip.length).toBeGreaterThanOrEqual(6)
    expect(new Set(strip.map((b) => b.box.width)).size).toBe(1)
  })
})
