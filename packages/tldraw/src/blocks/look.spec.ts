/**
 * spro creative PLAN §6.3 (CR7b) — look axes. A look is validated (`look/unknown-value`), kept by
 * the round trip at deck, slide and block level, merged style → deck → slide → block, and painted
 * without moving anything: every painted value keeps the block's box. A deck with no look draws
 * as before (back-compat).
 */
import { treatTree } from './paint-treatment'
import { renderNodeToSvg } from './render-svg'
import { blockTreatment, LOOK_AXES, LOOK_PAINTED, LOOK_VALUES, lookProblems, lookRangeProblems, resolveLook } from './look'
import { validateDeckSpec } from './validate-deck-spec'
import { deckSpecToDocument } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'
import { deckSpecJsonSchema } from './deck-spec-json-schema'
import { BLOCK_PROP_KEY } from './shape-bridge'
import type { BlockSpec, DeckSpec, LayoutNode, LookAxes } from './types'

const card: LayoutNode = { k: 'rect', box: { x: 40, y: 60, width: 300, height: 200 }, fill: { type: 'solid', color: '#FFF0DC' }, stroke: { color: '#1F1F1F', width: 3 }, radius: 12, part: 'card' }
const arrow: LayoutNode = { k: 'line', box: { x: 0, y: 0, width: 800, height: 400 }, from: { x: 0, y: 100 }, to: { x: 400, y: 100 }, stroke: { color: '#888888', width: 2 }, marker: { kind: 'arrow', color: '#888888' } } as LayoutNode
const bold: LayoutNode = {
  k: 'text', box: { x: 50, y: 300, width: 400, height: 48 },
  lines: [{ text: 'a key term', runs: [{ text: 'a ' }, { text: 'key term', bold: true }], width: 200 }] as never,
  style: { size: 32, lineHeight: 1.3, color: '#222222', family: 'Inter', weight: 400 } as never,
}
const tree: LayoutNode = { k: 'group', box: { x: 0, y: 0, width: 800, height: 400 }, children: [card, arrow, bold] }

const T = (text: string, look?: LookAxes): BlockSpec => ({ id: 't', type: 'tls.t.title', props: { text }, ...(look ? { look } : {}) })
const deck = (over: Partial<DeckSpec> = {}): DeckSpec =>
  ({ version: 1, id: 'q', title: 'q', theme: 'doodle-paper', style: 'doodle', aspect: 'widescreen', slides: [{ id: 's', layout: 'blank', regions: { content: [T('Hello', { corner: 'pill' })] } }], ...over }) as DeckSpec

