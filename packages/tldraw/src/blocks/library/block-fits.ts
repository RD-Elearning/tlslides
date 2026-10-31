/**
 * spro creative CR2 — capability cards: what each block can show, and how (`BlockFits`).
 *
 * Read by the shortlist (`blocks/shortlist.ts`), which ranks the whole catalog for one slide from
 * its content signals instead of a single shape word, and by the director's compact cards
 * (`capability-digest.ts` `cardText`). Authored from each block's `describe.when/avoid` and its
 * size card. `applyAiCuration()` copies a row onto its definition as `def.fits`, next to `aiTier`,
 * `absorbs` and `looks` (one curation layer; this table only keeps `ai-curation.ts` readable).
 *
 * Rules (enforced by `catalog-conformance.spec.ts`):
 * - every built-in block has a row here or is `EDITOR_ONLY`;
 * - enum values are valid; `items` lies within the schema's list range;
 * - `needs` equals the asset needs the picker uses (`recipes.ts` `TYPE_NEEDS`).
 */

import type { BlockFits, FitsData, FitsEnergy, FitsTextLoad, FrameRole, LookFamily, Relation } from '../types'

/** Containers and editing aids: arranged by the AI through layouts and compositions, never
 *  chosen as a slide's main block; page chrome is placed by the style masters. */
export const EDITOR_ONLY: ReadonlySet<string> = new Set([
  'tls.l.card', 'tls.l.footer', 'tls.l.grid', 'tls.l.grid-guide', 'tls.l.overlay', 'tls.l.repeater',
  'tls.l.row', 'tls.l.safe-area', 'tls.l.section', 'tls.l.sidebar', 'tls.l.spacer', 'tls.l.split',
  'tls.l.stack', 'tls.l.field', 'tls.g.connector',
  'tls.x.footer-text', 'tls.x.header', 'tls.x.logo-mark', 'tls.x.page-number', 'tls.x.watermark',
])

type Extra = { data?: FitsData; families?: LookFamily[]; frames?: FrameRole[]; needs?: BlockFits['needs'] }

const f = (
  relations: Relation[],
  items: [number, number] | null,
  textLoad: FitsTextLoad,
  energy: FitsEnergy,
  extra: Extra = {},
): BlockFits => ({
  relations,
  ...(items ? { items } : {}),
  textLoad,
  energy,
  ...extra,
})

const PLAYFUL: LookFamily[] = ['playful', 'classroom', 'modern']
const SERIOUS: LookFamily[] = ['academic', 'professional', 'elegant', 'modern']

