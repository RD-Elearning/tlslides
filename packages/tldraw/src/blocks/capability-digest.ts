/**
 * Q19 + R7 — the AI capability digest v2: a markdown (and structured) description of every block type,
 * slide layout, color role, style vocabulary, and motion preset available to a model, generated
 * from `BUILT_IN_BLOCKS` and `SLIDE_LAYOUTS` so it can never drift from the library the way a
 * hand-written copy would within a sprint (`06-slide-composition.md` §6.7 point 1 /
 * `BACKLOG-demo.md` §2.5 decision 1).
 *
 * The block list, their slots, and the layout → region-name table are all *read back* from
 * the live registry and from actually calling each layout's `compile()` — nothing here is a
 * hand-maintained copy of what the library contains.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`, no network.
 */

import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import type { BlockRegistry } from './registry'
import { SLIDE_LAYOUTS } from './slide-layouts'
import { resolveTokens } from './tokens'
import { defaultBlockRegistry } from './validate-deck-spec'
import type { BlockCategory, BlockDefinition, BlockScope, ColorRole, ResolvedTokens, SlotSpec, SlotType } from './types'
import type { BlockLayer } from './types'
import { BLOCK_CATEGORIES, CATEGORY_INFO } from './types'
import { definitionLayer } from './block-layer'
import { ICONS } from './icons'
import { MOTION_PRESETS, PRESET_IDS } from './motion/presets'
import { DURATION_TOKENS } from './motion/tokens'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Public types                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface CapabilitySlotDigest {
  name: string
  role: 'content' | 'option'
  required: boolean
  /** Human-readable type + budget, e.g. 'richText (max 300 chars)'. */
  type: string
  label: string
  help?: string
  guidance?: string
}

export interface CapabilityBlockDigest {
  type: string
  name: string
  family: string
  kind?: string
  summary: string
  keywords: string[]
  slots: CapabilitySlotDigest[]
  /** For html-kind blocks: the data-part attribute names declared in the template. */
  parts?: string[]
  /** R7: when to use this block (from block definition). */
  when?: string
  /** R7: when NOT to use this block. */
  avoid?: string
  /** R7: a filled example BlockSpec. */
  example?: unknown
  /** LO2: paint layer, only when not `content`. */
  layer?: BlockLayer
}

/** One entry of the compact catalog index (tier 1 of the two-tier digest). */
export interface CapabilityIndexEntry {
  type: string
  category: BlockCategory
  scope: BlockScope
  /** Item range from the first content `list`/`series` slot, e.g. '3–8 items' or '≤6 items'. Absent when none. */
  range?: string
  shortDescription: string
  related?: string[]
  /** LO2: paint layer, only when not `content`. */
  layer?: BlockLayer
}

export interface CapabilityIndexOptions {
  categories?: BlockCategory[]
  scopes?: BlockScope[]
}

export interface CapabilityDetailOptions {
  /** Only these block types. When any option is given, the markdown contains the block detail only. */
  types?: string[]
  categories?: BlockCategory[]
}

export interface CapabilityLayoutDigest {
  id: string
  name: string
  /** Region names, read back from actually calling `compile()` at a 1920×1080 reference frame. */
  regions: string[]
}

export interface CapabilityMotionDigest {
  id: string
  family: string
  defaultDurationMs: number
  triggers: string[]
  staggerMs?: number
  isChained?: boolean
  chain?: string[]
  isAmbient?: boolean
}

export interface CapabilityColorRoleDigest {
  id: ColorRole
  description: string
}

export interface CapabilityStyleDigest {
  fields: string[]
  gradient: string
}

