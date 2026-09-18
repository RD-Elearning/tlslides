/**
 * B.5 item 3 — the real luminance-aware contrast solver must be wired into the
 * *production* render path (`deckLayoutContext`, the single entry point
 * `ComponentUtil`/`DeckViewer`/export all use), not only exercised by its own unit spec.
 *
 * Before the fix, `deckLayoutContext` never passed a `resolveColor`, so every real render
 * fell back to `layout-child.ts`'s flat `tokens.color[role]` lookup and a dark gradient
 * surface still produced the theme's dark nominal text colour.
 */

import type { TDDocument } from '~types'
import { TDAssetType } from '~types'
import * as fs from 'fs'
import * as path from 'path'
import { tryHexToRgb } from './color-math'
import { deckLayoutContext, contextForBlock } from './deck-context'
import { deckSpecToDocument } from './deck-document'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'

function makeDoc(): TDDocument {
  return {
    id: 'test-doc',
    name: 'Test Deck',
    version: 16,
    pages: {},
    pageStates: {},
    assets: {},
    defaultPageSize: [1920, 1080],
  } as TDDocument
}

const DARK_GRADIENT = {
  type: 'linearGradient' as const,
  angle: 180,
  stops: [
    { at: 0, color: '#000000' },
    { at: 1, color: '#000000' },
  ],
}

describe('deckLayoutContext — contrast solver wiring', () => {
  it('resolves a role-valued `on` against a dark slide surface to a light hex', () => {
    const ctx = deckLayoutContext(makeDoc(), { x: 0, y: 0, width: 800, height: 400 }, {
      headless: false,
      slideBackground: DARK_GRADIENT,
      style: { on: 'text' },
    })

    const resolved = ctx.resolveColor('text')
    const rgb = tryHexToRgb(resolved.color)
    expect(rgb).toBeDefined()
    // The flat fallback returned the theme's nominal (dark) text colour with ratio 1;
    // the real solver must lift it off a dark surface to clear the 4.5:1 floor.
    expect(resolved.color).not.toBe(ctx.tokens.color.text)
    expect(resolved.ratio).toBeGreaterThanOrEqual(4.5)
  })
})

describe('deckLayoutContext — asset resolution (B.5 item 15)', () => {
  it('supplies resolveAsset from the document asset table, reaching a real media host', () => {
    const doc = makeDoc()
    doc.assets = {
      'closing-photo': {
        id: 'closing-photo',
        type: TDAssetType.Image,
        src: '/assets/closing.jpg',
        size: [100, 100],
      },
    } as TDDocument['assets']

    const ctx = deckLayoutContext(doc, { x: 0, y: 0, width: 600, height: 400 }, { headless: true })
    expect(ctx.resolveAsset?.('closing-photo')).toBe('/assets/closing.jpg')

    // The real media block consumes the resolver end-to-end.
    const registry = new BlockRegistry()
    registerBuiltInBlocks(registry)
    const def = registry.get('tls.m.image')!
    const node = def.layout({ src: 'closing-photo', alt: 'Team' }, ctx) as unknown as {
      children: Array<{ part?: string; url?: string }>
    }
    const image = node.children.find((c) => c.part === 'image')
    expect(image?.url).toBe('/assets/closing.jpg')
  })
})

describe('deck-context — demo slide 2 gradient reaches the viewer/editor path (B.5 item 7)', () => {
  it('the section block resolves its gradient surface through contextForBlock', () => {
    const deck = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '__fixtures__/demo-deck.json'), 'utf-8')
    )
    const { document } = deckSpecToDocument(deck)
    const page = document.pages['sl_02']
    const shape = Object.values(page.shapes)[0] as import('~types').ComponentShape
    expect(shape.componentId).toBe('tls.l.section')

    const registry = new BlockRegistry()
    registerBuiltInBlocks(registry)

    // This is the exact context DeckViewer/ComponentUtil build for a shape.
    const ctx = contextForBlock(shape, document, {
      headless: false,
      slideBackground: page.background,
      registry,
    })
    const node = registry.get(shape.componentId)!.layout(shape.props, ctx) as unknown as {
      children: Array<{ part?: string; fill?: unknown }>
    }
    const surface = node.children.find((c) => c.part === 'surface')
    expect(surface?.fill).toEqual({
      type: 'linearGradient',
      angle: 135,
      stops: [
        { color: '#0E2233', at: 0 },
        { color: '#1B4A6B', at: 1 },
      ],
    })
  })
})
