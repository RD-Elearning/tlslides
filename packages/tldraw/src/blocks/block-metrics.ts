/**
 * LO3 — size cards: per-block planning data for the AI, *sampled from* the layout oracle
 * (`measureBlock`), never hand-authored (`reviews/blocks/layout-oracle/README.md` §LO3).
 *
 * For every registered block: scope/category/layer/kind, the definition's sizes, whether it
 * fills its box, per text slot `{fontSize, lineHeight, charsPerLine@width}`, and a linear height
 * model per reference width, fitted from real layouts of synthetic content:
 *
 *   - text model:  height ≈ base + per · lines   (lines of the block's primary text slot)
 *   - items model: height ≈ base + per · items   (items of its primary list/series slot)
 *   - fixed:       height ≈ base                 (nothing to vary)
 *
 * Every other prop keeps the block's `describe.example` (else `defaults`) value. `err` is the
 * largest |model − measured| over the samples, so a step-shaped block (a grid that adds a row
 * every N items) shows up as a poor fit instead of a confident wrong number. Blocks the oracle
 * cannot measure (html host without a poster, a layout that throws) and blocks that size to
 * their box (`fill`) carry no model — a reason instead.
 *
 * The committed `__generated__/block-metrics.json` is this function's output for the built-in
 * registry; `block-metrics.spec.ts` fails when it is stale. Regenerate with
 * `node tools/layout-report/gen-block-metrics.js`.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import type {
  BlockCategory,
  BlockDefinition,
  BlockKind,
  BlockLayer,
  BlockScope,
  ResolvedTokens,
  SlotSpec,
  SurfaceContext,
} from './types'
import type { BlockRegistry } from './registry'
import { definitionLayer } from './block-layer'
import { resolveTokens } from './tokens'
import { defaultBlockRegistry } from './validate-deck-spec'
import { createLayoutContext } from './layout/layout-child'
import { editorMetrics, type MeasureTextProvider } from './layout/measure'
import { DEFAULT_PROBE_HEIGHT, measureBlock, type BlockMeasure, type TextLeafMeasure } from './layout/measure-block'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Types                                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Reference widths (slide units): full content width, half, third of a 1920 frame. */
export const METRICS_WIDTHS = [1728, 840, 544] as const

/** One text slot of a block, measured on its example content. */
export interface TextSlotMetrics {
  /** Font size and one line's height in slide units, at the middle reference width. */
  fontSize: number
  lineHeight: number
  /** Characters that fit one line, per reference width (`null` = below the block's min width). */
  cpl: Array<number | null>
}

/** A fitted height model at one reference width. */
export interface HeightFit {
  /** height ≈ base + per · x (x = lines or items). */
  base: number
  per: number
  /** Largest |model − measured| over the samples, in slide units. */
  err: number
  /** Sampled x range [min, max]. */
  x: [number, number]
  /** Measured height range [min, max] over the samples. */
  h: [number, number]
  /** `err` > max(8, 5% of the tallest sample): read `h` as a range, not the line as a rule. */
  poor?: true
}

export type HeightModelVar = 'lines' | 'items' | 'fixed'

export interface HeightModel {
  var: HeightModelVar
  /** The prop varied: a text slot for `lines`, a list/series slot for `items`. */
  slot?: string
  /** Keyed by reference width. `null`: below min width, fills its box there, or unmeasurable. */
  at: Record<string, HeightFit | null>
}

export interface BlockMetrics {
  kind: BlockKind
  scope: BlockScope
  category: BlockCategory
  layer: BlockLayer
  size: { preferred: [number, number]; min: [number, number]; aspect?: number }
  /** Sizes to the box it is given (chart, image, donut): no natural height; give it a box. */
  fill: boolean
  /** Text slots keyed by prop path (`items[].title`) or part name. */
  text: Record<string, TextSlotMetrics>
  /** `null` with `note` when there is nothing honest to fit (fill, container, unmeasurable). */
  model: HeightModel | null
  confidence: 'high' | 'medium' | 'low'
  note?: string
}

export interface BlockMetricsFile {
  version: 1
  /** Theme the type scale came from. Sizes scale with the deck theme's type tokens. */
  theme: string
  metrics: 'table'
  widths: number[]
  blocks: Record<string, BlockMetrics>
}

