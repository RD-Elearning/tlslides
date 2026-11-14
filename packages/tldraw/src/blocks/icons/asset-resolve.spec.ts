/**
 * spro sprint 2026-11c S20-a/b/d — `lib:` refs drawn from the deck's asset table, colours resolved to hex.
 */
import type { DeckAsset, LayoutContext, LayoutNode } from '../types'
import { layoutBlock } from '../layout/layout-child'
import { tlsMIcon } from '../library/media/tls-m-icon'
import { ctxNoAssets } from '../library/media/media-test'
import { hasIcon } from './index'
import { assetSvg, resolveLibIcons, slotColours } from './resolve'
import { deckSpecToDocument } from '../deck-document'
import { documentToDeckSpec } from '../slide-decompiler'
import { defaultBlockSvg, layoutDeck } from '../layout-slide'
import { tlsCFeatureGrid } from '../library/composite/tls-c-feature-grid'
import { template as featureGridTemplate } from '../library/composite/tls-c-feature-grid/template'

const BOWL: DeckAsset = { kind: 'icon', viewBox: '0 0 24 24', colourMode: 'mono', body: '<g fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16"/></g>' }
const SCENE: DeckAsset = {
  kind: 'emoji', viewBox: '0 0 32 32', colourMode: 'slots',
  body: '<defs><linearGradient id="g"><stop stop-color="var(--accent)"/></linearGradient></defs><rect width="32" height="32" fill="var(--paper)"/><circle cx="16" cy="16" r="8" fill="var(--ink)"/><path d="M1 1" fill="var(--soft)"/>',
}
const FLAG: DeckAsset = { kind: 'emoji', viewBox: '0 0 512 512', colourMode: 'fixed', body: '<circle cx="256" cy="256" r="256" fill="#d80027"/>' }
const TABLE: Record<string, DeckAsset> = { 'tabler/bowl': BOWL, 'noto/scene': SCENE, 'circle-flags/vn': FLAG }

function ctx(w = 200, h = 200, table: Record<string, DeckAsset> | undefined = TABLE, colours?: Record<string, string>): LayoutContext {
  const base = ctxNoAssets(w, h)
  const c: LayoutContext = { ...base, ...(table ? { libAsset: (id: string) => table[id.replace(/^lib:/, '')] } : {}) }
  if (colours) c.resolveColor = ((role: string) => ({ color: colours[role] ?? base.resolveColor(role as never).color })) as never
  return c
}

const imagesIn = (n: LayoutNode): Extract<LayoutNode, { k: 'image' }>[] =>
  n.k === 'image' ? [n] : ((n as { children?: LayoutNode[] }).children ?? []).flatMap(imagesIn)
const iconsIn = (n: LayoutNode): Extract<LayoutNode, { k: 'icon' }>[] =>
  n.k === 'icon' ? [n] : ((n as { children?: LayoutNode[] }).children ?? []).flatMap(iconsIn)