export interface CapabilityDigest {
  blocks: CapabilityBlockDigest[]
  layouts: CapabilityLayoutDigest[]
  colorRoles: CapabilityColorRoleDigest[]
  style: CapabilityStyleDigest
  motion: CapabilityMotionDigest[]
  /** A compact, valid worked example slide (`BACKLOG-demo.md` §2.4). */
  example: unknown
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Reference frame for deriving layout region tables                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

const REFERENCE_FRAME = { width: 1920, height: 1080 }

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Color role descriptions                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

const COLOR_ROLE_DESCRIPTIONS: Record<ColorRole, string> = {
  surface: 'Default background fill; resolved from theme.',
  surfaceAlt: 'Slightly tinted surface for alternating rows or cards.',
  accent: 'Primary brand accent for buttons, links, highlights.',
  accent2: 'Secondary accent for charts, secondary emphasis.',
  text: 'Primary text colour; contrast-solved against the surface (≥ 4.5:1).',
  textMuted: 'Secondary text colour for captions, footnotes; contrast-solved (≥ 4.5:1).',
  positive: 'Green status colour for growth, success, positive deltas.',
  negative: 'Red status colour for decline, errors, negative deltas.',
  warning: 'Amber status colour for caution, in-progress, mixed results.',
  neutral: 'Grey status colour for neutral or unavailable data.',
  line: 'Hairlines, dividers, gridlines; contrast-solved (≥ 1.4:1).',
  scrim: 'Dark overlay for text over images; semi-transparent black wash.',
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Motion family classification                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

function classifyMotionPreset(id: string): string {
  if (id === 'none') return 'none'
  if (id === 'ken-burns') return 'ambient'
  if (
    id === 'fade' || id === 'fade-up' || id === 'fade-down' || id === 'stagger-lines' ||
    id === 'stagger-children' || id === 'stagger-grid' || id === 'words-in' ||
    id === 'reveal-down' || id === 'sweep-nodes' || id === 'split-in' || id === 'field-in'
  ) return 'text-reveal'
  if (id === 'pop' || id === 'pop-points') return 'badge'
  if (id === 'wipe-x' || id === 'wipe-y' || id === 'wipe-down' || id === 'mask-reveal') return 'panel-reveal'
  if (id === 'grow-bars-x' || id === 'grow-bars-y' || id === 'grow-segments' || id === 'count-up') return 'card-resize'
  if (id === 'draw-path' || id === 'draw-axis-then-nodes' || id === 'sweep' || id === 'grow-branches') return 'success-check'
  return 'composite'
}

function getActiveMs(presetId: string): number {
  const preset = MOTION_PRESETS[presetId]
  if (!preset) return 0
  const baseDuration = DURATION_TOKENS[preset.duration] ?? 0
  // For chained presets, sum the actual sub-preset durations (R6 real values).
  if (preset.isChained && preset.chain) {
    return preset.chain.reduce((sum, subId) => {
      const sub = MOTION_PRESETS[subId]
      return sum + (sub ? DURATION_TOKENS[sub.duration] ?? 0 : baseDuration)
    }, 0)
  }
  return baseDuration
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Layout "use when" descriptions                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

const LAYOUT_USE_WHEN: Record<string, string> = {
  title: 'Centered title + subtitle, ideal for simple title slides.',
  section: 'Large title + small subtitle for section dividers.',
  'two-column': 'Left/right split with a title bar — the workhorse layout.',
  'three-column': 'Equal thirds with a title bar — comparison or feature lists.',
  'four-up': '2×2 grid with a title bar — feature matrices, quadrants.',
  'image-left': 'Image (60%) left, text (40%) right — photo + caption.',
  'image-right': 'Text (40%) left, image (60%) right — text-first image support.',
  'image-top': 'Image (60%) top, text (40%) bottom — hero image layout.',
  'image-bottom': 'Text (40%) top, image (60%) bottom — caption-over-image.',
  'grid-3x2': '3 columns × 2 rows — gallery, feature cards.',
  'grid-2x3': '2 columns × 3 rows — compact data grid.',
  comparison: 'Two equal columns for side-by-side comparison.',
  timeline: 'Full-width horizontal timeline area with title.',
  quote: 'Narrowed centered quote with attribution — testimonial slides.',
  'kpi-row': 'Title + 4 equal KPI cells — dashboard-style metrics.',
  blank: 'Single content region, full safe area — maximum flexibility.',
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Data                                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Structured capability data, derived from `registry` (default: `BUILT_IN_BLOCKS`) and from
 * `SLIDE_LAYOUTS`. Never hand-written — see this module's header comment.
 */
export function capabilityDigestData(registry?: BlockRegistry, opts?: CapabilityDetailOptions): CapabilityDigest {
  const reg = registry ?? defaultBlockRegistry()

  // Only the *shape* of the resolved tokens matters here (which region keys a layout
  // produces), not their values, so the default theme with no overrides is sufficient and
  // keeps this function independent of any particular deck.
  let tokens: ResolvedTokens | undefined
  try {
    tokens = resolveTokens(DEFAULT_DECK_THEME)
  } catch {
    tokens = undefined
  }

  const blocks: CapabilityBlockDigest[] = filterDefinitions(reg.list(), opts)
    .slice()
    .sort((a, b) => a.type.localeCompare(b.type))
    .map((def) => ({
      type: def.type,
      name: def.name,
      family: def.family,
      ...(def.kind ? { kind: def.kind } : {}),
      summary: def.summary,
      keywords: [...def.keywords],
      slots: Object.entries(def.schema ?? {}).map(([name, slot]) => describeSlot(name, slot)),
      ...(def.kind === 'html' && def.motion?.parts ? { parts: [...def.motion.parts] } : {}),
      ...(def.describe ? { when: def.describe.when, avoid: def.describe.avoid, example: def.describe.example } : {}),
      ...layerField(def),
    }))

  const layouts: CapabilityLayoutDigest[] = SLIDE_LAYOUTS.map((layout) => {
    let regions: string[] = []
    if (tokens) {
      try {
        regions = Object.keys(layout.compile(REFERENCE_FRAME, tokens))
      } catch {
        regions = []
      }
    }
    return { id: layout.id, name: layout.name, regions }
  })

  // Color roles
  const colorRoles: CapabilityColorRoleDigest[] = (Object.keys(COLOR_ROLE_DESCRIPTIONS) as ColorRole[]).map((id) => ({
    id,
    description: COLOR_ROLE_DESCRIPTIONS[id],
  }))

  // Style
  const style: CapabilityStyleDigest = {
    fields: [
      'surface: ColorRole | string — block background',
      'on: ColorRole | string — foreground colour (derived from surface when absent)',
      'accent: ColorRole | string — emphasis colour',
      "tone: 'filled' | 'outline' | 'ghost' | 'inverted' | 'gradient' — visual tone",
      "radius: RadiusToken | number — corner radius (none | sm | md | lg | xl | pill)",
      "padding: SpaceToken | number | [number, number] — inner padding",
      "gap: SpaceToken | number — gap between children",
      "elevation: 0 | 1 | 2 — shadow level",
      "align: 'start' | 'center' | 'end' — content alignment",
      "density: 'compact' | 'default' | 'roomy' — visual compactness",
    ],
    gradient: "Paint: { type: 'solid', color } | { type: 'linearGradient', angle, stops: [{color, at}] } | { type: 'radialGradient', cx, cy, stops: [{color, at}] }",
  }

  // Motion presets (only those that play, not 'none')
  const motionPresets: CapabilityMotionDigest[] = PRESET_IDS
    .filter((id) => id !== 'none')
    .map((id) => ({
      id,
      family: classifyMotionPreset(id),
      defaultDurationMs: getActiveMs(id),
      triggers: ['withPrevious', 'afterPrevious', 'onClick'],
      ...(MOTION_PRESETS[id].staggerMs ? { staggerMs: MOTION_PRESETS[id].staggerMs } : {}),
      ...(MOTION_PRESETS[id].isChained ? { isChained: true, chain: [...(MOTION_PRESETS[id].chain ?? [])] } : {}),
      ...(MOTION_PRESETS[id].isAmbient ? { isAmbient: true } : {}),
    }))

  return { blocks, layouts, colorRoles, style, motion: motionPresets, example: WORKED_EXAMPLE_SLIDE }
}

/**
 * Markdown rendering of `capabilityDigestData`, meant to be embedded directly into an LLM
 * prompt: every block type, its slots (required ones marked), their budgets, the layout →
 * region name table, color roles, style vocabulary, motion presets, and a worked example
 * of a valid slide.
 */
export function capabilityDigest(registry?: BlockRegistry, opts?: CapabilityDetailOptions): string {
  const data = capabilityDigestData(registry, opts)
  // Filtered calls (tier 2 of the two-tier digest) return the block detail for the shortlist only:
  // the shared vocabulary (roles, style, motion, layouts) is the unfiltered digest's job.
  const filtered = !!opts && (opts.types !== undefined || opts.categories !== undefined)
  const lines: string[] = []

  if (filtered) {
    lines.push('# Block detail')
    lines.push('')
    lines.push(
      'Full slot tables for the shortlisted blocks. Pick a `type`, fill its declared slots, and ' +
        'never invent a region name, a slot, or a coordinate.'
    )
    lines.push('')
  } else {
    lines.push('# Slide block capabilities')
    lines.push('')
    lines.push(
      'Generated from the live block library and slide layouts — do not hand-author a copy of ' +
        'this document, it will drift. Every block below is a closed vocabulary entry: pick a ' +
        '`type`, fill its declared slots, and never invent a region name, a slot, or a coordinate.'
    )
    lines.push('')
  }

  if (!filtered) {
    // ── Color roles ──
    lines.push('## Color roles')
    lines.push('')
    lines.push('Use role names (e.g. `accent`, `text`) in slot values — never bare hex.')
    lines.push('')
    for (const cr of data.colorRoles) {
      lines.push(`- **${cr.id}**: ${cr.description}`)
    }
    lines.push('')

    // ── Style ──
    lines.push('## Style')
    lines.push('')
    lines.push('BlockStyleSpec fields (all optional; absent = theme default):')
    lines.push('')
    for (const f of data.style.fields) {
      lines.push(`- \`${f}\``)
    }
    lines.push('')
    lines.push(`Gradient shape: \`${data.style.gradient}\``)
    lines.push('')
    lines.push(LAYER_LINE)
    lines.push('')

    // ── Motion ──
    lines.push('## Motion')
    lines.push('')
    lines.push('Set `motion.preset` on any block. Every preset below plays (no-op excluded).')
    lines.push('')
    lines.push(MOTION_STYLE_LINE)
    lines.push('')
    for (const mp of data.motion) {
      const chainNote = mp.isChained ? ` (chains: ${mp.chain?.join(' → ')})` : ''
      const ambientNote = mp.isAmbient ? ' (loops)' : ''
      const staggerNote = mp.staggerMs ? `, stagger ${mp.staggerMs}ms` : ''
      lines.push(
        `- **${mp.id}** _${mp.family}_ — ${mp.defaultDurationMs}ms, triggers: ${mp.triggers.join(', ')}${staggerNote}${chainNote}${ambientNote}`
      )
    }
    lines.push('')

    // ── Layouts ──
    lines.push('## Layouts')
    lines.push('')
    lines.push('Region names belong to the layout — pick a `layout`, then only use the regions it lists.')
    lines.push('')
    lines.push('| Layout | Regions | Use when |')
    lines.push('|---|---|---|')
    for (const l of data.layouts) {
      const regionList = l.regions.length ? l.regions.map((r) => `\`${r}\``).join(', ') : '_(none)_'
      const useWhen = LAYOUT_USE_WHEN[l.id] ?? ''
      lines.push(`| \`${l.id}\` (${l.name}) | ${regionList} | ${useWhen} |`)
    }
    lines.push('')

  }

  // ── Blocks ──
  lines.push('## Blocks')
  lines.push('')
  for (const b of data.blocks) {
    const kindTag = (b.kind ? ` [${b.kind}]` : '') + (b.layer ? ` [${b.layer}]` : '')
    lines.push(`### \`${b.type}\` — ${b.name}${kindTag}`)
    lines.push('')
    lines.push(filtered ? b.summary : `${b.summary} _(family: ${b.family}; keywords: ${b.keywords.join(', ') || '—'})_`)
    lines.push('')
    if (b.when) lines.push(`**When:** ${b.when}`)
    if (b.avoid) lines.push(`**Avoid:** ${b.avoid}`)
    if (b.when || b.avoid) lines.push('')
    if (b.parts && b.parts.length) {
      lines.push(`**Parts:** ${b.parts.map((p) => `\`${p}\``).join(', ')}`)
      lines.push('')
    }
    if (b.slots.length) {
      lines.push('| Slot | Required | Type | Guidance |')
      lines.push('|---|---|---|---|')
      for (const slot of b.slots) {
        const guidance = (slot.guidance ?? slot.help ?? '').replace(/\|/g, '\\|')
        lines.push(`| \`${slot.name}\` | ${slot.required ? 'yes' : 'no'} | ${slot.type} | ${guidance} |`)
      }
    } else {
      lines.push('_No slots._')
    }
    if (b.example) {
      lines.push('')
      lines.push('```json')
      // Filtered (tier-2) detail prints the example compactly: it is read by a model, not a person.
      lines.push(filtered ? JSON.stringify(b.example) : JSON.stringify(b.example, null, 2))
      lines.push('```')
    }
    lines.push('')
  }

  if (!filtered) {
    lines.push('## Worked example — a valid slide')
    lines.push('')
    lines.push(
      'Zero coordinates, zero colour values, zero font sizes. Region names come from the layout ' +
        '(`two-column` → `title`, `left`, `right`); block types and slots come from the tables above.'
    )
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(data.example, null, 2))
    lines.push('```')
    lines.push('')

  }