export interface BuildBlockMetricsOptions {
  /** Default `METRICS_WIDTHS`. */
  widths?: readonly number[]
  /** Default: the default deck theme. */
  tokens?: ResolvedTokens
  /** Default `editorMetrics` (= `tableMetrics`, what the editor paints). */
  measureText?: MeasureTextProvider
  /** Only these types. */
  types?: string[]
  /** Label for `theme` in the output. Default `'default'`. */
  themeName?: string
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

const SURFACE: SurfaceContext = { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false }
/** Item counts sampled for an `items` model: from the slot's min (≥1) to its max, capped here. */
const MAX_ITEMS = 8
/** Target line counts for a `lines` model. */
const LINE_TARGETS = [1, 2, 3, 4]
const WORDS = 'growth market launch plan value metric quarter result data team review budget'.split(' ')

const round1 = (v: number) => Math.round(v * 10) / 10

function syntheticText(chars: number): string {
  let s = ''
  let i = 0
  while (s.length < chars) {
    s += (s ? ' ' : '') + WORDS[i % WORDS.length]
    i++
  }
  return s
}

/** `items.3.title` / `item[3].title` → `items[].title` / `item[].title`. */
function slotKey(t: TextLeafMeasure): string | undefined {
  const key = t.propPath ?? t.part
  return key?.replace(/\.\d+(?=\.|$)/g, '[]').replace(/\[\d+\]/g, '[]')
}

function exampleProps(def: BlockDefinition): Record<string, unknown> {
  const ex = def.describe?.example?.props as Record<string, unknown> | undefined
  return { ...(def.defaults as Record<string, unknown>), ...(ex ?? {}) }
}

/** The first required content list/series slot (same rule as the digest's item range). */
function itemsSlot(def: BlockDefinition): { name: string; min: number; max: number } | undefined {
  for (const [name, slot] of Object.entries(def.schema ?? {})) {
    if (slot.role !== 'content' || !slot.required) continue
    const t = slot.type
    if (t.kind === 'list') return { name, min: Math.max(1, t.min ?? 1), max: Math.min(MAX_ITEMS, t.max ?? MAX_ITEMS) }
    if (t.kind === 'series') return { name, min: 1, max: Math.min(MAX_ITEMS, t.max ?? MAX_ITEMS) }
  }
  return undefined
}

function hasBlocksSlot(def: BlockDefinition): boolean {
  return Object.values(def.schema ?? {}).some((s: SlotSpec) => s.type.kind === 'blocks')
}

/** The content text slot with the largest budget (ties: declaration order). */
function textSlot(def: BlockDefinition): { name: string; maxChars?: number } | undefined {
  let best: { name: string; maxChars?: number } | undefined
  let bestBudget = -1
  for (const [name, slot] of Object.entries(def.schema ?? {})) {
    if (slot.role !== 'content') continue
    const t = slot.type
    if (t.kind !== 'text' && t.kind !== 'richText') continue
    const budget = t.maxChars ?? 10000
    if (budget > bestBudget) {
      best = { name, maxChars: t.maxChars }
      bestBudget = budget
    }
  }
  return best
}

/** Least-squares line through (x, h); rounded coefficients, error measured with them. */
function fit(samples: Array<{ x: number; h: number }>): HeightFit {
  const n = samples.length
  const xs = samples.map((s) => s.x)
  const hs = samples.map((s) => s.h)
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const mh = hs.reduce((a, b) => a + b, 0) / n
  let sxx = 0
  let sxh = 0
  for (const s of samples) {
    sxx += (s.x - mx) ** 2
    sxh += (s.x - mx) * (s.h - mh)
  }
  const perRaw = sxx > 0 ? sxh / sxx : 0
  const per = round1(perRaw)
  const base = Math.round(mh - perRaw * mx)
  const err = Math.round(samples.reduce((m, s) => Math.max(m, Math.abs(base + per * s.x - s.h)), 0))
  const hMax = Math.round(Math.max(...hs))
  const out: HeightFit = {
    base,
    per,
    err,
    x: [Math.min(...xs), Math.max(...xs)],
    h: [Math.round(Math.min(...hs)), hMax],
  }
  if (err > Math.max(8, hMax * 0.05)) out.poor = true
  return out
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* buildBlockMetrics                                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Size cards for every block in `registry` (default: the built-in registry), sorted by type. */
export function buildBlockMetrics(registry?: BlockRegistry, opts: BuildBlockMetricsOptions = {}): BlockMetricsFile {
  const reg = registry ?? defaultBlockRegistry()
  const widths = [...(opts.widths ?? METRICS_WIDTHS)]
  const tokens = opts.tokens ?? resolveTokens(DEFAULT_DECK_THEME)
  const measureText = opts.measureText ?? editorMetrics
  const blocks: Record<string, BlockMetrics> = {}
  const defs = reg
    .list()
    .filter((d) => !opts.types || opts.types.includes(d.type))
    .sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0))
  for (const def of defs) blocks[def.type] = blockMetrics(def, reg, widths, tokens, measureText)
  return { version: 1, theme: opts.themeName ?? 'default', metrics: 'table', widths, blocks }
}

