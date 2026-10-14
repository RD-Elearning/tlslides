/**
 * CMP1 — DOM↔SVG parity probes for nested composition (composition README §2 CMP1 "Done when"):
 * nested style (a child's own `style`, a card's surface passed down), the honest style fields
 * (tone / radius / elevation / gap), anchors and layers inside `tls.l.overlay`, and a bleeding
 * child (a decoration placed partly outside its container, unclipped).
 */
import { assertParity, shutdownWorker } from './parity-harness'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'
import type { BlockDefinition, BlockSpec, LayoutContext, LayoutNode } from './types'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)

const body = (id: string, text: string, extra: Partial<BlockSpec> = {}): BlockSpec => ({ id, type: 'tls.t.body', props: { text }, ...extra })
const card = (id: string, children: BlockSpec[], style: BlockSpec['style']): BlockSpec => ({ id, type: 'tls.l.card', props: { children }, style })

describe('CMP1 composition parity (DOM ↔ SVG)', () => {
  afterAll(async () => {
    await shutdownWorker()
  })

  // The harness pairs DOM and SVG elements by part name, so each probe keeps leaf part names
  // unique: one card (one body) per tone, wrapped in a stack (the card's own `style` is a nested
  // style, read by `layoutChild`).
  it.each([
    ['filled + radius xl + elevation 2', { tone: 'filled', radius: 'xl', elevation: 2 }, {}],
    ['outline + gap', { tone: 'outline', gap: 'lg' }, { on: '#B42318' }],
    ['inverted (ink solved light on the card)', { tone: 'inverted', radius: 'md' }, {}],
    ['gradient + elevation 1', { tone: 'gradient', radius: 'lg', elevation: 1 }, {}],
  ] as const)('nested card style: %s', async (_name, style, bodyStyle) => {
    const props = { children: [card('c', [body('b', 'Ink solved on the card', Object.keys(bodyStyle).length ? { style: bodyStyle } : {})], style as BlockSpec['style'])] }
    await assertParity(registry.get('tls.l.stack')!, props, { width: 420, height: 300 }, undefined, { registry })
  }, 30_000)

  it('tls.l.overlay: layered children at their anchors', async () => {
    const props = {
      children: [
        { id: 'deco', type: 'tls.m.decoration', props: { shape: 'blob', tone: 'accent2', seed: 3 }, layer: 'backdrop' },
        { id: 'k', type: 'tls.t.kicker', props: { text: 'Top right' }, anchor: 'top-right' },
        { id: 'hn', type: 'tls.t.hero-number', props: { value: '42%', unit: 'growth' }, anchor: 'center' },
        { ...card('c', [{ id: 'ic', type: 'tls.m.icon', props: { icon: 'zap', size: 'md' } }], { tone: 'inverted', radius: 'md' }), anchor: 'bottom-left' },
      ] as BlockSpec[],
    }
    await assertParity(registry.get('tls.l.overlay')!, props, { width: 900, height: 500 }, undefined, { registry })
  }, 30_000)

  // CMP2: an authored `style.surface` painted as a rect behind a title (a scrim panel), and an
  // accent kicker on an accent card re-solved by the ink guard — both live in the tree.
  it('CMP2: a title on a painted scrim surface', async () => {
    const props = { children: [{ id: 't', type: 'tls.t.title', props: { text: 'On a scrim', size: 'heading' }, style: { surface: 'scrim', padding: 'md', radius: 'md' } }] }
    await assertParity(registry.get('tls.l.stack')!, props, { width: 700, height: 260 }, undefined, { registry })
  }, 30_000)

  it('CMP2: an accent kicker on an accent card (ink guard)', async () => {
    const props = { children: [card('c', [{ id: 'k', type: 'tls.t.kicker', props: { text: 'Accent on accent' } }], { surface: 'accent' })] }
    await assertParity(registry.get('tls.l.stack')!, props, { width: 600, height: 240 }, undefined, { registry })
  }, 30_000)

  it('a bleeding child (decoration partly outside its container) draws the same', async () => {
    const probe: BlockDefinition = {
      type: 'probe.bleed',
      name: 'Bleed probe',
      family: 'layout',
      tier: 'A',
      summary: 'A decoration that leaves its container box',
      keywords: [],
      schema: {},
      defaults: {},
      size: { preferred: [800, 400], min: [100, 100] },
      motion: { parts: [] },
      layout: (_p: Record<string, unknown>, ctx: LayoutContext): LayoutNode => ({
        k: 'group',
        box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
        part: 'root',
        children: [
          ctx.layoutChild({ id: 'orb', type: 'tls.m.decoration', props: { shape: 'circle', tone: 'accent', opacity: 'medium' }, layer: 'backdrop', bleed: true }, { x: 600, y: -60, width: 300, height: 300 }),
          ctx.layoutChild(body('t', 'Content stays inside'), { x: 40, y: 160, width: 500, height: 80 }),
        ],
      }),
    }
    await assertParity(probe, {}, { width: 800, height: 400 }, undefined, { registry })
  }, 30_000)
})
