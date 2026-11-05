/**
 * spro sprint 2026-11b S05-A — the static text budget table: how many characters each text slot of
 * a rankable block holds at four region sizes, in Vietnamese and English.
 *
 * For every block with a fits row (never the editor-only ones), its `describe.example` is placed as
 * a free block in a box of each region class and rewritten in the target language with the content
 * stress word source (`contentStress.ts`). Short slots (titles, labels, values — `SHORT_FIELD`) keep
 * their example length; the long ones (descriptions, body, items) grow together by one factor until
 * the oracle reports an overflow or a cut. A slot's `fit` is its example length × the largest clean
 * factor (per item for list items). The composer gets these as advice (S05-a); the measured fill of a
 * slide's real boxes (S05-B) is the rule.
 *
 * Measured in one style (`minimal`, the catalog's neutral face) on purpose: the table is a writing
 * target, not a guarantee. Pure, deterministic; a build-time generator writes
 * `__generated__/text-budgets.json` (tools/text-budgets/cli.js).
 */
import { analyzeDeck } from '../layout-report'
import type { BlockRegistry } from '../registry'
import { getDeckStyle } from '../styles'
import type { BlockSpec, DeckSpec, SlotSpec, SlotType } from '../types'
import { STRESS_TEXT, plainText, type StressLang } from './contentStress'

export type RegionClass = 'full' | 'half' | 'third' | 'band'

/** Content-area boxes of the region classes (slide units on 1920 × 1080). */
export const REGION_CLASSES: Record<RegionClass, { width: number; height: number }> = {
  full: { width: 1728, height: 800 },
  half: { width: 840, height: 800 },
  third: { width: 552, height: 800 },
  band: { width: 1728, height: 380 },
}

/** Slot (field) names that stay short whatever the room: they name, they do not explain. */
export const SHORT_FIELD = /^(title|label|heading|name|term|kicker|badge|value|number|unit|tag|icon|eyebrow|year|date|when|step|prefix|suffix|caption|subtitle|role|period|price|metric|delta|source|attribution|cta|button|url|alt|emoji|mark|lead|left|right|before|after|from|to|status)$/i

/** spro `type_floors` body (learning L01): a text that shrinks below it no longer "fits". Leaves under 8
 *  characters (numbers, units) are exempt, as in the gate's min-type rule. */
export const READING_FLOOR = 24

const OVERFLOW_CODES = new Set(['content/overflow', 'text/overflow', 'text/truncated', 'slide/overflow', 'region/overflow'])

export interface SlotBudget {
  /** Example length in the target language (characters). */
  base: number
  /** Most characters it holds at the class box; equals `base` for a short slot. */
  fit: number
  short: boolean
  /** Schema `maxChars` (the short slots' only budget). */
  max?: number
}

export interface BlockBudget {
  type: string
  cls: RegionClass
  lang: StressLang
  /** Items in the example (the first list slot), 0 = no list. */
  items: number
  /** `null` = the example itself does not lay out clean at this box (do not use the block here). */
  slots: Record<string, SlotBudget> | null
  /** The largest clean growth factor of the long slots (1 when there is none). */
  factor: number
}

export interface Leaf {
  /** `items[].text`, `body`. */
  key: string
  path: Array<string | number>
  rich: boolean
  short: boolean
  base: string
  /** The slot's schema `maxChars`, when it has one. */
  max?: number
}