function blockMetrics(
  def: BlockDefinition,
  registry: BlockRegistry,
  widths: number[],
  tokens: ResolvedTokens,
  measureText: MeasureTextProvider
): BlockMetrics {
  const intrinsicSizeCache = new Map()
  const ctxAt = (width: number) =>
    createLayoutContext({
      box: { width, height: def.size.preferred[1] },
      tokens,
      surface: SURFACE,
      registry,
      measureText,
      intrinsicSizeCache,
    })
  const props = exampleProps(def)
  const usable = widths.map((w) => w >= def.size.min[0])
  // The example at each usable width (natural height + elastic check at the preferred height).
  const example: Array<BlockMeasure | null> = widths.map((w, i) =>
    usable[i] ? measureBlock(def, props, w, ctxAt(w)) : null
  )

  const card: BlockMetrics = {
    kind: def.kind ?? 'layout',
    scope: def.scope ?? 'element',
    category: def.category ?? 'structure',
    layer: definitionLayer(def),
    size: {
      preferred: [...def.size.preferred] as [number, number],
      min: [...def.size.min] as [number, number],
      ...(def.size.aspect !== undefined ? { aspect: def.size.aspect } : {}),
    },
    // Fills its box at every usable width. A block elastic at only some widths keeps a model
    // with `null` at those widths (e.g. a quote that clamps at its preferred height when narrow).
    fill: example.every((m) => !m || m.elastic),
    text: {},
    model: null,
    confidence: 'high',
  }

  // Confidence: the worst of the example measures.
  const rank = { high: 0, medium: 1, low: 2 } as const
  for (const m of example) {
    if (m && rank[m.confidence] > rank[card.confidence]) {
      card.confidence = m.confidence
      if (m.reason) card.note = m.reason
    }
  }
  if (!example.some(Boolean)) {
    card.note = `min width ${def.size.min[0]} is wider than every reference width`
    return card
  }

  // Text slots, from the example.
  const mid = Math.min(1, widths.length - 1)
  const textRef = example[mid] ?? example.find(Boolean)!
  for (const t of textRef.text) {
    const key = slotKey(t)
    if (!key || card.text[key]) continue
    card.text[key] = {
      fontSize: round1(t.fontSize),
      lineHeight: round1(t.lineHeight),
      cpl: example.map((m) => {
        const leaf = m?.text.find((x) => slotKey(x) === key)
        return leaf ? leaf.charsPerLine : null
      }),
    }
  }

  if (card.confidence === 'low') {
    card.note = card.note ?? 'not measurable'
    return card
  }
  if (card.fill) {
    card.note = 'fills its box: give it a region height, it has no natural height'
    return card
  }
  const elasticAt = widths.filter((_, i) => example[i]?.elastic)
  if (elasticAt.length) card.note = `fills its box at width ${elasticAt.join(', ')}: no model there`

  // Which prop to vary.
  const items = itemsSlot(def)
  const text = items ? undefined : textSlot(def)
  const varName: HeightModelVar = items ? 'items' : text ? 'lines' : 'fixed'
  if (varName === 'fixed' && hasBlocksSlot(def)) {
    card.note = 'container: height = its padding + its children'
    return card
  }

  const model: HeightModel = { var: varName, ...(items ? { slot: items.name } : text ? { slot: text.name } : {}), at: {} }
  widths.forEach((w, i) => {
    const ex = example[i]
    if (!ex || ex.elastic) {
      model.at[String(w)] = null
      return
    }
    const ctx = ctxAt(w)
    const measureAt = (p: Record<string, unknown>) =>
      // Known non-elastic: the tall probe alone is the natural height (no fill probe).
      measureBlock(def, p, w, ctx, { height: DEFAULT_PROBE_HEIGHT })
    const samples: Array<{ x: number; h: number }> = []
    if (items) {
      const base = props[items.name]
      const src = Array.isArray(base) && base.length ? base : undefined
      if (!src) {
        model.at[String(w)] = null
        return
      }
      for (let n = items.min; n <= items.max; n++) {
        const list = Array.from({ length: n }, (_, k) => src[k % src.length])
        const m = measureAt({ ...props, [items.name]: list })
        if (m.confidence !== 'low') samples.push({ x: n, h: m.natural.height })
      }
    } else if (text) {
      const leafOf = (m: BlockMeasure) => m.text.filter((t) => t.propPath === text.name || (!t.propPath && t.part === text.name))
      const exLeaves = leafOf(ex)
      const cpl = exLeaves[0]?.charsPerLine || 40
      const seen = new Set<number>()
      for (const k of LINE_TARGETS) {
        let chars = Math.max(4, Math.round(cpl * (k - 0.5)))
        if (text.maxChars !== undefined) chars = Math.min(chars, text.maxChars)
        const m = measureAt({ ...props, [text.name]: syntheticText(chars) })
        const leaves = leafOf(m)
        if (!leaves.length || m.confidence === 'low') continue
        const lines = leaves.reduce((n, t) => n + t.lines, 0)
        if (seen.has(lines)) continue
        seen.add(lines)
        samples.push({ x: lines, h: m.natural.height })
      }
      if (!samples.length) {
        // The varied slot paints no tracked leaf (no propPath/part): fall back to the example.
        samples.push({ x: 1, h: ex.natural.height })
        model.var = 'fixed'
        delete model.slot
      }
    } else {
      samples.push({ x: 0, h: ex.natural.height })
    }
    model.at[String(w)] = samples.length ? fit(samples) : null
  })
  card.model = model
  return card
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Serialisation + digest hint                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Compact, diff-friendly JSON: one block per line. */
export function stringifyBlockMetrics(file: BlockMetricsFile): string {
  const head = JSON.stringify({ ...file, blocks: undefined })
  const lines = Object.entries(file.blocks).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
  return `${head.slice(0, -1)},\n  "blocks": {\n${lines.join(',\n')}\n  }\n}\n`
}

/**
 * Terse size hint for the digest index, at `width` (default 840): `h≈96+72/L@840` (lines),
 * `h≈160+110/item@840` (items), `h≈120@840` (fixed), `h 180–420@840` (poor fit: the sampled
 * range), `h=fill` (sizes to its box). `undefined` when there is no honest number.
 */
export function sizeHint(card: BlockMetrics | undefined, width = 840): string | undefined {
  if (!card) return undefined
  if (card.fill) return 'h=fill'
  if (!card.model) return undefined
  const ws = Object.keys(card.model.at).map(Number)
  const w = card.model.at[String(width)] ? width : ws.find((x) => card.model!.at[String(x)])
  if (w === undefined) return undefined
  const f = card.model.at[String(w)]!
  if (f.poor) return `h ${f.h[0]}–${f.h[1]}@${w}`
  if (card.model.var === 'fixed' || f.per === 0) return `h≈${f.base}@${w}`
  const unit = card.model.var === 'lines' ? 'L' : 'item'
  return `h≈${f.base}${f.per < 0 ? '' : '+'}${Math.round(f.per)}/${unit}@${w}`
}

/** `sizeHint` for every card that has one, keyed by type (what the digest index prints). */
export function blockSizeHints(file: BlockMetricsFile, width = 840): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [type, card] of Object.entries(file.blocks)) {
    const hint = sizeHint(card, width)
    if (hint) out[type] = hint
  }
  return out
}

/** The generated `__generated__/block-size-hints.ts` module (the digest cannot import JSON:
 *  the package's composite tsconfig only lists `.ts` files). */
export function stringifySizeHints(hints: Record<string, string>): string {
  const lines = Object.entries(hints).map(([k, v]) => `  '${k}': '${v}',`)
  return [
    '/**',
    ' * GENERATED by `node tools/layout-report/gen-block-metrics.js` from `buildBlockMetrics()` — do not edit.',
    ' * LO3 size hints for the capability-digest index (`sizeHint` at width 840); the full size cards',
    ' * are `block-metrics.json` next to this file. `block-metrics.spec.ts` fails when either is stale.',
    ' */',
    'export const BLOCK_SIZE_HINTS: Record<string, string> = {',
    ...lines,
    '}',
    '',
  ].join('\n')
}
