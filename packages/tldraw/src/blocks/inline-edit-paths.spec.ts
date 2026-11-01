/**
 * Editor E02 — ratchet: every text leaf's `propPath` is valid in the slide-level block's own
 * props (never a nested child's own `text`), and an ambiguous value never keeps a path.
 *
 * Coverage (how many leaves are inline-editable per block) is kept in
 * `__generated__/inline-edit-coverage.json`; it may only go up. `UPDATE_COVERAGE=1` rewrites it.
 */
import * as fs from 'fs'
import * as path from 'path'
import { deckSpecToDocument } from './deck-document'
import { contextForBlock } from './deck-context'
import { layoutBlock } from './layout/layout-child'
import { defaultBlockRegistry } from './validate-deck-spec'
import { getAtPath, hasPath } from './prop-path'
import type { DeckSpec, LayoutNode } from './types'
import type { ComponentShape } from '~types'

const registry = defaultBlockRegistry()
const COVERAGE = path.join(__dirname, '__generated__', 'inline-edit-coverage.json')

const norm = (s: string) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
function flat(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (v && typeof v === 'object' && Array.isArray((v as { runs?: unknown[] }).runs))
    return (v as { runs: Array<{ text?: string }> }).runs.map((r) => r.text ?? '').join('')
  return ''
}

function leaves(node: LayoutNode, out: Array<{ text: string; path?: string }> = []) {
  if (node.k === 'text') {
    const text = norm(node.lines.map((l) => (l.runs ? l.runs.map((r) => r.text).join('') : (l as { text?: string }).text ?? '')).join(' '))
    if (text) out.push({ text, path: node.propPath })
  }
  for (const c of (node as { children?: LayoutNode[] }).children ?? []) leaves(c, out)
  return out
}

function layOut(type: string, props: Record<string, unknown>, style = 'corporate') {
  const spec = {
    version: 1,
    id: 'd',
    title: 'd',
    theme: 'default',
    aspect: '16:9',
    style,
    slides: [{ id: 's1', layout: 'full-bleed', regions: { content: [{ id: 'b1', type, props }] } }],
  } as unknown as DeckSpec
  const doc = deckSpecToDocument(spec).document
  const page = Object.values(doc.pages)[0]
  const shape = Object.values(page.shapes).find((s) => (s as ComponentShape).componentId === type) as ComponentShape | undefined
  if (!shape) return undefined
  const def = registry.get(type)!
  const ctx = contextForBlock(shape, doc, { headless: true, registry })
  const p = shape.props as Record<string, unknown>
  return { node: layoutBlock(def, p, ctx), props: p }
}

function exampleProps(type: string): Record<string, unknown> {
  const def = registry.get(type)!
  return JSON.parse(JSON.stringify(def.describe?.example?.props ?? def.defaults ?? {}))
}

/** Every string in the props (deeply) set to one text — any value match is then ambiguous. */
function collide(v: unknown): unknown {
  // prose only: enum-like values (`heading`, `dot`, `book-open`) stay as they are
  if (typeof v === 'string') return /^[a-z0-9-]{1,24}$/.test(v) ? v : 'Same text'
  if (Array.isArray(v)) return v.map(collide)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (Array.isArray(o.runs)) return { runs: [{ text: 'Same text' }] }
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, k === 'type' || k === 'id' || k === 'variant' || k === 'icon' ? x : collide(x)]))
  }
  return v
}

const types = registry.list().map((d) => d.type).sort()