/** Every content text leaf of a block's props, with the schema key it belongs to. */
export function leaves(props: Record<string, unknown>, schema: Record<string, SlotSpec>): Leaf[] {
  const out: Leaf[] = []
  const visit = (v: unknown, t: SlotType, key: string, field: string, path: Array<string | number>) => {
    if (t.kind === 'text' || t.kind === 'richText') {
      const s = plainText(v)
      if (s && /\p{L}{2}/u.test(s)) out.push({ key, path, rich: t.kind === 'richText' || (typeof v === 'object' && v !== null), short: SHORT_FIELD.test(field), base: s, ...(t.maxChars ? { max: t.maxChars } : {}) })
    } else if (t.kind === 'list' && Array.isArray(v)) {
      v.forEach((x, i) => visit(x, t.of, `${key}[]`, field, [...path, i]))
    } else if (t.kind === 'object' && v && typeof v === 'object') {
      for (const [k, f] of Object.entries(t.fields)) {
        if (f.role !== 'content') continue
        visit((v as Record<string, unknown>)[k], f.type, `${key}.${k}`, k, [...path, k])
      }
    }
  }
  for (const [k, slot] of Object.entries(schema)) {
    if (slot.role !== 'content' || props[k] === undefined) continue
    visit(props[k], slot.type, k, k, [k])
  }
  return out
}

export function setAt(o: Record<string, unknown>, path: Array<string | number>, value: unknown): void {
  let cur: Record<string | number, unknown> = o
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] as Record<string | number, unknown>
  cur[path[path.length - 1]] = value
}

