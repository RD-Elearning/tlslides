/**
 * AC0 — slide recipes: known-good composition patterns per slide role, for the AI planner's
 * pick stage (`reviews/blocks/ai-curation/README.md` §5.1).
 *
 * A recipe names a *real* layout id (`SLIDE_LAYOUTS`) and, per region of that layout, the block
 * types to stack there (tier-1 blocks only) with optional look-knob values. `recipes.spec.ts`
 * fills every recipe from each block's `describe.example` and requires `analyzeSlide` to report
 * 0 errors and 0 warnings — so a recipe is a starting point the LLM only swaps content into.
 *
 * Data only. Pure and DOM-free.
 */

import type { BlockRegistry } from './registry'
import type { BlockSpec, DeckStyle, SlideSpec } from './types'

/** The planner's slide roles (LLM-ARCHITECTURE S1 outline). Wider than `SlideSpec.role`. */
export type RecipeRole =
  | 'cover'
  | 'agenda'
  | 'section'
  | 'content'
  | 'data'
  | 'comparison'
  | 'process'
  | 'people'
  | 'quote'
  | 'closing'

export const RECIPE_ROLES: readonly RecipeRole[] = [
  'cover',
  'agenda',
  'section',
  'content',
  'data',
  'comparison',
  'process',
  'people',
  'quote',
  'closing',
]

export interface RecipeBlock {
  type: string
  /** Look-knob values (option slots) set on top of the block's own defaults. */
  knobs?: Record<string, unknown>
}

/**
 * AC8 — one more design of the same recipe: other look-knob values, a mirrored layout or two
 * regions trading places. The content slots stay the same, so the planner can swap a variant
 * in without refilling. `recipes.spec.ts` holds every variant to the recipe's own bar (validates,
 * `analyzeSlide` 0 errors / 0 warnings, balanced) and requires a signature of its own.
 */
export interface RecipeVariant {
  /** Short id, unique inside the recipe; `<recipe>/<variant>` names the design. */
  id: string
  /** Another `SLIDE_LAYOUTS` id with the same region names (`image-left` → `image-right`). */
  layout?: string
  /** Two regions whose blocks trade places (`two-column` left ↔ right). */
  swap?: [string, string]
  /** Block type → look-knob values set on top of the recipe's own knobs. */
  knobs?: Record<string, Record<string, unknown>>
}

export interface SlideRecipe {
  id: string
  role: RecipeRole
  /** A `SLIDE_LAYOUTS` id. */
  layout: string
  /** Region name (of `layout`) → blocks stacked in it, top to bottom. */
  regions: Record<string, RecipeBlock[]>
  /** One short clause: when this recipe fits. */
  when: string
  /** AC8 — more designs of this recipe (the recipe itself is the variant `base`). */
  variants?: RecipeVariant[]
}

/** AC8 — the id of a recipe's own design, before any variant. */
export const BASE_VARIANT = 'base'

const b = (type: string, knobs?: Record<string, unknown>): RecipeBlock => (knobs ? { type, knobs } : { type })
const TITLE = b('tls.t.title')
const v = (id: string, knobs: RecipeVariant['knobs']): RecipeVariant => ({ id, knobs })