  return lines.join('\n')
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Tier 1 — the compact catalog index                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

function filterDefinitions(defs: BlockDefinition[], opts?: CapabilityDetailOptions): BlockDefinition[] {
  if (!opts) return defs
  return defs.filter((d) => {
    if (opts.types && !opts.types.includes(d.type)) return false
    if (opts.categories && !opts.categories.includes(d.category ?? 'structure')) return false
    return true
  })
}

/**
 * Item range from the first *required* content slot that is a `list` or `series`: '3–8 items',
 * '≤6 items', '≥2 items'. Optional slots (a sparkline, say) would mislead, so they are skipped.
 * A minimum of 0 or 1 is dropped: it is implied by "at least one".
 */
function primaryRange(def: BlockDefinition): string | undefined {
  for (const slot of Object.values(def.schema ?? {})) {
    if (slot.role !== 'content' || !slot.required) continue
    const t = slot.type
    let min: number | undefined
    let max: number | undefined
    if (t.kind === 'list') {
      min = t.min
      max = t.max
    } else if (t.kind === 'series') {
      max = t.max
    } else {
      continue
    }
    if (min !== undefined && min <= 1) min = undefined
    if (min !== undefined && max !== undefined) return `${min}–${max} items`
    if (max !== undefined) return `≤${max} items`
    if (min !== undefined) return `≥${min} items`
    return undefined
  }
  return undefined
}

/**
 * Structured form of the catalog index: one compact entry per block, sorted by category order
 * then type. Blocks without a category are listed under 'structure', without a scope as 'element'.
 */
export function capabilityIndexData(registry?: BlockRegistry, opts?: CapabilityIndexOptions): CapabilityIndexEntry[] {
  const reg = registry ?? defaultBlockRegistry()
  const rank = (c: BlockCategory) => BLOCK_CATEGORIES.indexOf(c)
  return reg
    .list()
    .map((def) => ({ def, category: def.category ?? ('structure' as BlockCategory), scope: def.scope ?? ('element' as BlockScope) }))
    .filter(({ category, scope }) => (!opts?.categories || opts.categories.includes(category)) && (!opts?.scopes || opts.scopes.includes(scope)))
    .sort((a, b) => rank(a.category) - rank(b.category) || a.def.type.localeCompare(b.def.type))
    .map(({ def, category, scope }) => {
      const range = primaryRange(def)
      return {
        type: def.type,
        category,
        scope,
        ...(range ? { range } : {}),
        shortDescription: def.shortDescription ?? def.summary,
        ...(def.related && def.related.length ? { related: [...def.related] } : {}),
        ...layerField(def),
      }
    })
}

/** LO2 — `{ layer }` for a non-content block, `{}` otherwise (keeps the digest compact). */
function layerField(def: BlockDefinition): { layer?: BlockLayer } {
  const layer = definitionLayer(def)
  return layer === 'content' ? {} : { layer }
}

/** LO2 — how the planner layers blocks into one composite look. */
const LAYER_LINE =
  'Layers: to stack blocks, put them in the same region and set `layer` on the block: `"backdrop"` takes the ' +
  'whole region box behind the region\'s other blocks (a field, pattern or decoration under a card), `"overlay"` ' +
  'takes it on top (a badge, an arrow) and must not cover text. Neither takes stacking space. `anchor` ' +
  '(`fill` or `top-left`…`bottom-right`, `center`) puts it at natural size on that corner/edge; `anchorTo: "<id>"` ' +
  'anchors to a stacked block of the region (a badge on a card corner). Blocks marked ' +
  '`backdrop`/`overlay` below default to that layer only for overlap checks; `layer` still has to be set to stack.'

/** P7 — one line telling the planner how to use deck/slide motion styles. */
const MOTION_STYLE_LINE =
  'Motion style: set `motionStyle` on the deck or a slide (slide wins) instead of per-block `motion`: ' +
  '`expressive` for covers, key numbers and section openers; `subtle` for dense content; `static` for print/handouts.'

/**
 * Markdown catalog index, meant to be the planner's first look at the library: the picking rule,
 * the scope rules, then one section per category and one line per block
 * (`type · category · scope · range — shortDescription`). Full slot tables come from
 * `capabilityDigest(registry, { types })` for the shortlist only.
 */
export function capabilityIndex(registry?: BlockRegistry, opts?: CapabilityIndexOptions): string {
  const entries = capabilityIndexData(registry, opts)
  const lines: string[] = []
  lines.push('# Slide block index')
  lines.push('')
  lines.push(
    'Choose the category from the relationship in the content, then the block. Dated → `timeline`; ' +
      'ordered but undated → `process`; options against each other → `comparison`; numbers that need ' +
      'axes → `chart`; one to four headline numbers → `metric`.'
  )
  lines.push('')
  lines.push('Scope rules:')
  lines.push('- `element`: one atom. Combine several on a slide or inside a container.')
  lines.push('- `group`: a self-contained unit. One per region; may sit inside `tls.l.card` or `tls.l.section`.')
  lines.push('- `slide`: fills the whole content area. One per slide, alone in the main region. Never nest it.')
  lines.push('')
  lines.push('Line format: `type · category · scope · item range · layer — what the viewer sees` (layer only when not content). Ask for the detail digest of the shortlisted types before filling props.')
  lines.push('')
  lines.push(LAYER_LINE)
  lines.push('')
  lines.push(MOTION_STYLE_LINE)
  lines.push('')
  for (const cat of BLOCK_CATEGORIES) {
    const inCat = entries.filter((e) => e.category === cat)
    if (!inCat.length) continue
    lines.push(`## ${CATEGORY_INFO[cat].label} — ${CATEGORY_INFO[cat].description}`)
    lines.push('')
    for (const e of inCat) {
      lines.push(`${e.type} · ${e.category} · ${e.scope}${e.range ? ` · ${e.range}` : ''}${e.layer ? ` · ${e.layer}` : ''} — ${e.shortDescription}`)
    }
    lines.push('')
  }
  lines.push('## Icons')
  lines.push('')
  lines.push(`Valid icon names: ${Object.keys(ICONS).join(', ')}`)
  lines.push('')
  return lines.join('\n')
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Slot description                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

function describeSlot(name: string, slot: SlotSpec): CapabilitySlotDigest {
  return {
    name,
    role: slot.role,
    required: !!slot.required,
    type: describeSlotType(slot.type),
    label: slot.label,
    help: slot.help,
    guidance: slot.guidance,
  }
}

function describeSlotType(type: SlotType): string {
  switch (type.kind) {
    case 'text':
      return `text${type.maxChars !== undefined ? ` (max ${type.maxChars} chars)` : ''}`
    case 'richText':
      return `richText${type.maxChars !== undefined ? ` (max ${type.maxChars} chars)` : ''}`
    case 'number': {
      const bounds = [
        type.min !== undefined ? `min ${type.min}` : undefined,
        type.max !== undefined ? `max ${type.max}` : undefined,
      ].filter((v): v is string => v !== undefined)
      return `number${bounds.length ? ` (${bounds.join(', ')})` : ''}`
    }
    case 'enum':
      return `enum: ${type.values.join(' \\| ')}`
    case 'boolean':
      return 'boolean'
    case 'color':
      return 'color (role or theme token — never hex)'
    case 'icon':
      return 'icon'
    case 'image':
      return 'image'
    case 'list': {
      const bounds = boundsLabel(type.min, type.max, 'items')
      return `list of ${describeSlotType(type.of)}${bounds}`
    }
    case 'object':
      return `object (${Object.keys(type.fields).join(', ')})`
    case 'series':
      return `series of ${type.value}${type.max !== undefined ? ` (max ${type.max})` : ''}`
    case 'blocks': {
      const bounds = boundsLabel(type.min, type.max, 'blocks')
      return `blocks${type.allow ? ` (allow: ${type.allow.join(', ')})` : ''}${bounds}`
    }
    default:
      return 'unknown'
  }
}

function boundsLabel(min: number | undefined, max: number | undefined, unit: string): string {
  if (min === undefined && max === undefined) return ''
  return ` (${min ?? 0}–${max ?? '∞'} ${unit})`
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Worked example (BACKLOG-demo.md §2.4)                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

const WORKED_EXAMPLE_SLIDE = {
  id: 'sl_03',
  layout: 'two-column',
  role: 'content',
  rhythm: 'dense',
  regions: {
    title: [
      {
        id: 'b1',
        type: 'tls.t.title',
        props: {
          text: {
            runs: [{ text: 'Margin fell on ' }, { text: 'infrastructure', bold: true }],
          },
        },
      },
    ],
    left: [
      {
        id: 'b2',
        type: 'tls.d.bar',
        props: { categories: ['Q1', 'Q2', 'Q3'], series: [64, 64, 61], highlightIndex: 2 },
        motion: { preset: 'bars-grow', order: 2, trigger: 'onClick' },
      },
    ],
    right: [
      {
        id: 'b3',
        type: 'tls.t.takeaway',
        props: { text: 'Compute spend grew 2.4× while revenue grew 1.2×.' },
        motion: { preset: 'fade-up', order: 3 },
      },
      {
        id: 'b4',
        type: 'tls.t.caption',
        props: { text: 'Source: internal Q3 financials' },
      },
    ],
  },
  notes: 'Land on the 61 — this is the hinge slide.',
}
