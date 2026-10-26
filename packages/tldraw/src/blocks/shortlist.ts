/**
 * spro creative CR2 — the shortlist (PLAN §6.6): rank the whole catalog for one slide from its
 * content signals (relations, item count, data, text load, energy, frame role, look family),
 * then pick a diverse set (MMR over block kinds): the 8 best, 2 stretch candidates and the
 * `composition` option. It advises the director; it is not a fence. Pure and deterministic for a
 * seed.
 */

import type { BlockDefinition, BlockFits, FitsData, FitsEnergy, FitsTextLoad, FrameRole, LookFamily, Relation } from './types'

export type Creativity = 'safe' | 'balanced' | 'bold'
type Asset = NonNullable<BlockFits['needs']>[number]

export interface ShortlistSlide {
  key?: string
  /** The outline's relations, best first (1–3). */
  relations: Relation[]
  /** How many items the slide shows (points, steps, numbers…). */
  items?: number
  data?: FitsData
  textLoad?: FitsTextLoad
  energy?: FitsEnergy
  /** Set for a frame slide: only frame blocks of that role are ranked. */
  frame?: FrameRole
}

export interface ShortlistOptions {
  family?: LookFamily
  creativity?: Creativity
  /** Main types already planned in the deck (they lose a little, so the deck varies). */
  used?: string[]
  /** Types the person saw lately (their recent fingerprints): a small penalty. */
  avoid?: string[]
  /** Types the style never uses (`styleRules.avoid`): excluded. */
  exclude?: string[]
  /** What the material has; a block that needs a missing asset is excluded. Absent = all present. */
  assets?: Partial<Record<Asset, boolean>>
  seed?: string
  /** Best candidates (default 8) and stretch candidates (default 2). */
  best?: number
  stretch?: number
}

export interface ShortlistEntry {
  type: string
  score: number
  /** Why it is here, in a few words. */
  reason: string
  /** Its variant preset ids. */
  variants: string[]
  /** The item count it shows well. */
  items?: [number, number]
  stretch?: true
}

const RELATION_FIT = [1, 0.6, 0.3]
const SLIDE_WEIGHT = [1, 0.8, 0.6]
const LOADS: FitsTextLoad[] = ['labels', 'lines', 'paragraphs']
const CHART_DATA = new Set<FitsData>(['series', 'table', 'share'])

/** The visual kind of a block, for diversity: two charts or two diagrams are near each other. */
export function blockKind(def: BlockDefinition): string {
  const c = def.category ?? ''
  if (c === 'chart' || c === 'table') return 'chart'
  if (c === 'metric') return 'number'
  if (['process', 'timeline', 'hierarchy', 'relationship'].includes(c)) return 'diagram'
  if (c === 'comparison') return def.type.startsWith('tls.g.') ? 'diagram' : 'composite'
  if (c === 'media' || c === 'brand') return 'media'
  if (c === 'people') return 'people'
  if (c === 'list') return def.type.startsWith('tls.c.') ? 'composite' : 'text'
  if (['text', 'heading', 'emphasis', 'learning'].includes(c)) return 'text'
  return c || 'other'
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967296
}

interface Scored {
  def: BlockDefinition
  score: number
  relationRank: number
  reason: string
}

function relationScore(slide: Relation[], block: Relation[]): { fit: number; rank: number; rel?: Relation } {
  let best = { fit: 0, rank: 9, rel: undefined as Relation | undefined }
  slide.slice(0, 3).forEach((r, i) => {
    const p = block.indexOf(r)
    if (p < 0) return
    const fit = SLIDE_WEIGHT[i] * RELATION_FIT[Math.min(p, 2)]
    if (fit > best.fit) best = { fit, rank: p, rel: r }
  })
  return best
}

