/**
 * spro sprint 2026-11c S20 carry-over pass 2 — look treatments on library pictures, `tls.m.asset`, `asset/missing`,
 * a showcase template painting the poster's picture.
 */
import type { DeckAsset, LayoutContext, LayoutNode } from '../types'
import { layoutBlock } from '../layout/layout-child'
import { tlsMIcon } from '../library/media/tls-m-icon'
import { tlsMAsset, lint as assetLint } from '../library/media/tls-m-asset'
import { tlsCFeatureReveal } from '../library/composite/tls-c-feature-reveal'
import { template as revealTemplate } from '../library/composite/tls-c-feature-reveal/template'
import { ctxNoAssets } from '../library/media/media-test'
import { treatTree } from '../paint-treatment'
import { validateDeckSpec } from '../validate-deck-spec'
import { standardBlockSuite } from '../library/text/standard-suite'

const BOWL: DeckAsset = { kind: 'icon', viewBox: '0 0 24 24', colourMode: 'mono', body: '<g fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16"/></g>' }
const SCENE: DeckAsset = { kind: 'emoji', viewBox: '0 0 32 32', colourMode: 'slots', body: '<circle cx="16" cy="16" r="8" fill="var(--ink)"/>' }
const TABLE: Record<string, DeckAsset> = { 'tabler/bowl': BOWL, 'noto/scene': SCENE, 'tabler/coffee': BOWL }
const ctx = (w = 200, h = 200): LayoutContext => ({ ...ctxNoAssets(w, h), libAsset: (id: string) => TABLE[id.replace(/^lib:/, '')] })
const all = (n: LayoutNode): LayoutNode[] => [n, ...((n as { children?: LayoutNode[] }).children ?? []).flatMap(all)]
const images = (n: LayoutNode) => all(n).filter((x): x is Extract<LayoutNode, { k: 'image' }> => x.k === 'image')
const svgOf = (img: Extract<LayoutNode, { k: 'image' }>) => decodeURIComponent(img.url!.split(',')[1])

standardBlockSuite(tlsMAsset, { noCapacity: true })

describe('S20 pass 2 — look treatments reach a library picture', () => {
  const lib = () => layoutBlock(tlsMIcon, { icon: 'lib:tabler/bowl', size: 'lg' }, ctx())
  const treat = (icon: string) => treatTree(lib(), { icon } as never, 'k')

  it('the resolved picture remembers its glyph colour (mono only)', () => {
    expect(images(lib())[0].ink).toMatch(/^#[0-9a-f]{6}$/i)
    expect(images(layoutBlock(tlsMIcon, { icon: 'lib:noto/scene', size: 'lg' }, ctx()))[0].ink).toBeUndefined()
  })

  it('thin thins the strokes; outline and filled leave the picture as it is', () => {
    expect(svgOf(images(treat('thin'))[0])).toContain('stroke-width="1.1"')
    expect(treat('outline')).toEqual(lib())
    expect(treat('filled')).toEqual(lib())
  })

  it('duotone, blob, hand and sticker draw a shape behind the picture; the picture stays in its box', () => {
    for (const v of ['duotone', 'blob', 'hand', 'sticker']) {
      const t = treat(v)
      const kinds = all(t).map((x) => x.k)
      expect(kinds).toContain('image')
      expect(kinds.some((k) => k === 'path' || k === 'rect')).toBe(true)
      expect(t.box).toEqual(lib().box)
    }
  })

  it('tile paints a tile of the glyph colour with the picture in white', () => {
    const t = treat('tile')
    const img = images(t)[0]
    const tile = all(t).find((x) => x.k === 'rect') as Extract<LayoutNode, { k: 'rect' }>
    expect(svgOf(img)).toContain('#FFFFFF')
    expect((tile.fill as { color: string }).color.toLowerCase()).toBe(images(lib())[0].ink!.toLowerCase())
  })

  it('a photo (not lib:) is never treated', () => {
    const photo: LayoutNode = { k: 'image', box: { x: 0, y: 0, width: 100, height: 100 }, assetId: 'photo-1', alt: '', fit: 'cover', url: 'data:image/svg+xml;charset=utf-8,x' }
    expect(treatTree(photo, { icon: 'tile' } as never)).toBe(photo)
  })
})

describe('S20 pass 2 — tls.m.asset', () => {
  it('draws the library picture square, as large as its box, aligned', () => {
    const t = layoutBlock(tlsMAsset, { asset: 'lib:tabler/bowl', align: 'start' }, ctx(400, 200))
    const [img] = images(t)
    expect(img.box).toEqual({ x: 0, y: 0, width: 200, height: 200 })
    const c = images(layoutBlock(tlsMAsset, { asset: 'lib:tabler/bowl' }, ctx(400, 200)))[0]
    expect(c.box.x).toBe(100)
  })

  it('a built-in name or a ref the table lacks draws nothing; the lint names the built-in case', () => {
    expect(images(layoutBlock(tlsMAsset, { asset: 'coffee' }, ctx()))).toHaveLength(0)
    expect(images(layoutBlock(tlsMAsset, { asset: 'lib:tabler/none' }, ctx()))).toHaveLength(0)
    expect(assetLint({ asset: 'coffee' })[0].rule).toBe('asset/not-library')
    expect(assetLint({ asset: 'lib:tabler/bowl' })).toEqual([])
  })
})

describe('S20 pass 2 — asset/missing and the showcase template', () => {
  const deck = (assets: Record<string, DeckAsset> | undefined, icon: string) => ({
    version: 1, id: 'd', title: 't', theme: 'minimal-light', aspect: '16:9', ...(assets ? { assets } : {}),
    slides: [{ id: 's1', layout: 'full', regions: { main: [{ id: 'i', type: 'tls.m.icon', props: { icon } }] } }],
  })
  it('flags a lib: ref the deck table does not hold, only when the deck carries a table', () => {
    const miss = validateDeckSpec(deck(TABLE, 'lib:tabler/none') as never).filter((f) => f.rule === 'asset/missing')
    expect(miss).toHaveLength(1)
    expect(miss[0].path).toContain('slides[0].regions.main[0].props.icon')
    expect(validateDeckSpec(deck(TABLE, 'lib:tabler/bowl') as never).some((f) => f.rule === 'asset/missing')).toBe(false)
    expect(validateDeckSpec(deck(undefined, 'lib:tabler/none') as never).some((f) => f.rule === 'asset/missing')).toBe(false)
  })

  it('tls.c.feature-reveal paints the poster\'s resolved picture, not the warning glyph', () => {
    const props = { ...(tlsCFeatureReveal.defaults as Record<string, unknown>), items: [{ icon: 'lib:tabler/bowl', title: 'A', text: 'a' }, { icon: 'zap', title: 'B', text: 'b' }] }
    const c = ctx(1500, 700)
    const poster = layoutBlock(tlsCFeatureReveal, props, c)
    const html = revealTemplate(props as never, { esc: (s: string) => s, cssVar: (r: string) => `var(--tls-${r})`, box: { x: 0, y: 0, width: 1500, height: 700 }, tokens: c.tokens, poster })
    expect(html).toContain('<img src="data:image/svg+xml')
    expect((html.match(/<img /g) ?? []).length).toBe(1)
  })
})