export const BLOCK_FITS: Record<string, BlockFits> = {
  // ── heading ──
  'tls.t.title': f(['statement'], null, 'lines', 'neutral', { frames: ['cover', 'divider', 'closing'] }),
  'tls.t.subtitle': f(['statement'], null, 'lines', 'calm'),
  'tls.t.kicker': f(['statement'], null, 'labels', 'neutral'),

  // ── text ──
  'tls.t.body': f(['statement', 'definition'], null, 'paragraphs', 'calm'),
  'tls.t.caption': f(['statement'], null, 'lines', 'calm'),
  'tls.t.footnote': f(['statement'], null, 'lines', 'calm'),
  'tls.t.code': f(['code', 'worked-example'], [3, 16], 'lines', 'calm'),
  'tls.t.definition': f(['definition', 'terms'], null, 'paragraphs', 'calm'),
  'tls.t.formula': f(['formula'], null, 'labels', 'calm'),

  // ── list ──
  'tls.c.bento': f(['group', 'number', 'image-led'], [3, 5], 'lines', 'lively', { families: ['professional', 'elegant', 'modern'] }),
  'tls.c.cards': f(['group', 'terms', 'recap'], [2, 4], 'lines', 'neutral', { frames: ['agenda', 'summary', 'closing'] }),
  'tls.c.feature-grid': f(['group', 'terms'], [3, 6], 'lines', 'neutral'),
  'tls.c.feature-reveal': f(['group', 'terms'], [3, 6], 'lines', 'lively', { families: ['modern', 'professional'] }),
  'tls.m.icon-list': f(['group', 'recap', 'terms'], [3, 6], 'lines', 'neutral', { frames: ['agenda', 'summary'] }),
  'tls.t.bullets': f(['group', 'recap'], [2, 7], 'lines', 'calm'),
  'tls.t.checklist': f(['recap', 'action', 'question'], [3, 7], 'lines', 'neutral', { frames: ['summary', 'closing'] }),
  'tls.t.kv-list': f(['terms', 'definition'], [3, 8], 'lines', 'calm'),
  'tls.t.numbered': f(['sequence', 'recap', 'ranking'], [3, 7], 'lines', 'calm', { frames: ['agenda', 'summary'] }),
  'tls.t.tags': f(['group', 'terms'], [3, 12], 'labels', 'neutral'),

  // ── emphasis ──
  'tls.c.quote-image': f(['quote'], null, 'lines', 'calm', { needs: ['images'], frames: ['divider'] }),
  'tls.t.badge': f(['statement'], null, 'labels', 'neutral'),
  'tls.t.callout': f(['statement', 'definition'], null, 'lines', 'neutral'),
  'tls.t.marker': f(['sequence'], null, 'labels', 'neutral'),
  'tls.t.quote': f(['quote', 'statement'], null, 'lines', 'calm', { frames: ['divider', 'closing'] }),
  'tls.t.statement': f(['statement', 'question'], null, 'lines', 'calm', { frames: ['cover', 'divider', 'closing', 'qa'] }),
  'tls.t.takeaway': f(['statement', 'recap'], null, 'lines', 'neutral', { frames: ['summary', 'closing'] }),

  // ── metric ──
  'tls.c.big-stat': f(['number'], null, 'labels', 'lively', { data: 'single', frames: ['cover'] }),
  'tls.c.dashboard': f(['number', 'series'], [2, 4], 'labels', 'neutral', { data: 'series', families: SERIOUS, needs: ['chartData'] }),
  'tls.c.kpi-row': f(['number', 'group'], [2, 4], 'labels', 'neutral', { data: 'single' }),
  'tls.c.kpi-tile': f(['number'], null, 'labels', 'neutral', { data: 'single' }),
  'tls.c.stat-card': f(['number'], null, 'labels', 'neutral', { data: 'single' }),
  'tls.c.stat-spotlight': f(['number', 'share'], [1, 3], 'labels', 'lively', { data: 'share' }),
  'tls.d.bullet-chart': f(['number', 'ranking'], [2, 5], 'labels', 'calm', { data: 'series', families: SERIOUS }),
  'tls.d.gauge': f(['number', 'share'], null, 'labels', 'neutral', { data: 'single' }),
  'tls.d.icon-array': f(['share', 'number'], null, 'labels', 'lively', { data: 'share' }),
  'tls.d.progress-bar': f(['share', 'ranking'], [2, 6], 'labels', 'neutral', { data: 'share' }),
  'tls.d.progress-ring': f(['share', 'number'], null, 'labels', 'neutral', { data: 'share' }),
  'tls.d.stat-compare': f(['number', 'contrast'], null, 'labels', 'neutral', { data: 'single' }),
  'tls.d.trend-badge': f(['number'], null, 'labels', 'neutral', { data: 'single' }),
  'tls.t.hero-number': f(['number', 'statement'], null, 'labels', 'lively', { data: 'single', frames: ['cover'] }),

  // ── chart ──
  'tls.c.chart-insight': f(['series', 'number'], [3, 12], 'labels', 'neutral', { data: 'series', needs: ['chartData'] }),
  'tls.d.area': f(['series'], [4, 24], 'labels', 'calm', { data: 'series' }),
  'tls.d.bar': f(['series', 'ranking'], [3, 12], 'labels', 'neutral', { data: 'series', needs: ['chartData'] }),
  'tls.d.bubble': f(['series', 'matrix'], [4, 20], 'labels', 'calm', { data: 'table', families: SERIOUS }),
  'tls.d.donut': f(['share'], [2, 6], 'labels', 'neutral', { data: 'share' }),
  'tls.d.funnel-chart': f(['sequence', 'share'], [3, 6], 'labels', 'neutral', { data: 'series' }),
  'tls.d.grouped-bar': f(['series', 'contrast'], [3, 8], 'labels', 'neutral', { data: 'table' }),
  'tls.d.heatmap': f(['matrix', 'series'], [3, 10], 'labels', 'calm', { data: 'table', families: SERIOUS }),
  'tls.d.lollipop': f(['ranking', 'series', 'contrast'], [3, 10], 'labels', 'calm', { data: 'series', needs: ['chartData'] }),
  'tls.d.dot-plot': f(['ranking', 'series', 'contrast'], [4, 10], 'labels', 'calm', { data: 'series', needs: ['chartData'], families: SERIOUS }),
  'tls.d.treemap': f(['share', 'hierarchy'], [4, 12], 'labels', 'calm', { data: 'share', needs: ['chartData'] }),
  'tls.d.annotated-line': f(['series', 'timeline', 'cause-effect'], [1, 4], 'labels', 'calm', { data: 'series', needs: ['chartData'] }),
  'tls.d.line': f(['series', 'timeline'], [4, 24], 'labels', 'neutral', { data: 'series' }),
  'tls.d.pie': f(['share'], [2, 6], 'labels', 'neutral', { data: 'share' }),
  'tls.d.radar': f(['contrast', 'series'], [4, 8], 'labels', 'neutral', { data: 'table' }),
  'tls.d.scatter': f(['series', 'matrix', 'cause-effect'], [5, 40], 'labels', 'calm', { data: 'table', families: SERIOUS }),
  'tls.d.slope': f(['contrast', 'ranking', 'series'], [3, 8], 'labels', 'neutral', { data: 'table' }),
  'tls.d.sparkline': f(['series', 'number'], [5, 30], 'labels', 'calm', { data: 'series' }),
  'tls.d.stacked-bar': f(['series', 'share'], [3, 8], 'labels', 'neutral', { data: 'table' }),
  'tls.d.waterfall': f(['series', 'cause-effect'], [4, 10], 'labels', 'neutral', { data: 'series', families: SERIOUS }),

  // ── table ──
  'tls.d.ranking': f(['ranking', 'number'], [3, 8], 'labels', 'lively', { data: 'series' }),
  'tls.d.scorecard': f(['number', 'group'], [3, 7], 'labels', 'calm', { data: 'table', families: SERIOUS }),
  'tls.d.table': f(['matrix', 'contrast', 'terms'], [2, 8], 'labels', 'calm', { data: 'table', needs: ['chartData'] }),

  // ── comparison ──
  'tls.c.case-study': f(['story', 'cause-effect', 'number'], [3, 3], 'paragraphs', 'neutral', { families: SERIOUS }),
  'tls.c.comparison': f(['contrast', 'group'], [2, 3], 'lines', 'neutral'),
  'tls.c.problem-solution': f(['contrast', 'cause-effect'], [2, 2], 'paragraphs', 'neutral'),
  'tls.d.compare-table': f(['contrast', 'matrix'], [3, 8], 'labels', 'calm', { data: 'table' }),
  'tls.d.pricing': f(['contrast', 'action'], [2, 4], 'labels', 'neutral', { needs: ['prices'], families: ['professional', 'modern', 'elegant'] }),
  'tls.g.before-after': f(['contrast', 'story', 'cause-effect'], [2, 2], 'lines', 'lively'),
  'tls.g.iceberg': f(['contrast', 'hierarchy', 'cause-effect'], [2, 8], 'labels', 'lively'),
  'tls.g.matrix-2x2': f(['matrix', 'contrast'], [4, 4], 'labels', 'neutral'),
  'tls.g.myth-fact': f(['contrast', 'question'], [1, 3], 'lines', 'lively'),
  'tls.g.pros-cons': f(['contrast'], [2, 6], 'lines', 'neutral'),
  'tls.g.swot': f(['matrix', 'contrast'], [4, 4], 'labels', 'calm', { families: SERIOUS }),

  // ── process ──
  'tls.c.steps': f(['sequence', 'action', 'worked-example'], [3, 5], 'lines', 'neutral', { frames: ['agenda', 'closing'] }),
  'tls.g.chevrons': f(['sequence', 'timeline'], [3, 6], 'labels', 'lively', { frames: ['agenda'] }),
  'tls.g.cycle': f(['cycle'], [3, 6], 'labels', 'lively'),
  'tls.g.flow': f(['sequence', 'cause-effect', 'network', 'worked-example'], [3, 8], 'labels', 'neutral'),
  'tls.g.funnel': f(['sequence', 'hierarchy'], [3, 5], 'lines', 'neutral'),
  'tls.g.staircase': f(['sequence', 'hierarchy'], [3, 5], 'lines', 'lively', { families: PLAYFUL.concat(['professional']) }),
  'tls.g.steps': f(['sequence'], [3, 6], 'labels', 'neutral'),

  // ── timeline ──
  'tls.c.journey': f(['timeline', 'sequence', 'story'], [3, 6], 'labels', 'lively', { frames: ['agenda'] }),
  'tls.g.milestones': f(['timeline', 'sequence'], [3, 7], 'labels', 'neutral'),
  'tls.g.roadmap': f(['timeline', 'action'], [3, 8], 'labels', 'calm', { families: SERIOUS }),
  'tls.g.timeline': f(['timeline', 'sequence', 'story'], [3, 6], 'lines', 'neutral'),

  // ── hierarchy ──
  'tls.g.breakdown': f(['hierarchy', 'share', 'number'], [2, 6], 'labels', 'neutral'),
  'tls.g.graph': f(['network', 'worked-example', 'hierarchy'], [3, 15], 'labels', 'calm', { families: ['classroom', 'academic', 'modern'] }),
  'tls.g.layers': f(['hierarchy', 'group'], [3, 6], 'lines', 'neutral'),
  'tls.g.mindmap': f(['network', 'hierarchy', 'group'], [3, 6], 'labels', 'lively'),
  'tls.g.pyramid': f(['hierarchy', 'ranking'], [3, 5], 'lines', 'neutral'),
  'tls.g.target': f(['hierarchy', 'group'], [2, 4], 'lines', 'lively'),
  'tls.g.tree': f(['hierarchy', 'network'], [3, 12], 'labels', 'neutral'),

  // ── relationship ──
  'tls.g.bracket': f(['group', 'hierarchy'], [2, 6], 'labels', 'calm'),
  'tls.g.hub-spoke': f(['network', 'group', 'cycle'], [3, 8], 'lines', 'neutral'),
  'tls.g.orbit': f(['group', 'network', 'cycle'], [3, 8], 'labels', 'lively'),
  'tls.g.venn': f(['contrast', 'group'], [2, 3], 'labels', 'neutral'),
  'tls.m.shape': f(['group'], null, 'labels', 'neutral'),

  // ── media ──
  'tls.c.image-full': f(['image-led', 'story'], null, 'lines', 'lively', { needs: ['images'], frames: ['cover', 'divider', 'closing'] }),
  'tls.c.image-text': f(['image-led', 'story', 'definition'], null, 'paragraphs', 'neutral', { needs: ['images'] }),
  'tls.m.device-mock': f(['image-led'], null, 'labels', 'neutral', { needs: ['images'], families: ['professional', 'modern'] }),
  'tls.m.icon': f(['statement'], null, 'labels', 'neutral'),
  'tls.m.icon-label': f(['group'], null, 'labels', 'neutral'),
  'tls.m.image': f(['image-led'], null, 'labels', 'calm', { needs: ['images'] }),
  'tls.m.image-compare': f(['image-led', 'contrast'], [2, 2], 'labels', 'neutral', { needs: ['images'] }),
  'tls.m.image-grid': f(['image-led', 'group'], [2, 6], 'labels', 'neutral', { needs: ['images'] }),

  // ── people ──
  'tls.c.profile-card': f(['people'], null, 'paragraphs', 'calm', { needs: ['portraits'] }),
  'tls.c.team': f(['people', 'group'], [2, 8], 'lines', 'neutral'),
  'tls.c.testimonial': f(['quote', 'people'], null, 'lines', 'calm'),
  'tls.m.avatar': f(['people'], null, 'labels', 'calm', { needs: ['portraits'] }),
  'tls.m.avatar-group': f(['people'], [3, 8], 'labels', 'neutral', { needs: ['portraits'] }),

  // ── brand ──
  'tls.m.logo': f(['image-led'], null, 'labels', 'calm', { needs: ['logos'] }),
  'tls.m.logo-wall': f(['group', 'people'], [4, 12], 'labels', 'calm', { needs: ['logos'] }),

  // ── frames ──
  'tls.c.cover': f(['statement'], null, 'lines', 'neutral', { frames: ['cover'] }),
  'tls.c.hero': f(['statement', 'action'], null, 'lines', 'lively', { frames: ['cover', 'closing'] }),
  'tls.c.kinetic-title': f(['statement'], null, 'labels', 'lively', { frames: ['cover', 'divider'], families: ['modern', 'playful', 'elegant'] }),
  'tls.c.divider': f(['statement'], null, 'labels', 'calm', { frames: ['divider'] }),
  'tls.c.agenda': f(['sequence', 'group'], [3, 7], 'lines', 'calm', { frames: ['agenda'] }),
  'tls.c.objectives': f(['action', 'recap', 'group'], [2, 6], 'lines', 'calm', { frames: ['agenda', 'summary'] }),
  'tls.c.closing': f(['action', 'statement'], null, 'lines', 'neutral', { frames: ['closing'] }),
  'tls.c.contact': f(['people', 'action'], null, 'labels', 'calm', { frames: ['closing'] }),
  'tls.c.recap': f(['recap'], [3, 5], 'lines', 'neutral', { frames: ['summary', 'closing'] }),

  // ── learning ──
  'tls.c.quiz': f(['question'], [2, 5], 'labels', 'lively', { frames: ['qa'] }),
  'tls.a.choice': f(['question'], [2, 5], 'labels', 'lively', { frames: ['qa'] }),
  'tls.a.true-false': f(['question'], [2, 6], 'labels', 'lively', { frames: ['qa'] }),
  'tls.a.flip-cards': f(['terms', 'definition'], [2, 8], 'labels', 'lively'),
  'tls.a.reveal': f(['question'], null, 'lines', 'lively', { frames: ['qa'] }),
  'tls.a.fill-blank': f(['definition', 'question'], null, 'lines', 'lively', { frames: ['qa'] }),
  'tls.a.match': f(['terms', 'definition'], null, 'labels', 'lively'),
  'tls.a.order': f(['sequence'], null, 'labels', 'lively'),
  'tls.a.sort': f(['group'], null, 'labels', 'lively'),
  'tls.a.timer': f(['action'], null, 'labels', 'lively'),
  'tls.t.qa': f(['question', 'definition'], [1, 4], 'lines', 'neutral', { frames: ['qa'] }),

  // ── spro creative CR8: wave 1 (PLAN Appendix C.1) ──
  'tls.c.one-question': f(['question', 'action'], null, 'labels', 'calm', { frames: ['closing', 'qa'] }),
  'tls.c.cta': f(['action'], null, 'lines', 'lively', { frames: ['closing'] }),
  'tls.c.callback': f(['statement', 'question'], null, 'lines', 'neutral', { frames: ['closing'] }),
  'tls.c.takeaway-poster': f(['recap', 'statement', 'group'], [1, 3], 'lines', 'neutral', { frames: ['summary', 'closing'] }),
  'tls.c.poster-cover': f(['statement', 'story'], null, 'labels', 'lively', { frames: ['cover'] }),
  'tls.c.split-cover': f(['image-led', 'statement'], null, 'labels', 'neutral', { frames: ['cover', 'divider'] }),
  'tls.c.hook-cover': f(['question', 'number'], null, 'labels', 'lively', { frames: ['cover'] }),
  'tls.c.route-agenda': f(['sequence', 'timeline', 'story'], [3, 7], 'labels', 'lively', { frames: ['agenda', 'divider'] }),
  'tls.c.chapter-divider': f(['statement', 'question'], null, 'labels', 'neutral', { frames: ['divider'] }),
  'tls.c.sticky-board': f(['group', 'terms', 'recap'], [2, 8], 'labels', 'lively', { families: ['playful', 'classroom'] }),
  'tls.c.question-wall': f(['question'], [3, 8], 'labels', 'lively', { frames: ['qa'] }),
  'tls.c.homework': f(['action', 'group'], [1, 4], 'lines', 'neutral', { frames: ['closing'], families: ['classroom', 'playful', 'academic'] }),
  'tls.c.flashcards': f(['terms', 'definition'], [2, 6], 'lines', 'neutral'),
  'tls.g.annotated': f(['image-led', 'hierarchy', 'terms'], [2, 6], 'lines', 'neutral'),
  'tls.t.highlight': f(['quote', 'definition', 'worked-example'], null, 'paragraphs', 'calm'),
  'tls.t.speech-bubble': f(['quote', 'story', 'people'], null, 'lines', 'lively', { families: ['playful', 'classroom'] }),
  // spro creative CR9
  'tls.m.emoji': f(['statement', 'question'], null, 'labels', 'lively', { families: ['playful', 'classroom'] }),
  'tls.m.illustration': f(['statement', 'story', 'people'], null, 'labels', 'lively', { families: ['playful', 'classroom'] }),

  // spro creative CR13: waves 2 and 3 (PLAN Appendix C.3/C.4)
  'tls.g.decision-tree': f(['hierarchy', 'cause-effect', 'question'], [3, 9], 'labels', 'neutral'),
  'tls.g.fishbone': f(['cause-effect'], [2, 6], 'labels', 'neutral'),
  'tls.g.spectrum': f(['contrast', 'ranking'], [2, 7], 'labels', 'neutral'),
  'tls.g.balance': f(['contrast'], [2, 8], 'labels', 'neutral'),
  'tls.g.puzzle': f(['group', 'hierarchy'], [2, 6], 'labels', 'lively'),
  'tls.g.bridge': f(['contrast', 'sequence', 'action'], [1, 5], 'labels', 'neutral'),
  'tls.c.number-story': f(['number', 'sequence'], [2, 4], 'labels', 'lively', { data: 'single' }),
  'tls.c.do-dont': f(['contrast', 'action'], [2, 5], 'lines', 'neutral'),
  'tls.c.storyboard': f(['story', 'sequence', 'people'], [3, 4], 'lines', 'lively', { families: ['playful', 'classroom', 'modern'] }),
  'tls.c.magazine': f(['story', 'quote', 'image-led'], null, 'paragraphs', 'calm', { families: ['elegant', 'academic', 'professional'] }),
  'tls.t.drop-cap': f(['story', 'definition'], null, 'paragraphs', 'calm', { families: ['elegant', 'academic', 'professional'] }),
  'tls.t.pull-quote': f(['quote', 'statement'], null, 'lines', 'calm', { families: ['elegant', 'academic', 'professional'] }),
  'tls.c.photo-essay': f(['image-led', 'story'], [2, 4], 'lines', 'neutral', { needs: ['images'] }),
  'tls.c.gallery-wall': f(['group', 'image-led', 'people'], [3, 6], 'labels', 'neutral'),
  'tls.c.title-card': f(['statement'], null, 'labels', 'calm', { frames: ['cover', 'divider', 'closing'], families: ['elegant', 'academic', 'professional'] }),
  'tls.c.full-bleed-type': f(['statement'], null, 'labels', 'lively', { frames: ['cover', 'divider'] }),
  // ── decoration (never a main block: relations empty) ──
  'tls.g.arrow': f([], null, 'labels', 'neutral'),
  'tls.m.decoration': f([], null, 'labels', 'lively'),
  'tls.m.icon-cluster': f([], null, 'labels', 'lively'),
  'tls.m.pattern': f([], null, 'labels', 'calm'),
  'tls.m.ornament': f([], null, 'labels', 'calm', { families: ['elegant'] }),
  'tls.x.rule': f([], null, 'labels', 'calm'),
}