export const RECIPES: readonly SlideRecipe[] = [
  // ── cover ──
  { id: 'cover-hero', role: 'cover', layout: 'blank', regions: { content: [b('tls.c.hero')] }, when: 'type-led opener', variants: [v('center', { 'tls.c.hero': { align: 'center', decoration: 'rule' } }), v('split', { 'tls.c.hero': { variant: 'split' } })] },
  {
    id: 'cover-split-image',
    role: 'cover',
    layout: 'blank',
    regions: { content: [b('tls.c.cover', { variant: 'split', showImage: true })] },
    when: 'opener with a photo', variants: [v('bleed', { 'tls.c.cover': { variant: 'bleed' } })] },
  { id: 'cover-kinetic', role: 'cover', layout: 'blank', regions: { content: [b('tls.c.kinetic-title')] }, when: 'motion-led opener', variants: [v('accent', { 'tls.c.kinetic-title': { tone: 'accent' } }), v('start', { 'tls.c.kinetic-title': { align: 'start' } })] },

  // ── agenda ──
  { id: 'agenda-full', role: 'agenda', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.agenda')] }, when: 'numbered agenda, full slide', variants: [v('cards', { 'tls.c.agenda': { variant: 'cards' } }), v('badge', { 'tls.c.agenda': { numbering: 'badge' } }), v('cards-badge', { 'tls.c.agenda': { variant: 'cards', numbering: 'badge' } })] },
  {
    id: 'agenda-image',
    role: 'agenda',
    layout: 'two-column',
    regions: { title: [TITLE], left: [b('tls.t.bullets', { marker: 'number', size: 'fit' })], right: [b('tls.m.image')] },
    when: 'short agenda beside a photo', variants: [{ id: 'mirror', swap: ['left', 'right'] }] },

  // ── section ──
  { id: 'section-divider', role: 'section', layout: 'blank', regions: { content: [b('tls.c.divider')] }, when: 'section opener', variants: [v('numeral', { 'tls.c.divider': { variant: 'numeral' } }), v('field', { 'tls.c.divider': { variant: 'field' } }), v('minimal', { 'tls.c.divider': { variant: 'minimal' } }), v('center', { 'tls.c.divider': { align: 'center' } })] },
  {
    id: 'section-title',
    role: 'section',
    layout: 'section',
    regions: { title: [TITLE] },
    when: 'quiet section break',
  },

  // ── content ──
  // AC6: the asymmetric tile grid (one big stat, points, a photo, a quote) under a title
  { id: 'content-bento', role: 'content', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.bento')] }, when: 'a number, points, a photo' },
  // AC8.5: display type (title-size type alone on a slide read unfinished); the `lg` look was dropped.
  { id: 'content-statement', role: 'content', layout: 'blank', regions: { content: [b('tls.t.statement', { size: 'display' })] }, when: 'one message, key words in accent', variants: [v('center', { 'tls.t.statement': { align: 'center' } }), v('underline', { 'tls.t.statement': { emphasis: 'underline' } }), v('accent', { 'tls.t.statement': { emphasis: 'accent' } })] },
  {
    id: 'content-bullets-image',
    role: 'content',
    layout: 'two-column',
    regions: { title: [TITLE], left: [b('tls.t.bullets', { size: 'fit' })], right: [b('tls.m.image')] },
    when: 'points beside a photo', variants: [{ id: 'mirror', swap: ['left', 'right'] }, v('chevron', { 'tls.t.bullets': { marker: 'chevron' } })] },
  { id: 'content-cards', role: 'content', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.cards')] }, when: '2–4 parallel points', variants: [v('numbers', { 'tls.c.cards': { lead: 'number' } }), v('giant', { 'tls.c.cards': { lead: 'number', numeral: 'giant' } }), v('accent', { 'tls.c.cards': { tone: 'accent-first' } }), v('outline', { 'tls.c.cards': { tone: 'outline' } }), v('center', { 'tls.c.cards': { align: 'center' } })] },
  {
    id: 'content-feature-grid',
    role: 'content',
    layout: 'timeline',
    regions: { title: [TITLE], timeline: [b('tls.c.feature-grid', { cell: 'card' })] },
    when: 'features with icons', variants: [v('circle', { 'tls.c.feature-grid': { iconStyle: 'circle' } }), v('center', { 'tls.c.feature-grid': { align: 'center', iconStyle: 'circle' } })] },
  {
    id: 'content-icon-list-image',
    role: 'content',
    layout: 'image-left',
    regions: { title: [TITLE], image: [b('tls.m.image')], text: [b('tls.m.icon-list', { size: 'fit' })] },
    when: 'icon points beside a photo', variants: [{ id: 'mirror', layout: 'image-right' }] },
  {
    id: 'content-image-text',
    role: 'content',
    layout: 'blank',
    regions: { content: [b('tls.c.image-text')] },
    when: 'photo-led story', variants: [v('right', { 'tls.c.image-text': { placement: 'right' } })] },
  // AC8.5: the `top` look was dropped — a short story under a wide photo left a third of the slide empty.

  // ── data ──
  {
    id: 'data-chart-insight',
    role: 'data',
    layout: 'timeline',
    regions: { title: [TITLE], timeline: [b('tls.c.chart-insight', { insightSize: 'lead' })] },
    when: 'one chart, takeaway and source', variants: [v('left', { 'tls.c.chart-insight': { side: 'left' } }), v('below', { 'tls.c.chart-insight': { side: 'below' } }), v('wide', { 'tls.c.chart-insight': { ratio: '3:2' } })] },
  {
    id: 'data-stat-spotlight',
    role: 'data',
    layout: 'timeline',
    regions: { title: [TITLE], timeline: [b('tls.c.stat-spotlight')] },
    when: 'a rate and three numbers', variants: [v('side', { 'tls.c.stat-spotlight': { statsPlacement: 'side' } }), v('plain', { 'tls.c.stat-spotlight': { visual: 'plain' } })] },
  { id: 'data-big-stat', role: 'data', layout: 'blank', regions: { content: [b('tls.c.big-stat', { align: 'center' })] }, when: 'one giant number', variants: [v('accent', { 'tls.c.big-stat': { variant: 'accent' } }), v('split', { 'tls.c.big-stat': { variant: 'split' } })] },
  { id: 'data-kpi-row', role: 'data', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.kpi-row', { tile: 'card' }), b('tls.t.takeaway', { size: 'lead' })] }, when: '2–5 KPIs and their meaning', variants: [v('bar', { 'tls.c.kpi-row': { tile: 'accent-bar' } }), v('plain', { 'tls.c.kpi-row': { tile: 'plain' } })] },
  {
    id: 'data-table',
    role: 'data',
    layout: 'timeline',
    regions: { title: [TITLE], timeline: [b('tls.d.table'), b('tls.t.footnote', { marker: 'source' })] },
    when: 'exact values, with a source', variants: [v('head', { 'tls.d.table': { rules: 'head', zebra: false } })] },
  {
    id: 'data-bar-takeaway',
    role: 'data',
    layout: 'two-column',
    regions: { title: [TITLE], left: [b('tls.d.bar')], right: [b('tls.t.takeaway', { size: 'column' })] },
    when: 'one-series bars, so-what beside', variants: [{ id: 'mirror', swap: ['left', 'right'] }, v('horizontal', { 'tls.d.bar': { orientation: 'horizontal' } })] },

  // ── comparison ──
  { id: 'comparison-options', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.comparison')] }, when: '2–3 options side by side', variants: [v('cards', { 'tls.c.comparison': { style: 'cards' } })] },
  { id: 'comparison-pros-cons', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.pros-cons')] }, when: 'arguments for and against', variants: [v('cards', { 'tls.g.pros-cons': { style: 'cards' } }), v('columns', { 'tls.g.pros-cons': { style: 'columns' } })] },
  { id: 'comparison-before-after', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.before-after')] }, when: 'a change story', variants: [v('chevron', { 'tls.g.before-after': { arrow: 'chevron' } }), v('even', { 'tls.g.before-after': { emphasis: 'none' } })] },
  { id: 'comparison-pricing', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.d.pricing')] }, when: 'plans and prices', variants: [v('outline', { 'tls.d.pricing': { featuredStyle: 'outline' } }), v('filled', { 'tls.d.pricing': { featuredStyle: 'filled' } })] },
  { id: 'comparison-matrix', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.matrix-2x2')] }, when: 'items on two axes', variants: [v('lines', { 'tls.g.matrix-2x2': { style: 'lines' } })] },
  { id: 'comparison-table', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.d.compare-table'), b('tls.t.takeaway', { size: 'lead' })] }, when: 'feature matrix, with the verdict', },

  // ── process ──
  { id: 'process-steps', role: 'process', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.steps'), b('tls.t.takeaway', { size: 'lead' })] }, when: 'ordered steps, their point' },
  { id: 'process-chevrons', role: 'process', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.chevrons', { textPlacement: 'below' }), b('tls.t.takeaway', { size: 'lead' })] }, when: 'phases, the current one', variants: [v('single', { 'tls.g.chevrons': { fill: 'single' } }), v('series', { 'tls.g.chevrons': { fill: 'series' } }), v('inside', { 'tls.g.chevrons': { textPlacement: 'inside' } })] },
  { id: 'process-timeline', role: 'process', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.timeline', { alternate: true })] }, when: 'dated events', variants: [v('numbers', { 'tls.g.timeline': { nodeStyle: 'number' } })] },
  { id: 'process-roadmap', role: 'process', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.roadmap'), b('tls.t.takeaway', { size: 'lead' })] }, when: 'plan by period and lane', variants: [v('plain', { 'tls.g.roadmap': { statusColors: false } })] },

  // ── people ──
  { id: 'people-team', role: 'people', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.team')] }, when: 'team members', },
  { id: 'people-testimonial', role: 'people', layout: 'blank', regions: { content: [b('tls.c.testimonial', { size: 'lg' })] }, when: 'a customer quote' },
  { id: 'people-logo-wall', role: 'people', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.m.logo-wall')] }, when: 'clients or partners', variants: [v('plates', { 'tls.m.logo-wall': { plates: true } }), v('dividers', { 'tls.m.logo-wall': { dividers: true } })] },

  // ── quote ──
  // `blank`, not the `quote` layout: its 140-unit quote region is shorter than a quote with attribution.
  { id: 'quote-pull', role: 'quote', layout: 'blank', regions: { content: [b('tls.t.quote', { variant: 'big' })] }, when: 'a pull quote', variants: [v('card', { 'tls.t.quote': { variant: 'card' } }), v('side', { 'tls.t.quote': { variant: 'side' } }), v('image', { 'tls.t.quote': { variant: 'image' } })] },
  // AC6: a photo moment edge to edge (`full-bleed`, S13) with a headline panel
  { id: 'quote-image-full', role: 'quote', layout: 'full-bleed', regions: { content: [b('tls.c.image-full')] }, when: 'a place or moment, edge to edge', variants: [v('split', { 'tls.c.image-full': { panel: 'split' } }), v('band', { 'tls.c.image-full': { panel: 'band' } }), v('fade', { 'tls.c.image-full': { scrim: 'gradient' } }), v('fade-left', { 'tls.c.image-full': { panel: 'left', scrim: 'gradient' } }), v('framed', { 'tls.c.image-full': { frame: true, panel: 'center' } }), v('framed-split', { 'tls.c.image-full': { frame: true, panel: 'split' } })] },
  { id: 'quote-statement', role: 'quote', layout: 'blank', regions: { content: [b('tls.t.statement', { showAttribution: true, size: 'display' })] }, when: 'a quotable line', variants: [v('center', { 'tls.t.statement': { align: 'center' } }), v('underline', { 'tls.t.statement': { emphasis: 'underline' } })] },

  // ── closing ──
  // AC8: `variant: centered` spelled out — the example is the split variant, so before AC8 this
  // recipe drew a split closing.
  { id: 'closing-centered', role: 'closing', layout: 'blank', regions: { content: [b('tls.c.closing', { variant: 'centered' })] }, when: 'thanks and a CTA', variants: [v('link', { 'tls.c.closing': { ctaStyle: 'link' } }), v('big-type', { 'tls.c.closing': { variant: 'big-type' } })] },
  {
    id: 'closing-split',
    role: 'closing',
    layout: 'blank',
    regions: { content: [b('tls.c.closing', { variant: 'split' })] },
    when: 'contacts beside the CTA', variants: [v('link', { 'tls.c.closing': { ctaStyle: 'link' } })] },
]

/** Recipes for one role (all when `role` is absent). */
export function recipesFor(role?: RecipeRole): SlideRecipe[] {
  return RECIPES.filter((r) => !role || r.role === role)
}

/** AC8: the main region of the layouts whose name a recipe line leaves implied. */
const MAIN_REGION: Record<string, string> = { blank: 'content', 'full-bleed': 'content', timeline: 'timeline' }

/**
 * Compact one-line form used by the tier-1 index: `id · layout — region: type(k=v) + type; … — when`.
 * A `title` region holding only a plain `tls.t.title` is implied (shown as `+title`): the index
 * header says so, and it saves ~20 chars on most lines.
 */
export function recipeLine(r: SlideRecipe): string {
  const implied = (name: string, blocks: RecipeBlock[]) =>
    name === 'title' && blocks.length === 1 && blocks[0].type === 'tls.t.title' && !blocks[0].knobs
  const titled = Object.entries(r.regions).some(([name, blocks]) => implied(name, blocks))
  // AC8: a recipe's one region besides the title, when it is the layout's main region (`content`
  // of blank/full-bleed, `timeline` of timeline), is written without its name (saves ~10 chars a line).
  const rest = Object.entries(r.regions).filter(([name, blocks]) => !implied(name, blocks))
  const mainOnly = rest.length === 1 && MAIN_REGION[r.layout] === rest[0][0]
  const regions = rest
    .map(([name, blocks]) => {
      const list = blocks
        .map((blk) => {
          const knobs = blk.knobs ? Object.entries(blk.knobs).map(([k, v]) => `${k}=${String(v)}`).join(',') : ''
          return knobs ? `${blk.type}(${knobs})` : blk.type
        })
        .join(' + ')
      return mainOnly ? list : `${name}: ${list}`
    })
    .join('; ')
  // AC8: the recipe's other designs by name (`cover-hero/center`)
  const looks = r.variants?.length ? ` · looks: ${r.variants.map((v) => v.id).join('|')}` : ''
  return `${r.id} · ${r.layout}${titled ? '+title' : ''} — ${regions || 'title only'} — ${r.when}${looks}`
}

const SLIDE_ROLE: Partial<Record<RecipeRole, SlideSpec['role']>> = { cover: 'cover', section: 'section', closing: 'closing' }

/**
 * A recipe filled with each block's `describe.example` props (knobs on top): the known-good
 * starting slide the planner swaps content into. Blocks without an example get `{}` props.
 */
export function recipeSlide(recipe: SlideRecipe, registry: BlockRegistry, variant?: string, style?: DeckStyle): SlideSpec {
  const v = findVariant(recipe, variant)
  let n = 0
  const regions: Record<string, BlockSpec[]> = {}
  for (const [region, blocks] of Object.entries(recipe.regions)) {
    regions[region] = blocks.map((blk) => {
      const def = registry.get(blk.type)
      const example = def?.describe?.example
      const base: BlockSpec = example ? (JSON.parse(JSON.stringify(example)) as BlockSpec) : { id: '', type: blk.type, props: {} }
      // AC8: with a deck style, an example's look-knob value the style sets is dropped, so the
      // style's choice applies under the recipe's and the variant's knobs. Before AC8 an example's
      // `markStyle: glyph` or `title.size: title` silently overrode every style's own value.
      const props = { ...(base.props ?? {}) }
      const pinned = style?.blockDefaults[blk.type]
      if (pinned) for (const k of def?.looks ?? []) if (k in pinned) delete props[k]
      return { ...base, id: `b${++n}`, type: blk.type, props: { ...props, ...(blk.knobs ?? {}), ...(v?.knobs?.[blk.type] ?? {}) } }
    })
  }
  if (v?.swap) {
    const [a, b] = v.swap
    const ra = regions[a]
    regions[a] = regions[b] ?? []
    regions[b] = ra ?? []
  }
  const role = SLIDE_ROLE[recipe.role] ?? 'content'
  return { id: `sl_${recipe.id}${v ? `_${v.id}` : ''}`, layout: v?.layout ?? recipe.layout, role, regions }
}

/**
 * AC8.5 — the content assets a slide can draw on. The outline (S1) says, per slide or per deck,
 * whether the user's material has photos, logos, portraits of the people named, and chart data
 * (a series or a table). The picker only offers a design whose needs are all present.
 */
export type AssetKind = 'images' | 'logos' | 'portraits' | 'chartData'
export type SlideAssets = Record<AssetKind, boolean>
export const ASSET_KINDS: readonly AssetKind[] = ['images', 'logos', 'portraits', 'chartData']

/** Block type → what it cannot do without (a design that degrades well, e.g. initials discs on a
 *  team or a testimonial without portraits, or a bento that drops its photo tile, needs nothing). */
const TYPE_NEEDS: Record<string, AssetKind> = {
  'tls.m.image': 'images',
  'tls.c.image-full': 'images',
  'tls.c.image-text': 'images',
  'tls.m.logo-wall': 'logos',
  'tls.d.bar': 'chartData',
  'tls.d.table': 'chartData',
  'tls.c.chart-insight': 'chartData',
}

/** What one block with these look knobs needs (knob-dependent for the cover and the quote). */
export function blockNeeds(type: string, knobs: Record<string, unknown> = {}): AssetKind[] {
  if (TYPE_NEEDS[type]) return [TYPE_NEEDS[type]]
  if (type === 'tls.c.cover' && (knobs.showImage === true || knobs.variant === 'split' || knobs.variant === 'bleed')) return ['images']
  if (type === 'tls.t.quote' && knobs.variant === 'image') return ['images']
  return []
}

/** AC8.5 — the asset kinds a recipe design needs (its blocks with the recipe's and the variant's knobs). */
export function designNeeds(recipe: SlideRecipe, variant?: string): AssetKind[] {
  const v = findVariant(recipe, variant)
  const out = new Set<AssetKind>()
  for (const blocks of Object.values(recipe.regions)) {
    for (const blk of blocks) for (const k of blockNeeds(blk.type, { ...(blk.knobs ?? {}), ...(v?.knobs?.[blk.type] ?? {}) })) out.add(k)
  }
  return ASSET_KINDS.filter((k) => out.has(k))
}

/** AC8.5 — does the slide's content have everything this design needs? A kind left out of
 *  `assets` counts as absent; `undefined` (no availability given) allows everything. */
export function assetsAllow(recipe: SlideRecipe, variant: string | undefined, assets: Partial<SlideAssets> | undefined): boolean {
  if (!assets) return true
  return designNeeds(recipe, variant).every((k) => assets[k] === true)
}

/** AC8 — a recipe's variant by id; `undefined` for the base design (or an unknown id). */
export function findVariant(recipe: SlideRecipe, variant?: string): RecipeVariant | undefined {
  if (!variant || variant === BASE_VARIANT) return undefined
  return recipe.variants?.find((v) => v.id === variant)
}

/** AC8 — the ids of every design of a recipe: `base` first, then its variants in order. */
export function variantIds(recipe: SlideRecipe): string[] {
  return [BASE_VARIANT, ...(recipe.variants ?? []).map((v) => v.id)]
}