describe('S20 library assets', () => {
  it('a lib: ref is a valid icon value', () => {
    expect(hasIcon('lib:tabler/bowl')).toBe(true)
    expect(hasIcon('lib:')).toBe(false)
  })

  it('tls.m.icon draws the deck picture as a self-contained SVG with a hex colour, in the icon box', () => {
    const plain = layoutBlock(tlsMIcon, { icon: 'zap', size: 'lg' }, ctx())
    const lib = layoutBlock(tlsMIcon, { icon: 'lib:tabler/bowl', size: 'lg' }, ctx())
    const [img] = imagesIn(lib)
    expect(img).toBeDefined()
    expect(img.box).toEqual(plain.box)
    const svg = decodeURIComponent(img.url!.split(',')[1])
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 24 24">/)
    expect(svg).not.toContain('currentColor')
    expect(svg).toMatch(/stroke="#[0-9a-f]{6}"/i)
    expect(img.alt).toBe('bowl')
    // the disc treatment keeps its disc; only the glyph is swapped
    const disc = layoutBlock(tlsMIcon, { icon: 'lib:tabler/bowl', size: 'lg', iconStyle: 'disc' }, ctx())
    expect(imagesIn(disc)).toHaveLength(1)
    expect(disc.k).toBe('group')
  })

  it('a missing ref draws nothing (no warning glyph); no table leaves every tree untouched', () => {
    const missing = layoutBlock(tlsMIcon, { icon: 'lib:tabler/nope', size: 'lg' }, ctx())
    expect(imagesIn(missing)).toHaveLength(0)
    expect(iconsIn(missing)).toHaveLength(0)
    const before = layoutBlock(tlsMIcon, { icon: 'zap', size: 'lg' }, ctx(200, 200, undefined))
    const after = layoutBlock(tlsMIcon, { icon: 'zap', size: 'lg' }, ctx())
    expect(after).toEqual(before)
    const tree = layoutBlock(tlsMIcon, { icon: 'lib:tabler/bowl', size: 'lg' }, ctx(200, 200, undefined))
    expect(resolveLibIcons(tree, ctx(200, 200, undefined))).toBe(tree)
  })

  it('slots keep the lightness order on light and dark themes; fixed art is untouched', () => {
    const light = slotColours(ctx(10, 10, TABLE, { surface: '#ffffff', text: '#111111', accent: '#e4572e', accent2: '#2e86ab' }))
    const dark = slotColours(ctx(10, 10, TABLE, { surface: '#101418', text: '#f2f2f2', accent: '#e4572e', accent2: '#2e86ab' }))
    expect(light.paper).toBe('#ffffff')
    expect(light.ink).toBe('#111111')
    expect(dark.paper).toBe('#f2f2f2') // light stays light on a dark theme
    expect(dark.ink).toBe('#101418')
    const svg = assetSvg(SCENE, '#000000', dark)
    expect(svg).not.toContain('var(--')
    expect(svg).toContain('fill="#f2f2f2"')
    expect(svg).toContain('stop-color="#e4572e"')
    expect(assetSvg(FLAG, '#123456', dark)).toContain('fill="#d80027"')
  })

  it('the deck carries its table through the document (round trip) to the SVG export, nested blocks included', () => {
    const deck = {
      id: 'd', assets: TABLE,
      slides: [{ id: 's1', layout: 'blank', regions: { content: [
        { id: 'grid', type: 'tls.c.feature-grid', props: { items: [{ title: 'Bún', icon: 'lib:tabler/bowl' }, { title: 'Cờ', icon: 'lib:circle-flags/vn' }] } },
        { id: 'i', type: 'tls.m.icon', props: { icon: 'lib:noto/scene', size: 'lg' } },
      ] } }],
    }
    const { document } = deckSpecToDocument(deck as never)
    expect(document.libAssets).toEqual(TABLE)
    expect(documentToDeckSpec(document).spec.assets).toEqual(TABLE)
    const page = document.pages.s1
    const render = defaultBlockSvg(document, page)
    const svg = (Object.values(page.shapes) as never[]).map((sh) => render(sh) ?? '').join('')
    expect(svg).toContain('data:image/svg+xml')
    expect(decodeURIComponent(svg)).not.toMatch(/currentColor|var\(--/)
    const shown = layoutDeck(deck as never)[0]
    const urls = JSON.stringify(shown).match(/data:image\/svg\+xml/g) ?? []
    expect(urls.length).toBeGreaterThanOrEqual(1)
  })

  it('feature-grid: the poster holds the picture and the DOM template paints the same URL (plain and disc)', () => {
    for (const iconStyle of [undefined, 'circle']) {
      const props = { cells: [{ icon: 'lib:tabler/bowl', title: 'Bún riêu', desc: 'Cua đồng' }, { icon: 'zap', title: 'Nhanh', desc: 'x' }], ...(iconStyle ? { iconStyle } : {}) }
      const c = ctx(800, 400)
      const node = layoutBlock(tlsCFeatureGrid, props, c)
      const find = (n: LayoutNode): Extract<LayoutNode, { k: 'host' }> | undefined =>
        n.k === 'host' ? n : ((n as { children?: LayoutNode[] }).children ?? []).map(find).find(Boolean)
      const host = find(node)!
      const imgs = imagesIn(host.poster!)
      expect(imgs).toHaveLength(1)
      const html = featureGridTemplate(props as never, { esc: (x: string) => x, cssVar: (r: string) => `var(--${r})`, box: c.box, tokens: c.tokens, poster: host.poster } as never)
      expect(html).toContain(`<img src="${imgs[0].url}"`)
      expect(html.match(/<path d=/g)).toHaveLength(1) // the built-in icon of cell 2 still draws its path
    }
  })
})