/** Whole words of `lang`, as close to `chars` as they allow (never empty); starts at `at`. */
function words(lang: StressLang, chars: number, at: number): string {
  const w = STRESS_TEXT[lang]
  const out: string[] = []
  let i = at
  do out.push(w[i++ % w.length].replace(/[.,]$/, ''))
  while (out.join(' ').length < chars)
  if (out.length > 1 && out.join(' ').length - chars > chars - out.slice(0, -1).join(' ').length) out.pop()
  const s = out.join(' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function rewrite(block: BlockSpec, ls: Leaf[], lang: StressLang, factor: number): BlockSpec {
  const b = JSON.parse(JSON.stringify(block)) as BlockSpec
  const props = (b.props ?? {}) as Record<string, unknown>
  ls.forEach((l, i) => {
    const n = Math.max(1, Math.round(l.base.length * (l.short ? 1 : factor)))
    const s = words(lang, n, i * 7)
    setAt(props, l.path, l.rich ? { runs: [{ text: s }] } : s)
  })
  return { ...b, props }
}

/** Text sizes by leaf (`propPath`/`part`, else its index): what a later layout may not shrink below. */
export type LeafSizes = Map<string, number>

const leafKey = (t: { propPath?: string; part?: string }, i: number) => t.propPath ?? t.part ?? `#${i}`

/**
 * One block alone at `box` in `deck`'s style: `ok` when it lays out without an overflow, a cut, or a
 * text leaf shrunk below both its size in `base` (the same block at its own text) and the reading floor
 * — blocks that fit by shrinking their type never overflow. Returns the leaf sizes for a `base`.
 */
export function layoutOk(deck: DeckSpec, block: BlockSpec, box: { x: number; y: number; width: number; height: number }, registry: BlockRegistry, base?: LeafSizes): { ok: boolean; sizes: LeafSizes } {
  const solo: DeckSpec = { ...deck, slides: [{ id: 'fit', layout: 'blank', regions: {}, free: [{ block: { ...block, id: 'b' }, box }] }] } as DeckSpec
  const [r] = analyzeDeck(solo, { registry, llmAuthored: true })
  const b = r.blocks.find((x) => x.id === 'b')
  const sizes: LeafSizes = new Map()
  if (!b) return { ok: false, sizes }
  b.text.forEach((t, i) => sizes.set(leafKey(t, i), t.fontSize * (t.scale || 1)))
  if (r.findings.some((f) => f.severity !== 'info' && OVERFLOW_CODES.has(f.code) && f.blockIds.includes('b'))) return { ok: false, sizes }
  if (b.text.some((t) => t.truncated)) return { ok: false, sizes }
  if (b.contentOverflow.dx > 1 || b.contentOverflow.dy > 1) return { ok: false, sizes }
  if (base) {
    for (const [k, size] of sizes) {
      const was = base.get(k)
      if (was !== undefined && size < Math.min(was, READING_FLOOR) - 0.5) return { ok: false, sizes }
    }
  }
  return { ok: true, sizes }
}

function measureDeck(): DeckSpec {
  const style = getDeckStyle('minimal')!
  return { version: 1, id: 'budget', title: 'budget', theme: style.palettes[0].id, style: style.id, aspect: 'widescreen', slides: [] } as DeckSpec
}

const MAX_FACTOR = 32

/** One block at one class and language (≈ 7 oracle runs). */
export function blockBudget(type: string, cls: RegionClass, lang: StressLang, registry: BlockRegistry): BlockBudget | null {
  const def = registry.get(type)
  const example = def?.describe?.example
  if (!def || !example) return null
  const ls = leaves((example.props ?? {}) as Record<string, unknown>, def.schema as Record<string, SlotSpec>)
  if (!ls.length) return null
  const firstList = Object.entries(def.schema as Record<string, SlotSpec>).find(([k, s]) => s.type.kind === 'list' && Array.isArray((example.props as Record<string, unknown>)?.[k]))
  const items = firstList ? ((example.props as Record<string, unknown[]>)[firstList[0]]).length : 0
  // base lengths in the target language (the example rewritten at factor 1)
  const deck = measureDeck()
  const box = { x: 96, y: 184, ...REGION_CLASSES[cls] }
  const first = layoutOk(deck, rewrite(example, ls, lang, 1), box, registry)
  if (!first.ok) return { type, cls, lang, items, slots: null, factor: 0 }
  const ok = (k: number) => layoutOk(deck, rewrite(example, ls, lang, k), box, registry, first.sizes).ok
  let lo = 1
  let hi = MAX_FACTOR
  if (ls.some((l) => !l.short)) {
    let probe = 2
    while (probe <= MAX_FACTOR && ok(probe)) {
      lo = probe
      probe *= 2
    }
    hi = Math.min(probe, MAX_FACTOR)
    if (lo < hi) {
      while (hi / lo > 1.12) {
        const mid = (lo + hi) / 2
        if (ok(mid)) lo = mid
        else hi = mid
      }
    }
  }
  const slots: Record<string, SlotBudget> = {}
  for (const l of ls) {
    const base = Math.max(1, l.base.length)
    const fit = l.short ? base : Math.floor(base * lo)
    const prev = slots[l.key]
    // list items: the smallest item's budget is the per-item budget
    if (!prev || fit < prev.fit) slots[l.key] = { base, fit, short: l.short, ...(l.max ? { max: l.max } : {}) }
  }
  return { type, cls, lang, items, slots, factor: Math.round(lo * 100) / 100 }
}

/** The whole table: every type in `types` × class × language. */
export function textBudgets(types: readonly string[], registry: BlockRegistry, classes: readonly RegionClass[] = ['full', 'half', 'third', 'band'], langs: readonly StressLang[] = ['vi', 'en']): BlockBudget[] {
  const out: BlockBudget[] = []
  for (const t of types) for (const c of classes) for (const l of langs) {
    const b = blockBudget(t, c, l, registry)
    if (b) out.push(b)
  }
  return out
}

/** One line of advice for the compose kit: `per item: title 12–28 chars, text 140–260 chars`. */
export function budgetLine(b: BlockBudget, band: [number, number]): string {
  if (!b.slots) return 'does not fit this region'
  const parts = Object.entries(b.slots).map(([k, s]) => {
    const name = k.replace(/^[^.]*\[\]\.?/, '') || k.replace(/\[\]$/, '')
    if (s.short) return s.max ? `${name} ≤ ${s.max} chars` : ''
    return `${name} ${Math.round(s.fit * band[0])}–${Math.round(s.fit * band[1])} chars`
  })
  return (b.items ? `per item (at ${b.items} items; fewer when there are more): ` : '') + parts.filter(Boolean).join(', ')
}
