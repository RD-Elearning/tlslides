/**
 * spro enhance PLAN.md S2 — the render treatment changes paint, never geometry: a rough border is
 * a sketch inside the rect's box, a line keeps its ends, the same key draws the same sketch, and
 * the SVG and DOM renderers get nodes they both paint (box-local paths in a group at the box).
 */
import { treatTree, roundedRectPath } from './paint-treatment'
import { renderNodeToSvg } from './render-svg'
import type { LayoutNode } from './types'

const card: LayoutNode = { k: 'rect', box: { x: 40, y: 60, width: 300, height: 200 }, fill: { type: 'solid', color: '#FFF0DC' }, stroke: { color: '#1F1F1F', width: 3 }, radius: 28, part: 'card' }
const rule: LayoutNode = { k: 'line', box: { x: 0, y: 0, width: 800, height: 400 }, from: { x: 0, y: 100 }, to: { x: 400, y: 100 }, stroke: { color: '#888888', width: 2 } }
const arrow: LayoutNode = { ...rule, marker: { kind: 'arrow', color: '#888888' } } as LayoutNode
const tree: LayoutNode = { k: 'group', box: { x: 0, y: 0, width: 800, height: 400 }, children: [card, rule, arrow, { k: 'text', box: { x: 50, y: 70, width: 200, height: 40 }, lines: [], style: {} as never }] }

const boxOf = (n: LayoutNode) => n.box
const paths = (n: LayoutNode): Array<Extract<LayoutNode, { k: 'path' }>> => (n.k === 'path' ? [n] : n.k === 'group' ? n.children.flatMap(paths) : [])

describe('render treatment', () => {
  it('crisp (or none) leaves the tree as it is', () => {
    expect(treatTree(tree, undefined)).toBe(tree)
    expect(treatTree(tree, { stroke: 'crisp', fill: 'flat' })).toBe(tree)
  })

  it('a rough card keeps its box, fill and radius, and draws its border as a sketch inside it', () => {
    const out = treatTree(card, { stroke: 'rough' }, 'k') as Extract<LayoutNode, { k: 'group' }>
    expect(out.k).toBe('group')
    expect(boxOf(out)).toEqual(card.box)
    // the fill follows the hand-drawn edge
    const base = out.children[0] as Extract<LayoutNode, { k: 'path' }>
    expect(base).toMatchObject({ k: 'path', box: { x: 0, y: 0, width: 300, height: 200 }, fill: { type: 'solid', color: '#FFF0DC' } })
    expect(base.stroke).toBeUndefined()
    const shadowed = treatTree({ ...card, shadow: 1 } as LayoutNode, { stroke: 'rough' }, 'k') as Extract<LayoutNode, { k: 'group' }>
    expect(shadowed.children[0]).toMatchObject({ k: 'rect', radius: 28, shadow: 1 })
    const sketch = paths(out)
    expect(sketch.length).toBeGreaterThan(0)
    for (const p of sketch) {
      expect(p.box).toEqual({ x: 0, y: 0, width: 300, height: 200 })
      for (const v of (p.d.match(/-?\d*\.?\d+/g) ?? []).map(Number)) expect(v).toBeGreaterThanOrEqual(-1)
    }
  })

  it('the same key draws the same sketch; another key another', () => {
    const a = JSON.stringify(treatTree(card, { stroke: 'rough' }, 'k1'))
    expect(JSON.stringify(treatTree(card, { stroke: 'rough' }, 'k1'))).toBe(a)
    expect(JSON.stringify(treatTree(card, { stroke: 'rough' }, 'k2'))).not.toBe(a)
  })

  it('a plain rule is sketched between its ends; an arrow keeps its marker and stays crisp', () => {
    const out = treatTree(tree, { stroke: 'rough' }, 'k') as Extract<LayoutNode, { k: 'group' }>
    const [, ruleOut, arrowOut, text] = out.children
    expect(ruleOut.k).toBe('group')
    expect(ruleOut.box.x).toBeLessThan(0)
    expect(ruleOut.box.x + ruleOut.box.width).toBeGreaterThan(400)
    expect(arrowOut).toBe(arrow)
    expect(text.k).toBe('text')
  })

  it('hachure adds a hatched layer to a filled panel', () => {
    const flat = paths(treatTree(card, { stroke: 'rough' }, 'k'))
    const hatched = paths(treatTree(card, { stroke: 'rough', fill: 'hachure' }, 'k'))
    expect(hatched.length).toBeGreaterThan(flat.length)
  })

  it('the SVG renderer paints the treated tree', () => {
    const svg = renderNodeToSvg(treatTree(tree, { stroke: 'rough', fill: 'hachure' }, 'k'), 'p')
    expect(svg).toContain('translate(40 60)')
    expect((svg.match(/<path /g) ?? []).length).toBeGreaterThan(2)
  })

  it('roundedRectPath is closed and absolute', () => {
    expect(roundedRectPath(100, 50, 10)).toMatch(/^M10 0 .* Z$/)
    expect(roundedRectPath(100, 50, 0)).toBe('M0 0 L100 0 L100 50 L0 50 Z')
  })

  it('highlighter puts a band behind each bold run, under the text', () => {
    const text: LayoutNode = { k: 'text', box: { x: 100, y: 50, width: 600, height: 60 }, lines: [{ text: 'Tree is a graph', top: 0, baseline: 40, width: 300, runs: [{ text: 'Tree ' }, { text: 'is a graph', bold: true }] }], style: { family: 'Inter', size: 40, lineHeight: 1.3, letterSpacing: 0, color: '#111111' } }
    const out = treatTree(text, { emphasis: 'highlighter', highlight: '#FFE066' }, 'k') as Extract<LayoutNode, { k: 'group' }>
    expect(out.k).toBe('group')
    expect(out.box).toEqual(text.box)
    const [band, inner] = out.children
    expect(band).toMatchObject({ k: 'rect', part: 'highlight' })
    expect(band.box.x).toBeGreaterThan(40)
    expect(inner).toMatchObject({ k: 'text', box: { x: 0, y: 0 } })
    const plain: LayoutNode = { ...text, lines: [{ ...text.lines[0], runs: [{ text: 'Tree is a graph' }] }] } as LayoutNode
    expect(treatTree(plain, { emphasis: 'highlighter' }, 'k')).toBe(plain)
  })
})
