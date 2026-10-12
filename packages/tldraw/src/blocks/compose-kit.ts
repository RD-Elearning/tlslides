/**
 * The compose kit — what an LLM needs to compose one content slide itself (spro
 * docs/slide-engine/ai-deck/compose/PLAN.md §3 A2, §4 B1/B4/B6): the slide's *shape* (what its
 * content is: a hierarchy, a sequence, a contrast, …) picks the block families worth showing, the
 * style supplies a short concept card (how cards, borders, icons and decoration are drawn and
 * where decoration may sit) and the composition card gives the grammar. Recipes and patterns are
 * examples, not moulds: the model picks the blocks, the icons and the decoration; the style and
 * the engine own every colour, border and size.
 *
 * Pure and DOM-free. Every block type named here is checked against the registry
 * (`compose-kit.spec.ts`), so a renamed block fails a test instead of the prompt.
 */
import { capabilityDigest } from './capability-digest'
import { ICON_GROUPS } from './icons'
import type { BlockRegistry } from './registry'
import type { DeckStyle, StyleConcept } from './types'
import { defaultBlockRegistry } from './validate-deck-spec'

/** What a slide shows (spro outline v4 `shape`). `frame` slides are not composed. */
export const SLIDE_SHAPES = [
  'definition',
  'terms',
  'hierarchy',
  'sequence',
  'cycle',
  'contrast',
  'matrix',
  'formula',
  'code',
  'worked-example',
  'number',
  'quote',
  'question',
  'image-led',
  'statement',
  'recap',
] as const
export type SlideShape = (typeof SLIDE_SHAPES)[number]

/**
 * The block families that show each shape best, best first. Covers blocks no recipe reaches
 * (tree, mindmap, cycle, pyramid, definition, callout, qa, checklist, objectives, quiz, recap).
 * Containers and atoms are always available (composition card); this list is the shortlist whose
 * full slot tables the prompt carries.
 */
export const SHAPE_FAMILIES: Record<SlideShape, readonly string[]> = {
  definition: ['tls.t.definition', 'tls.t.statement', 'tls.g.breakdown', 'tls.t.callout', 'tls.t.kv-list'],
  terms: ['tls.t.kv-list', 'tls.c.feature-grid', 'tls.m.icon-list', 'tls.t.definition', 'tls.c.cards', 'tls.t.tags'],
  hierarchy: ['tls.g.tree', 'tls.g.mindmap', 'tls.g.breakdown', 'tls.g.layers', 'tls.g.pyramid'],
  sequence: ['tls.c.steps', 'tls.g.flow', 'tls.g.chevrons', 'tls.g.timeline', 'tls.t.numbered', 'tls.g.steps'],
  cycle: ['tls.g.cycle', 'tls.g.hub-spoke', 'tls.g.flow', 'tls.t.numbered'],
  contrast: ['tls.g.before-after', 'tls.g.pros-cons', 'tls.d.compare-table', 'tls.c.comparison', 'tls.c.problem-solution', 'tls.g.venn'],
  matrix: ['tls.g.matrix-2x2', 'tls.d.table', 'tls.d.compare-table', 'tls.g.swot'],
  formula: ['tls.t.statement', 'tls.t.definition', 'tls.t.kv-list', 'tls.t.callout'],
  code: ['tls.t.numbered', 'tls.t.kv-list', 'tls.t.callout', 'tls.d.table'],
  'worked-example': ['tls.g.tree', 'tls.d.table', 'tls.g.flow', 'tls.c.steps', 'tls.t.numbered', 'tls.t.callout'],
  number: ['tls.c.big-stat', 'tls.c.stat-spotlight', 'tls.c.kpi-row', 'tls.t.hero-number', 'tls.d.progress-ring', 'tls.c.chart-insight'],
  quote: ['tls.t.quote', 'tls.c.testimonial', 'tls.t.statement'],
  question: ['tls.t.qa', 'tls.c.quiz', 'tls.t.checklist', 'tls.t.statement'],
  'image-led': ['tls.c.image-text', 'tls.m.image', 'tls.m.image-grid', 'tls.c.image-full'],
  statement: ['tls.t.statement', 'tls.t.hero-number', 'tls.t.quote', 'tls.t.takeaway'],
  recap: ['tls.c.recap', 'tls.t.checklist', 'tls.m.icon-list', 'tls.c.objectives', 'tls.t.numbered', 'tls.c.cards'],
}