function scoreOne(def: BlockDefinition, slide: ShortlistSlide, o: ShortlistOptions): Scored | null {
  const f = def.fits
  if (!f || def.editorOnly) return null
  if (o.exclude?.includes(def.type)) return null
  for (const n of f.needs ?? []) if (o.assets && o.assets[n] === false) return null
  if (slide.frame) {
    if (!f.frames?.includes(slide.frame)) return null
  } else if (!f.relations.length) return null

  const why: string[] = []
  let score: number
  let rank = 0
  if (slide.frame) {
    score = 0.8 + (f.frames!.indexOf(slide.frame) === 0 ? 0.2 : 0)
    why.push(`a ${slide.frame} block`)
    const rel = relationScore(slide.relations, f.relations)
    if (rel.fit) score += 0.2 * rel.fit
  } else {
    const rel = relationScore(slide.relations, f.relations)
    if (!rel.fit) return null
    score = rel.fit
    rank = rel.rank
    why.push(`shows ${rel.rel}`)
  }
  // data: a series needs a chart-capable block; no data → no chart
  const data = slide.data ?? 'none'
  const bd = f.data ?? 'none'
  if (data === 'none' && CHART_DATA.has(bd)) return null
  if ((data === 'series' || data === 'table') && !CHART_DATA.has(bd)) score *= 0.75
  if (data !== 'none' && bd === data) {
    score *= 1.15
    why.push(`draws a ${data}`)
  }
  if (data === 'share' && bd !== 'share' && bd !== 'none') score *= 0.85
  // items
  if (slide.items && f.items) {
    const [lo, hi] = f.items
    if (slide.items < lo || slide.items > hi) score *= slide.items < lo - 1 || slide.items > hi + 2 ? 0.4 : 0.7
    else why.push(`${slide.items} items fit`)
  }
  // text load
  if (slide.textLoad) {
    const d = Math.abs(LOADS.indexOf(slide.textLoad) - LOADS.indexOf(f.textLoad))
    score *= [1, 0.75, 0.45][d]
  }
  // family and energy
  if (o.family && f.families && !f.families.includes(o.family)) score *= 0.6
  if (slide.energy && slide.energy !== f.energy) score *= slide.energy === 'neutral' || f.energy === 'neutral' ? 0.92 : 0.8
  // the curated core (tier 1) wins a tie: its blocks are the best default of their kind
  if (def.aiTier === 1) score *= 1.03
  // variety and novelty
  if (o.used?.includes(def.type)) {
    score *= 0.7
    why.push('used before in the deck')
  }
  if (o.avoid?.includes(def.type)) score *= 0.85
  return { def, score, relationRank: rank, reason: why.join(', ') }
}

/** Rank the catalog for one slide and pick a diverse shortlist. */
export function shortlist(defs: readonly BlockDefinition[], slide: ShortlistSlide, o: ShortlistOptions = {}): ShortlistEntry[] {
  const seed = o.seed ?? slide.key ?? ''
  const creativity = o.creativity ?? 'balanced'
  const scored = defs
    .map((d) => scoreOne(d, slide, o))
    .filter((x): x is Scored => !!x)
    // a hair of seeded noise breaks ties the same way every time for this seed
    .map((x) => ({ ...x, score: x.score + hash(`${seed}|${x.def.type}`) * 1e-3 }))
    .sort((a, b) => b.score - a.score)
  const nBest = o.best ?? 8
  const nStretch = o.stretch ?? 2
  // MMR over block kinds: the next pick trades its score against looking like what is already in
  const lambda = creativity === 'safe' ? 0.85 : creativity === 'bold' ? 0.6 : 0.72
  const picked: Scored[] = []
  const pool = [...scored]
  while (picked.length < nBest && pool.length) {
    let bi = 0
    let bv = -Infinity
    pool.forEach((c, i) => {
      const kind = blockKind(c.def)
      const sim = picked.filter((p) => blockKind(p.def) === kind).length
      const v = lambda * c.score - (1 - lambda) * Math.min(1, sim * 0.5)
      if (v > bv) {
        bv = v
        bi = i
      }
    })
    picked.push(pool.splice(bi, 1)[0])
  }
  // stretch: a secondary fit or a rarely used block the director may not think of
  const stretchW = creativity === 'bold' ? 1.3 : creativity === 'safe' ? 0.8 : 1
  const stretch = pool
    .filter((c) => c.relationRank > 0 || c.def.aiTier === 2)
    .map((c) => ({ ...c, score: c.score * stretchW }))
    .sort((a, b) => b.score - a.score)
    .slice(0, nStretch)
  const entry = (c: Scored, isStretch = false): ShortlistEntry => ({
    type: c.def.type,
    score: Math.round(c.score * 1000) / 1000,
    reason: c.reason || 'fits the slide',
    variants: (c.def.variants ?? []).map((v) => v.id),
    ...(c.def.fits?.items ? { items: c.def.fits.items } : {}),
    ...(isStretch ? { stretch: true as const } : {}),
  })
  const out = [...picked.map((c) => entry(c)), ...stretch.map((c) => entry(c, true))]
  if (!slide.frame) out.push({ type: 'composition', score: 0, reason: 'cards and atoms arranged in a row, grid or split', variants: [] })
  return out
}
