/**
 * P0.5 — every icon path parses and fits the 24×24 viewBox; groups cover the set exactly once.
 */
import { ICONS, ICON_GROUPS, getIcon, hasIcon } from './index'

const ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }

/** Walk a path and return every absolute point it visits (endpoints and control points). */
function points(d: string): { pts: [number, number][]; ok: boolean } {
  const pts: [number, number][] = []
  let pos = 0
  const skip = () => { while (pos < d.length && /[\s,]/.test(d[pos])) pos++ }
  const num = (): number | undefined => {
    skip()
    const m = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i.exec(d.slice(pos))
    if (!m) return undefined
    pos += m[0].length
    return parseFloat(m[0])
  }
  const flag = (): number | undefined => {
    skip()
    if (d[pos] === '0' || d[pos] === '1') return parseInt(d[pos++], 10)
    return undefined
  }
  let x = 0, y = 0, sx = 0, sy = 0
  let cmd = ''
  for (;;) {
    skip()
    if (pos >= d.length) break
    if (/[a-zA-Z]/.test(d[pos])) cmd = d[pos++]
    else if (cmd === '' || cmd.toLowerCase() === 'z') return { pts, ok: false }
    const lower = cmd.toLowerCase()
    const rel = cmd === lower
    const n = ARGS[lower]
    if (n === undefined) return { pts, ok: false }
    if (lower === 'z') { x = sx; y = sy; continue }
    const a: number[] = []
    for (let k = 0; k < n; k++) {
      const v = lower === 'a' && (k === 3 || k === 4) ? flag() : num()
      if (v === undefined) return { pts, ok: false }
      a.push(v)
    }
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    if (lower === 'h') { x = a[0] + ox; pts.push([x, y]) }
    else if (lower === 'v') { y = a[0] + oy; pts.push([x, y]) }
    else if (lower === 'a') { x = a[5] + ox; y = a[6] + oy; pts.push([x, y]) }
    else {
      for (let k = 0; k < n; k += 2) pts.push([a[k] + ox, a[k + 1] + oy])
      x = a[n - 2] + ox
      y = a[n - 1] + oy
    }
    if (lower === 'm') { sx = x; sy = y; cmd = rel ? 'l' : 'L' }
  }
  return { pts, ok: true }
}

describe('icon set (P0.5)', () => {
  const names = Object.keys(ICONS)

  it('has at least 75 icons', () => {
    expect(names.length).toBeGreaterThanOrEqual(75)
  })

  it.each(names)('%s: path parses and fits 24x24', (name) => {
    const { pts, ok } = points(ICONS[name].path)
    expect(ok).toBe(true)
    expect(pts.length).toBeGreaterThan(1)
    for (const [px, py] of pts) {
      expect(px).toBeGreaterThanOrEqual(0)
      expect(px).toBeLessThanOrEqual(24)
      expect(py).toBeGreaterThanOrEqual(0)
      expect(py).toBeLessThanOrEqual(24)
    }
  })

  it('every icon has a name and a licence source', () => {
    for (const n of names) {
      expect(ICONS[n].name.length).toBeGreaterThan(0)
      expect(ICONS[n].source).toMatch(/License/)
    }
  })

  it('ICON_GROUPS lists every icon exactly once and nothing unknown', () => {
    const seen = Object.values(ICON_GROUPS).flat()
    expect(new Set(seen).size).toBe(seen.length)
    expect([...seen].sort()).toEqual([...names].sort())
  })

  it('lookups behave', () => {
    expect(hasIcon('rocket')).toBe(true)
    expect(hasIcon('nope')).toBe(false)
    expect(getIcon('rocket')?.name).toBe('Rocket')
  })

  it('the original ten icons are unchanged in name', () => {
    for (const n of ['zap', 'shield', 'globe', 'check', 'arrow-right', 'trending-up', 'trending-down', 'users', 'clock', 'alert']) {
      expect(hasIcon(n)).toBe(true)
    }
  })
})

describe('creative CR7a — subject names a model writes', () => {
  it('robot is drawn, and common subject names resolve through the aliases', () => {
    const { getIcon, hasIcon, ICON_ALIASES, ICONS } = require('./index')
    expect(getIcon('robot')?.name).toBe('Robot')
    expect(Object.keys(ICON_ALIASES).filter((a) => ICONS[a])).toEqual([]) // an alias never shadows an icon of its own
    for (const [alias, target] of Object.entries(ICON_ALIASES)) {
      expect(ICONS[target as string]).toBeDefined()
      expect(getIcon(alias)).toBe(ICONS[target as string])
    }
    expect(hasIcon('earth')).toBe(true)
    expect(getIcon('xyzzy')).toBeUndefined()
  })
})

describe('creative CR9 — Phosphor', () => {
  const { getIcon, ICONS, SOLID_ALIASES } = require('./index')
  const { PHOSPHOR_ICONS } = require('./phosphor')

  it('draws the subjects the review found missing, each with a filled weight', () => {
    for (const q of ['x-ray', 'microscope', 'dna', 'sigma', 'integral', 'gavel', 'robot', 'tooth', 'syringe']) {
      expect([q, !!getIcon(q)]).toEqual([q, true])
    }
    for (const q of ['microscope', 'dna', 'sigma', 'gavel', 'robot', 'rocket', 'users', 'bulb']) expect([q, !!getIcon(q)?.solid]).toEqual([q, true])
    expect(getIcon('gavel').filled).toBe(true) // Phosphor regular: a filled shape
    expect(getIcon('rocket').filled).toBeUndefined() // Tabler outline stays the outline
  })

  it('every solid alias names a Phosphor icon; most of the set has a filled weight', () => {
    expect(Object.entries(SOLID_ALIASES).filter(([, v]) => !PHOSPHOR_ICONS[v as string]).map(([k]) => k)).toEqual([])
    const all = Object.values(ICONS) as Array<{ solid?: string }>
    expect(all.length).toBeGreaterThan(1150)
    expect(all.filter((i) => i.solid).length).toBeGreaterThan(600)
  })

  it.each(Object.keys(PHOSPHOR_ICONS))('%s: fill weight parses and fits 24x24', (name) => {
    const { pts, ok } = points(PHOSPHOR_ICONS[name][2])
    expect(ok).toBe(true)
    for (const [px, py] of pts) expect(px >= -0.01 && px <= 24.01 && py >= -0.01 && py <= 24.01).toBe(true)
  })
})