/** Layouts a composition uses, with their regions (from `SLIDE_LAYOUTS`) and when. */
export const COMPOSE_LAYOUTS: ReadonlyArray<{ id: string; regions: string; when: string }> = [
  { id: 'timeline', regions: 'title, timeline', when: 'one wide region under the title — any content, not only timelines (a diagram, a row of cards, a split)' },
  { id: 'two-column', regions: 'title, left, right', when: 'two things side by side: a visual and its explanation' },
  { id: 'comparison', regions: 'title, left, right', when: 'two equal columns set against each other' },
  { id: 'three-column', regions: 'title, a, b, c', when: 'three parallel columns' },
  { id: 'image-left', regions: 'title, image, text', when: 'an image or a large visual first, text beside it' },
  { id: 'image-right', regions: 'title, text, image', when: 'text first, the visual beside it' },
  { id: 'section-stack', regions: 'content', when: 'a centred stack, no title bar: a statement, a number, a question' },
  { id: 'blank', regions: 'content', when: 'one region, the whole safe area' },
  { id: 'quote', regions: 'quote, attribution', when: 'a quotation and who said it' },
]

/** Blocks that stand out beside the main structure (B2): at most one per slide. */
export const ACCENT_BLOCKS: readonly string[] = ['tls.t.takeaway', 'tls.t.callout', 'tls.t.hero-number', 'tls.t.badge', 'tls.t.kicker', 'tls.t.quote', 'tls.t.footnote']
/** Purely decorative blocks (B6): at most one per slide. */
export const DECORATION_BLOCKS: readonly string[] = ['tls.m.decoration', 'tls.m.pattern', 'tls.x.rule']

const CARD_WORDS: Record<NonNullable<DeckStyle['surface']>['card'], string> = {
  filled: 'filled panels in the surface colour',
  outline: 'outlined panels, no fill',
  glass: 'frosted glass panels',
  ghost: 'open, unfilled areas (no panel)',
  raised: 'raised panels with a shadow',
}
const STROKE_WORDS = { none: 'no border', hairline: 'hairline borders', bold: 'bold borders' } as const
const SHADOW_WORDS = { 0: 'flat', 1: 'a soft shadow', 2: 'a deep shadow', hard: 'a hard offset shadow' } as const

/** The concept a style gives a composition when it declares none: derived from its data. */
export function styleConcept(style: DeckStyle): StyleConcept {
  if (style.concept) return style.concept
  const noDeco = style.avoid.includes('tls.m.decoration')
  return {
    decoration: noDeco ? 'none' : 'sparse',
    motifs: noDeco ? ['tls.x.rule'] : ['tls.m.decoration', 'tls.x.rule'],
    zones: noDeco ? ['under-heading'] : ['corner', 'under-heading'],
    icons: 'disc',
    accent: 'Accent colour on one word or one mark per slide.',
  }
}

// Measured by the compose dry run (`decorated` kind, 2026-10-13): an overlay in a corner of the
// main region covers text in ~60 % of slides; at the end of the title bar or as the region's
// backdrop it passes 98 %.
const ZONE_HOW: Record<StyleConcept['zones'][number], string> = {
  corner: 'a small motif at the right end of the title bar: a second block in `regions.title` with `layer: "overlay"`, `anchor: "right"`',
  'behind-title': 'a soft motif behind a statement or a number: the first block of that region with `layer: "backdrop"`',
  'beside-visual': 'a motif behind the free side of the main region: `layer: "backdrop"`, `opacity: "soft"`',
  watermark: 'a large faint motif behind the main region: `layer: "backdrop"`, `opacity: "soft"`',
  'under-heading': 'a short accent bar under a heading: `tls.x.rule` with `length: "short"` in the stack, or first in the main region',
}

/** B4 + B6 — the style's concept as the model reads it: what it never sets, what it chooses. */
export function styleConceptCard(style: DeckStyle): string {
  const c = styleConcept(style)
  const s = style.surface
  const look = s ? `${CARD_WORDS[s.card]}, ${STROKE_WORDS[s.stroke]}, ${SHADOW_WORDS[s.shadow]}` : 'the theme default panels'
  const r = style.tokens.radius?.md
  const lines = [
    `## Style concept: ${style.name}`,
    style.brief,
    `- Drawn by the style on every block you place (never set them): ${look}${r !== undefined ? `, corner radius ${r}` : ''}; fonts ${style.fonts.heading.family} / ${style.fonts.body.family}. Colours come from the palette and the person's primary colour — write roles (accent, text), never hex, sizes or borders.`,
    `- Icons: ${c.icons === 'none' ? 'only where an item needs one; this style is typographic' : c.icons === 'disc' ? '`iconStyle: "disc"` beside card headings and list items; one icon per item, each fitting its item' : 'plain glyphs, no disc'}.`,
    `- Decoration: ${c.decoration === 'none' ? 'none — this style relies on white space; a short rule under a heading at most' : `${c.decoration === 'rich' ? 'welcome on most slides' : 'on about one slide in three'}, at most one decorative element per slide, never over text; suits ${c.motifs.map((m) => `\`${m}\``).join(', ')}`}.`,
  ]
  if (c.decoration !== 'none') lines.push('- Where decoration may sit: ' + c.zones.map((z) => ZONE_HOW[z]).join('; ') + '.')
  lines.push(`- Accent: ${c.accent}`)
  if (style.rules.length) lines.push('- Rules: ' + style.rules.join(' '))
  if (style.avoid.length) lines.push('- Never use: ' + style.avoid.map((t) => `\`${t}\``).join(', '))
  return lines.join('\n')
}