describe('editor E02 — inline edit paths', () => {
  const coverage: Record<string, { ok: number; none: number }> = {}

  test.each(types)('%s: every path resolves to the text it labels', (type) => {
    const r = layOut(type, exampleProps(type))
    if (!r) return
    const wrong: string[] = []
    let ok = 0
    let none = 0
    for (const leaf of leaves(r.node)) {
      if (!leaf.path) {
        none++
        continue
      }
      const v = norm(flat(getAtPath(r.props, leaf.path)))
      const good = hasPath(r.props, leaf.path) && !!v && (v.includes(leaf.text.slice(0, 12)) || leaf.text.includes(v.slice(0, 12)))
      if (good) ok++
      else wrong.push(`${leaf.path} → "${leaf.text.slice(0, 30)}"`)
    }
    coverage[type] = { ok, none }
    expect(wrong).toEqual([])
  })

  test('coverage never drops', () => {
    const before: Record<string, { ok: number; none: number }> = fs.existsSync(COVERAGE) ? JSON.parse(fs.readFileSync(COVERAGE, 'utf8')) : {}
    if (process.env.UPDATE_COVERAGE === '1' || !fs.existsSync(COVERAGE)) {
      const sorted = Object.fromEntries(Object.keys(coverage).sort().map((k) => [k, coverage[k]]))
      fs.writeFileSync(COVERAGE, JSON.stringify(sorted, null, 2) + '\n')
      return
    }
    const dropped = Object.entries(before)
      .filter(([t, c]) => coverage[t] && coverage[t].ok < c.ok)
      .map(([t, c]) => `${t}: ${c.ok} → ${coverage[t].ok}`)
    expect(dropped).toEqual([])
  })

  test.each(types)('%s: no path survives on ambiguous values', (type) => {
    const r = layOut(type, collide(exampleProps(type)) as Record<string, unknown>)
    if (!r) return
    // with every string equal, a leaf may keep a path only when its block draws it directly at a
    // path that exists (its own slot, an authored child) — and that path must still resolve
    for (const leaf of leaves(r.node)) if (leaf.path) expect(hasPath(r.props, leaf.path)).toBe(true)
  })
})

/* ── E10: a duplicated item keeps both copies editable, each at its own place ──────────────── */

function placed(node: LayoutNode, dx = 0, dy = 0, out: Array<{ x: number; y: number; path?: string }> = []) {
  const x = dx + (node.box?.x ?? 0)
  const y = dy + (node.box?.y ?? 0)
  if (node.k === 'text') out.push({ x, y, path: node.propPath })
  // children of a group are placed relative to it (as the DOM renderer applies them)
  for (const c of (node as { children?: LayoutNode[] }).children ?? []) placed(c, node.k === 'group' ? x : dx, node.k === 'group' ? y : dy, out)
  return out
}

const listKey = (props: Record<string, unknown>) =>
  Object.keys(props).find((k) => Array.isArray(props[k]) && (props[k] as unknown[]).length >= 2 && (props[k] as unknown[]).every((v) => v && typeof v === 'object' && !('type' in (v as object))))

describe('editor E10 — duplicated items', () => {
  const both: string[] = []
  test.each(types)('%s: item 0 and its copy each map to their own place', (type) => {
    const orig = exampleProps(type)
    const key = listKey(orig)
    if (!key) return
    const props = exampleProps(type)
    ;(props[key] as unknown[])[1] = JSON.parse(JSON.stringify((props[key] as unknown[])[0]))
    const r0 = layOut(type, orig)
    const r = layOut(type, props)
    if (!r0 || !r) return
    const anchor = (node: LayoutNode, i: number) => {
      const ls = placed(node).filter((l) => l.path?.startsWith(`${key}.${i}.`))
      return ls.length ? { x: Math.min(...ls.map((l) => l.x)), y: Math.min(...ls.map((l) => l.y)) } : undefined
    }
    const [o0, o1, d0, d1] = [anchor(r0.node, 0), anchor(r0.node, 1), anchor(r.node, 0), anchor(r.node, 1)]
    if (!o0 || !o1 || !d0 || !d1) return
    both.push(type)
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
    // each copy sits where its own item sat, not where the other one did
    expect({ type, ok: dist(d0, o0) <= dist(d0, o1) && dist(d1, o1) <= dist(d1, o0) }).toEqual({ type, ok: true })
  })
  afterAll(() => {
    if (process.env.VERBOSE) console.log(`duplicated items editable in ${both.length} blocks: ${both.join(' ')}`)
  })
})
