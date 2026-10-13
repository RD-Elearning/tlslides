/**
 * Tests for tls.m.image — image block.
 *
 * Covers: layout output structure, missing asset dashed frame, cover vs contain,
 * focal point, caption rendering, and edge cases.
 */

import { tlsMImage } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../../layout/test-helpers'
import { renderNodeToSvg } from '../../../render-svg'

describe('tls.m.image', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsMImage.layout(tlsMImage.defaults as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('image node structure', () => {
    it('has an image child with required fields', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(tlsMImage.defaults as any, ctx)
      expect(node.children.length).toBeGreaterThanOrEqual(1)
      const imgNode = node.children[0]
      expect(imgNode.k).toBe('image')
      expect(imgNode.part).toBe('image')
      expect((imgNode as any).assetId).toBe('')
      expect((imgNode as any).alt).toBe('Image')
      expect((imgNode as any).fit).toBe('cover')
    })

    it('defaults focal to center [0.5, 0.5]', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(tlsMImage.defaults as any, ctx)
      const imgNode = node.children[0] as any
      expect(imgNode.focal).toEqual([0.5, 0.5])
    })
  })

  describe('missing asset renders dashed frame (no url)', () => {
    it('image node has no url when resolveAsset is not provided', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(
        { src: 'some-asset-id', alt: 'Missing photo' } as any,
        ctx,
      )
      const imgNode = node.children[0] as any
      expect(imgNode.url).toBeUndefined()
      expect(imgNode.assetId).toBe('some-asset-id')
      expect(imgNode.alt).toBe('Missing photo')
    })

    it('SVG renderer produces dashed rect with alt text for missing asset', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(
        { src: 'missing-asset', alt: 'Not found' } as any,
        ctx,
      )
      const svg = renderNodeToSvg(node)
      expect(svg).toContain('stroke-dasharray')
      expect(svg).toContain('Not found')
      // Should not contain an <image> element
      expect(svg).not.toMatch(/<image\b/)
    })
  })

  describe('resolved asset produces url on node', () => {
    it('image node has url when resolveAsset returns a value', () => {
      const resolveAsset = (id: string) => `/assets/${id}.png`
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      // Override the context with a resolver
      const ctxWithResolver = {
        ...ctx,
        resolveAsset,
      }
      const node = tlsMImage.layout(
        { src: 'my-photo', alt: 'A photo' } as any,
        ctxWithResolver,
      )
      // AC4: a tinted backing rect is painted under a resolved image, so find the image node by kind
      const imgNode = node.children.find((c: any) => c.k === 'image') as any
      expect((node as any).children[0].k).toBe('rect')
      expect(imgNode.url).toBe('/assets/my-photo.png')
    })

    it('SVG renderer produces <image> with resolved url', () => {
      const resolveAsset = (id: string) => `https://cdn.example.com/${id}`
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const ctxWithResolver = { ...ctx, resolveAsset }
      const node = tlsMImage.layout(
        { src: 'hero.jpg', alt: 'Hero image' } as any,
        ctxWithResolver,
      )
      const svg = renderNodeToSvg(node)
      expect(svg).toContain('<image')
      expect(svg).toContain('https://cdn.example.com/hero.jpg')
    })
  })

  describe('cover vs contain', () => {
    it('emits cover by default', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(tlsMImage.defaults as any, ctx)
      const imgNode = node.children[0] as any
      expect(imgNode.fit).toBe('cover')
    })

    it('emits contain when specified', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(
        { ...tlsMImage.defaults, fit: 'contain' } as any,
        ctx,
      )
      const imgNode = node.children[0] as any
      expect(imgNode.fit).toBe('contain')
    })

    it('SVG uses xMidYMid slice for cover', () => {
      const resolveAsset = (id: string) => `http://img/${id}`
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const ctxWithResolver = { ...ctx, resolveAsset }
      const node = tlsMImage.layout(
        { ...tlsMImage.defaults, fit: 'cover', src: 'pic' } as any,
        ctxWithResolver,
      )
      const svg = renderNodeToSvg(node)
      expect(svg).toContain('xMidYMid slice')
    })

    it('SVG uses xMidYMid meet for contain', () => {
      const resolveAsset = (id: string) => `http://img/${id}`
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const ctxWithResolver = { ...ctx, resolveAsset }
      const node = tlsMImage.layout(
        { ...tlsMImage.defaults, fit: 'contain', src: 'pic' } as any,
        ctxWithResolver,
      )
      const svg = renderNodeToSvg(node)
      expect(svg).toContain('xMidYMid meet')
    })
  })

  describe('focal point', () => {
    it('passes focal to image node', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(
        { ...tlsMImage.defaults, focal: [0.25, 0.75] } as any,
        ctx,
      )
      const imgNode = node.children[0] as any
      expect(imgNode.focal).toEqual([0.25, 0.75])
    })

    it('defaults to [0.5, 0.5] when not specified', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(
        { ...tlsMImage.defaults, focal: undefined } as any,
        ctx,
      )
      const imgNode = node.children[0] as any
      expect(imgNode.focal).toEqual([0.5, 0.5])
    })
  })

  describe('caption', () => {
    it('does not emit caption node when caption is absent', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(tlsMImage.defaults as any, ctx)
      const captionNode = node.children.find((c) => c.part === 'caption')
      expect(captionNode).toBeUndefined()
    })

    it('emits caption text node when caption is provided', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(
        { ...tlsMImage.defaults, caption: 'A beautiful sunset' } as any,
        ctx,
      )
      const captionNode = node.children.find((c) => c.part === 'caption')
      expect(captionNode).toBeDefined()
      expect(captionNode!.k).toBe('text')
    })

    it('image height is reduced when caption is present', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const nodeWithCaption = tlsMImage.layout(
        { ...tlsMImage.defaults, caption: 'Caption' } as any,
        ctx,
      )
      const nodeWithout = tlsMImage.layout(tlsMImage.defaults as any, ctx)
      const imgWith = nodeWithCaption.children.find((c) => c.part === 'image')!
      const imgWithout = nodeWithout.children.find((c) => c.part === 'image')!
      expect(imgWith.box.height).toBeLessThan(imgWithout.box.height)
    })

    it('does not emit caption for empty string', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(
        { ...tlsMImage.defaults, caption: '   ' } as any,
        ctx,
      )
      const captionNode = node.children.find((c) => c.part === 'caption')
      expect(captionNode).toBeUndefined()
    })
  })

  describe('corner radius', () => {
    it('passes radius to image node', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(
        { ...tlsMImage.defaults, radius: 12 } as any,
        ctx,
      )
      const imgNode = node.children[0] as any
      expect(imgNode.radius).toBe(12)
    })

    it('radius is undefined by default', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(tlsMImage.defaults as any, ctx)
      const imgNode = node.children[0] as any
      expect(imgNode.radius).toBeUndefined()
    })
  })

  describe('block metadata', () => {
    it('has type tls.m.image', () => {
      expect(tlsMImage.type).toBe('tls.m.image')
    })

    it('is media family', () => {
      expect(tlsMImage.family).toBe('media')
    })

    it('is tier A', () => {
      expect(tlsMImage.tier).toBe('A')
    })

    it('has sensible preferred size', () => {
      expect(tlsMImage.size.preferred[0]).toBeGreaterThan(0)
      expect(tlsMImage.size.preferred[1]).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('handles very small box', () => {
      const ctx = makeCtx({ width: 1, height: 1 }, registry)
      const node = tlsMImage.layout(tlsMImage.defaults as any, ctx)
      assertValidNode(node)
    })

    it('handles very large box', () => {
      const ctx = makeCtx({ width: 3840, height: 2160 }, registry)
      const node = tlsMImage.layout(tlsMImage.defaults as any, ctx)
      assertValidNode(node)
    })

    it('handles empty alt text', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsMImage.layout(
        { ...tlsMImage.defaults, alt: '' } as any,
        ctx,
      )
      assertValidNode(node)
      const imgNode = node.children[0] as any
      expect(imgNode.alt).toBe('')
    })
  })
})