/** The composition card for a slide the model composes (not "prefer a pattern": it composes). */
export function composeCard(): string {
  return [
    '# Composing a slide',
    'You design the slide: pick a layout, then the blocks for each of its regions. The engine lays it out, checks it and draws it in the deck style.',
    '',
    '## Layouts',
    ...COMPOSE_LAYOUTS.map((l) => `- \`${l.id}\` (regions ${l.regions}) — ${l.when}`),
    '',
    '## Grammar (checked; a break is sent back to you)',
    '- A region holds a list of blocks, top to bottom. A composite (`tls.c.*`, a diagram `tls.g.*`, a chart, a table) is a region block of its own, never inside a container.',
    '- Containers (children in `props.children`): `tls.l.stack` (top-down; `sizing: "content"`), `tls.l.row` / `tls.l.grid` (`columns`, `rows`; peers share ONE child type — wrap mixed content in `tls.l.card` or `tls.l.stack`), `tls.l.split` (`ratio` 0.3-0.7, two children), `tls.l.card` (a panel drawn by the style).',
    '- At most 3 levels (a region block is level 1) and 6 children per container. Inside a container only element blocks (atoms, text, lists, small media).',
    '- Atoms: `tls.t.title` (a heading inside the slide: `size: "subheading"|"heading"`, `color: "text"`), `tls.t.body` (`size: "body"|"lead"`), `tls.t.kicker`, `tls.t.badge`, `tls.t.marker` (`value`), `tls.m.icon` (`icon`, `size`, `iconStyle`), `tls.m.shape` (circle|rounded|hexagon, `label`, `icon`), `tls.t.hero-number` (`value`, `caption`), `tls.x.rule`.',
    '- Text props are plain strings or `{"runs":[{"text":"…","bold":true}]}`; bold only the key term.',
    '- Layers: `layer: "backdrop"` paints a block behind its region; `layer: "overlay"` + `anchor` (top-left … bottom-right, center) puts it on top at its own size.',
    '- Connectors (optional): `"connectors": [{"id":"k1","from":{"block":"a"},"to":{"block":"b"},"head":"end"}]` on the slide, by block id, never coordinates.',
    '- `style` on a block: only surface, on, accent, tone, radius, padding, gap, elevation, align — prefer none (the style draws it).',
    '',
    '## One main structure, one accent, one decoration',
    '- One main structure carries the slide (the shape\'s block, or a composition). Do not stack two diagrams.',
    `- At most one accent beside it: ${ACCENT_BLOCKS.map((t) => `\`${t}\``).join(', ')} — e.g. a takeaway under a diagram, a hero number beside a short text. Never a second focal point.`,
    `- At most one decorative element (${DECORATION_BLOCKS.map((t) => `\`${t}\``).join(', ')}), only where the style concept allows, never over text.`,
    '- Fill the slide: a short text alone in a wide region looks empty; a lead size or a split with a visual fixes it.',
  ].join('\n')
}

/** Icon names by meaning, for the model to pick an icon that fits each item. */
export function iconCard(): string {
  return ['## Icons (by meaning; any other name renders a placeholder)', ...Object.entries(ICON_GROUPS).map(([g, names]) => `- ${g}: ${names.join(', ')}`)].join('\n')
}

export interface ComposeKitOptions {
  shape: SlideShape
  style: DeckStyle
  /** Extra block types to include (e.g. the families of another shape for a recompose). */
  extra?: readonly string[]
  /** Character budget of the block detail (default 9000). */
  budget?: number
}

export interface ComposeKit {
  /** composition card + style concept + block detail + icons, as one markdown prompt section. */
  markdown: string
  /** The block types whose detail is included, in order. */
  types: string[]
  shape: SlideShape
}

/** The prompt section for composing one slide of `shape` in `style`. */
export function composeKit(opts: ComposeKitOptions, registry?: BlockRegistry): ComposeKit {
  const reg = registry ?? defaultBlockRegistry()
  const budget = opts.budget ?? 9000
  const avoid = new Set(opts.style.avoid)
  const wanted = [...SHAPE_FAMILIES[opts.shape], ...(opts.extra ?? []), 'tls.t.takeaway']
  const types: string[] = []
  let detail = ''
  for (const t of [...new Set(wanted)]) {
    if (avoid.has(t) || !reg.get(t)) continue
    const next = capabilityDigest(reg, { types: [...types, t] })
    if (types.length && next.length > budget) break
    types.push(t)
    detail = next
  }
  // the generic detail header and icon line are replaced by the kit's own sections
  detail = detail.replace(/^Valid icon names:.*$/m, '').trim()
  const markdown = [composeCard(), styleConceptCard(opts.style), detail, iconCard()].join('\n\n')
  return { markdown, types, shape: opts.shape }
}
