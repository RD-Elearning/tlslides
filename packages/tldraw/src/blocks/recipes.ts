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
import type { BlockSpec, SlideSpec } from './types'

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

export interface SlideRecipe {
  id: string
  role: RecipeRole
  /** A `SLIDE_LAYOUTS` id. */
  layout: string
  /** Region name (of `layout`) → blocks stacked in it, top to bottom. */
  regions: Record<string, RecipeBlock[]>
  /** One short clause: when this recipe fits. */
  when: string
}

const b = (type: string, knobs?: Record<string, unknown>): RecipeBlock => (knobs ? { type, knobs } : { type })
const TITLE = b('tls.t.title')

export const RECIPES: readonly SlideRecipe[] = [
  // ── cover ──
  { id: 'cover-hero', role: 'cover', layout: 'blank', regions: { content: [b('tls.c.hero')] }, when: 'type-led opener' },
  {
    id: 'cover-split-image',
    role: 'cover',
    layout: 'blank',
    regions: { content: [b('tls.c.cover', { variant: 'split', showImage: true })] },
    when: 'opener with a photo or product shot',
  },
  { id: 'cover-kinetic', role: 'cover', layout: 'blank', regions: { content: [b('tls.c.kinetic-title')] }, when: 'motion-led opener for expressive decks' },

  // ── agenda ──
  { id: 'agenda-full', role: 'agenda', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.agenda')] }, when: 'numbered agenda under a heading, full slide' },
  {
    id: 'agenda-image',
    role: 'agenda',
    layout: 'two-column',
    regions: { title: [TITLE], left: [b('tls.t.bullets', { marker: 'number' })], right: [b('tls.m.image')] },
    when: 'short agenda beside a photo',
  },

  // ── section ──
  { id: 'section-divider', role: 'section', layout: 'blank', regions: { content: [b('tls.c.divider')] }, when: 'section opener' },
  {
    id: 'section-title',
    role: 'section',
    layout: 'section',
    regions: { title: [TITLE] },
    when: 'quiet section break',
  },

  // ── content ──
  { id: 'content-statement', role: 'content', layout: 'blank', regions: { content: [b('tls.t.statement')] }, when: 'one message, key words in accent' },
  {
    id: 'content-bullets-image',
    role: 'content',
    layout: 'two-column',
    regions: { title: [TITLE], left: [b('tls.t.bullets')], right: [b('tls.m.image')] },
    when: 'a few points beside a picture',
  },
  { id: 'content-cards', role: 'content', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.cards')] }, when: '2–4 parallel points' },
  {
    id: 'content-feature-grid',
    role: 'content',
    layout: 'timeline',
    regions: { title: [TITLE], timeline: [b('tls.c.feature-grid', { cell: 'card' })] },
    when: 'features or benefits with icons',
  },
  {
    id: 'content-icon-list-image',
    role: 'content',
    layout: 'image-left',
    regions: { title: [TITLE], image: [b('tls.m.image')], text: [b('tls.m.icon-list')] },
    when: 'vertical icon points beside a photo',
  },
  {
    id: 'content-image-text',
    role: 'content',
    layout: 'blank',
    regions: { content: [b('tls.c.image-text')] },
    when: 'photo-led story with a heading and text',
  },

  // ── data ──
  {
    id: 'data-chart-insight',
    role: 'data',
    layout: 'timeline',
    regions: { title: [TITLE], timeline: [b('tls.c.chart-insight', { insightSize: 'lead' })] },
    when: 'one chart with its takeaway and source',
  },
  {
    id: 'data-stat-spotlight',
    role: 'data',
    layout: 'timeline',
    regions: { title: [TITLE], timeline: [b('tls.c.stat-spotlight')] },
    when: 'one rate with three supporting numbers',
  },
  { id: 'data-big-stat', role: 'data', layout: 'blank', regions: { content: [b('tls.c.big-stat', { align: 'center' })] }, when: 'one giant number' },
  { id: 'data-kpi-row', role: 'data', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.kpi-row', { tile: 'card' }), b('tls.t.takeaway', { size: 'lead' })] }, when: '2–5 headline KPIs and what they mean' },
  {
    id: 'data-table',
    role: 'data',
    layout: 'timeline',
    regions: { title: [TITLE], timeline: [b('tls.d.table'), b('tls.t.footnote')] },
    when: 'exact values in rows, with a source',
  },
  {
    id: 'data-bar-takeaway',
    role: 'data',
    layout: 'two-column',
    regions: { title: [TITLE], left: [b('tls.d.bar')], right: [b('tls.t.takeaway', { size: 'lead' })] },
    when: 'single-series bars with the so-what beside',
  },

  // ── comparison ──
  { id: 'comparison-options', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.comparison')] }, when: '2–3 options side by side' },
  { id: 'comparison-pros-cons', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.pros-cons')] }, when: 'arguments for and against' },
  { id: 'comparison-before-after', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.before-after')] }, when: 'a change story' },
  { id: 'comparison-pricing', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.d.pricing')] }, when: 'plans and prices' },
  { id: 'comparison-matrix', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.matrix-2x2')] }, when: 'items on two axes' },
  { id: 'comparison-table', role: 'comparison', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.d.compare-table'), b('tls.t.takeaway', { size: 'lead' })] }, when: 'feature matrix, with the verdict' },

  // ── process ──
  { id: 'process-steps', role: 'process', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.steps'), b('tls.t.takeaway', { size: 'lead' })] }, when: 'ordered steps, explained, with the point they make' },
  { id: 'process-chevrons', role: 'process', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.chevrons', { textPlacement: 'below' }), b('tls.t.takeaway', { size: 'lead' })] }, when: 'phases with a current one, and what it means' },
  { id: 'process-timeline', role: 'process', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.timeline', { alternate: true })] }, when: 'dated events' },
  { id: 'process-roadmap', role: 'process', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.g.roadmap'), b('tls.t.takeaway', { size: 'lead' })] }, when: 'plan over periods and lanes, with the key milestone' },

  // ── people ──
  { id: 'people-team', role: 'people', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.c.team')] }, when: 'team members' },
  { id: 'people-testimonial', role: 'people', layout: 'blank', regions: { content: [b('tls.c.testimonial')] }, when: 'one customer quote as social proof' },
  { id: 'people-logo-wall', role: 'people', layout: 'timeline', regions: { title: [TITLE], timeline: [b('tls.m.logo-wall')] }, when: 'clients or partners' },

  // ── quote ──
  // `blank`, not the `quote` layout: its 140-unit quote region is shorter than a quote with attribution.
  { id: 'quote-pull', role: 'quote', layout: 'blank', regions: { content: [b('tls.t.quote')] }, when: 'a pull quote alone on the slide' },
  { id: 'quote-statement', role: 'quote', layout: 'blank', regions: { content: [b('tls.t.statement', { showAttribution: true })] }, when: 'a short quotable line in display type' },

  // ── closing ──
  { id: 'closing-centered', role: 'closing', layout: 'blank', regions: { content: [b('tls.c.closing')] }, when: 'thanks and call to action' },
  {
    id: 'closing-split',
    role: 'closing',
    layout: 'blank',
    regions: { content: [b('tls.c.closing', { variant: 'split' })] },
    when: 'closing with contacts beside the call to action',
  },
]

/** Recipes for one role (all when `role` is absent). */
export function recipesFor(role?: RecipeRole): SlideRecipe[] {
  return RECIPES.filter((r) => !role || r.role === role)
}

/**
 * Compact one-line form used by the tier-1 index: `id · layout — region: type(k=v) + type; … — when`.
 * A `title` region holding only a plain `tls.t.title` is implied (shown as `+title`): the index
 * header says so, and it saves ~20 chars on most lines.
 */
export function recipeLine(r: SlideRecipe): string {
  const implied = (name: string, blocks: RecipeBlock[]) =>
    name === 'title' && blocks.length === 1 && blocks[0].type === 'tls.t.title' && !blocks[0].knobs
  const titled = Object.entries(r.regions).some(([name, blocks]) => implied(name, blocks))
  const regions = Object.entries(r.regions)
    .filter(([name, blocks]) => !implied(name, blocks))
    .map(([name, blocks]) => {
      const list = blocks
        .map((blk) => {
          const knobs = blk.knobs ? Object.entries(blk.knobs).map(([k, v]) => `${k}=${String(v)}`).join(',') : ''
          return knobs ? `${blk.type}(${knobs})` : blk.type
        })
        .join(' + ')
      return `${name}: ${list}`
    })
    .join('; ')
  return `${r.id} · ${r.layout}${titled ? '+title' : ''} — ${regions || 'title only'} — ${r.when}`
}

const SLIDE_ROLE: Partial<Record<RecipeRole, SlideSpec['role']>> = { cover: 'cover', section: 'section', closing: 'closing' }

/**
 * A recipe filled with each block's `describe.example` props (knobs on top): the known-good
 * starting slide the planner swaps content into. Blocks without an example get `{}` props.
 */
export function recipeSlide(recipe: SlideRecipe, registry: BlockRegistry): SlideSpec {
  let n = 0
  const regions: Record<string, BlockSpec[]> = {}
  for (const [region, blocks] of Object.entries(recipe.regions)) {
    regions[region] = blocks.map((blk) => {
      const example = registry.get(blk.type)?.describe?.example
      const base: BlockSpec = example ? (JSON.parse(JSON.stringify(example)) as BlockSpec) : { id: '', type: blk.type, props: {} }
      return { ...base, id: `b${++n}`, type: blk.type, props: { ...(base.props ?? {}), ...(blk.knobs ?? {}) } }
    })
  }
  const role = SLIDE_ROLE[recipe.role] ?? 'content'
  return { id: `sl_${recipe.id}`, layout: recipe.layout, role, regions }
}