describe('IM4 — a contained figure at its own shape, framed', () => {
  const leavesOf = (n: any): any[] => (n.children ?? []).flatMap((c: any) => [c, ...leavesOf(c)])
  const lay = (props: Record<string, unknown>, w = 800, h = 600) => tlsMImage.layout({ src: 'fig:f1', alt: 'A tree', fit: 'contain', ...props } as any, makeCtx({ width: w, height: h }))
  it('the picture keeps its aspect, centred in the box', () => {
    const img = leavesOf(lay({ aspect: 2 })).find((l) => l.k === 'image')
    expect(img.box.width / img.box.height).toBeCloseTo(2, 3)
    expect(img.box.width).toBeCloseTo(800, 0)
    expect(img.box.y).toBeCloseTo((600 - 400) / 2, 0)
  })
  it.each(['card', 'tape', 'polaroid'])('%s: a panel around the picture, inside the box', (frame) => {
    const leaves = leavesOf(lay({ aspect: 1.5, frame }))
    const panel = leaves.find((l) => l.part === 'frame')
    const img = leaves.find((l) => l.k === 'image')
    expect(panel.box.x).toBeLessThan(img.box.x)
    expect(panel.box.y + panel.box.height).toBeGreaterThan(img.box.y + img.box.height)
    expect(panel.box.x + panel.box.width).toBeLessThanOrEqual(800.5)
    expect(panel.box.y + panel.box.height).toBeLessThanOrEqual(600.5)
    if (frame === 'tape') expect(leaves.filter((l) => l.part === 'frame.tape')).toHaveLength(2)
  })
  it('without an aspect (or with cover) the image fills the box as before', () => {
    expect(leavesOf(lay({ frame: 'card' })).find((l) => l.k === 'image').box).toEqual({ x: 0, y: 0, width: 800, height: 600 })
    expect(leavesOf(lay({ fit: 'cover', aspect: 2, frame: 'card' })).some((l) => l.part === 'frame')).toBe(false)
  })
})