describe('look axes', () => {
  it('validates every axis and value; an unknown one is an error', () => {
    expect(lookProblems({ stroke: 'ink', depth: 'stack' }, 'look', 'DeckSpec')).toEqual([])
    expect(lookProblems({ stroke: 'pencil' }, 'look', 'DeckSpec')[0].rule).toBe('look/unknown-value')
    expect(lookProblems({ glow: 'soft' }, 'look', 'DeckSpec')[0].message).toContain('not a look axis')
    const bad = deck({ look: { stroke: 'pencil' } as never })
    expect(validateDeckSpec(bad).filter((f) => f.rule === 'look/unknown-value' && f.level === 'error')).toHaveLength(1)
    expect(validateDeckSpec(deck({ look: { stroke: 'ink' } })).filter((f) => f.rule.startsWith('look/'))).toHaveLength(0)
    const slideBad = deck({ slides: [{ id: 's', layout: 'blank', look: { fill: 'plaid' } as never, regions: { content: [T('x', { corner: 'zigzag' } as never)] } }] })
    expect(validateDeckSpec(slideBad).filter((f) => f.rule === 'look/unknown-value').map((f) => f.path)).toEqual(['slides[0].look.fill', expect.stringContaining('.look.corner')])
  })

  it('round trip keeps deck, slide and block looks; the page base is never authored back', () => {
    const d = deck({ look: { stroke: 'ink' }, slides: [{ id: 's', layout: 'blank', look: { fill: 'hachure' }, regions: { content: [T('Hello', { corner: 'pill' })] } }] })
    const { document } = deckSpecToDocument(d)
    const page = Object.values(document.pages)[0]
    const shape = Object.values(page.shapes).find((s) => (s as { componentId?: string }).componentId === 'tls.t.title')!
    const meta = (shape.props as Record<string, unknown>)[BLOCK_PROP_KEY] as { look?: LookAxes; lookBase?: LookAxes }
    expect(meta.lookBase).toEqual({ stroke: 'ink', fill: 'hachure' })
    expect(meta.look).toEqual({ corner: 'pill' })
    const back = documentToDeckSpec(document).spec
    expect(back.look).toEqual({ stroke: 'ink' })
    expect(back.slides[0].look).toEqual({ fill: 'hachure' })
    const block = back.slides[0].regions.content[0]
    expect(block.look).toEqual({ corner: 'pill' })
    expect((block as unknown as { lookBase?: unknown }).lookBase).toBeUndefined()
    const schema = deckSpecJsonSchema() as any
    expect(schema.properties.look.properties.stroke.enum).toEqual([...LOOK_VALUES.stroke])
    expect(schema.properties.slides.items.properties.look).toBeDefined()
  })

  it('merges style → deck → slide → block, skipping unknown values', () => {
    expect(resolveLook({ stroke: 'rough', fill: 'hachure', roughness: 1.4 }, { fill: 'flat' }, { corner: 'round' }, { stroke: 'ink' })).toEqual({ stroke: 'ink', fill: 'flat', corner: 'round', roughness: 1.4 })
    expect(resolveLook(undefined, { stroke: 'pencil' } as never)).toEqual({})
    expect(blockTreatment({ stroke: 'rough' }, {})).toEqual({ stroke: 'rough' })
    expect(blockTreatment(undefined, { lookBase: { depth: 'hard' }, look: { depth: 'flat' } })).toEqual({ depth: 'flat' })
  })

  it('a deck with no look draws as before; crisp and flat paint nothing', () => {
    expect(treatTree(tree, undefined)).toBe(tree)
    expect(treatTree(tree, resolveLook(undefined))).toBe(tree)
    expect(treatTree(tree, { stroke: 'crisp', fill: 'flat', emphasis: 'bold', connector: 'straight' })).toBe(tree)
  })

  it('every painted value keeps every box and renders to SVG', () => {
    for (const ax of LOOK_AXES) {
      for (const v of LOOK_PAINTED[ax]) {
        const out = treatTree(tree, { [ax]: v } as LookAxes, 'k')
        expect(out.k === 'group' && out.children.map((c) => c.box)).toEqual([card.box, arrow.box, bold.box])
        expect(renderNodeToSvg(out, 'p-')).toContain('<svg')
      }
    }
  })

  it('each painted value changes what is drawn, deterministically per key', () => {
    const svg = (look: LookAxes, key = 'k') => renderNodeToSvg(treatTree(tree, look, key), 'p-')
    const base = renderNodeToSvg(tree, 'p-')
    const changed: Record<string, string[]> = {
      stroke: ['rough', 'ink', 'chalk', 'marker'], fill: ['hachure', 'crosshatch', 'gradient'], corner: ['square', 'round', 'pill', 'wobbly', 'cut'],
      depth: ['flat', 'soft', 'hard', 'extrude', 'clay', 'stack'], emphasis: ['color', 'highlighter', 'underline', 'circle', 'box'], connector: ['dotted'],
    }
    for (const [ax, vs] of Object.entries(changed)) {
      for (const v of vs) {
        const look = { [ax]: v } as LookAxes
        if (ax === 'depth' && v === 'flat') continue // the card has no shadow to remove
        expect([ax, v, svg(look) !== base]).toEqual([ax, v, true])
        expect(svg(look)).toBe(svg(look))
      }
    }
    expect(svg({ stroke: 'ink' }, 'a')).not.toBe(svg({ stroke: 'ink' }, 'b'))
  })

  it('look/out-of-range against a range', () => {
    expect(lookRangeProblems({ stroke: 'chalk' }, { stroke: ['crisp', 'ink'] }, 's3')[0].code).toBe('look/out-of-range')
    expect(lookRangeProblems({ stroke: 'ink' }, { stroke: ['crisp', 'ink'] }, 's3')).toEqual([])
    expect(lookRangeProblems({ stroke: 'ink' }, undefined, 's3')).toEqual([])
  })
})
