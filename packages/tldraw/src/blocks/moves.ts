/**
 * spro creative CR2 — design moves (PLAN §6.5): named ways to design a slide. A move says what the
 * slide is (`when`), the layouts that carry it, the block types that can carry it as the main
 * block (best first, all existing blocks; wave-1 blocks join in CR8), an optional support block,
 * the content relations it suits, its energy, its gate profile (`intent`, §6.8) and the recipe
 * to fall back on. The director (spro) names a move per slide; the shortlist and the compose kit
 * read the layouts and blocks from here. Pure data.
 */

import type { FitsEnergy, FrameRole, Relation } from './types'

/** §6.8: how the quality gate reads a slide built by this move. */
export type MoveIntent = 'poster' | 'diagram' | 'dense'

export interface DesignMove {
  id: string
  kind: 'content' | 'frame'
  frameRole?: FrameRole
  /** Slide layouts that carry it, best first. */
  layouts: string[]
  /** Block types that can be its main block, best first. */
  main: string[]
  /** A block that sits beside or under the main one (a takeaway, a callout, a number). */
  support?: string[]
  /** The content relations it suits (the outline's `relations`). */
  relations: Relation[]
  energy: FitsEnergy
  intent: MoveIntent
  /** The recipe used when every composed attempt fails. */
  fallbackRecipe: string
  /** One line for the director. */
  when: string
}

const content = (
  id: string,
  layouts: string[],
  main: string[],
  relations: Relation[],
  energy: FitsEnergy,
  intent: MoveIntent,
  fallbackRecipe: string,
  when: string,
  support?: string[],
): DesignMove => ({ id, kind: 'content', layouts, main, relations, energy, intent, fallbackRecipe, when, ...(support ? { support } : {}) })

const frame = (
  id: string,
  frameRole: FrameRole,
  layouts: string[],
  main: string[],
  energy: FitsEnergy,
  intent: MoveIntent,
  fallbackRecipe: string,
  when: string,
  support?: string[],
): DesignMove => ({ id, kind: 'frame', frameRole, layouts, main, relations: [], energy, intent, fallbackRecipe, when, ...(support ? { support } : {}) })

export const DESIGN_MOVES: readonly DesignMove[] = [
  // ── content (36) ──
  content('diagram-hero', ['timeline', 'blank', 'sidebar-title'], ['tls.g.cycle', 'tls.g.tree', 'tls.g.flow', 'tls.g.mindmap', 'tls.g.hub-spoke', 'tls.g.venn', 'tls.g.puzzle', 'tls.g.decision-tree'], ['cycle', 'hierarchy', 'network', 'sequence'], 'neutral', 'diagram', 'content-cards', 'one diagram fills the slide and carries the idea', ['tls.t.takeaway']),
  content('split-visual', ['two-column', 'image-left', 'image-right'], ['tls.g.orbit', 'tls.g.target', 'tls.g.venn', 'tls.m.shape', 'tls.g.pyramid'], ['definition', 'group', 'hierarchy'], 'neutral', 'diagram', 'content-image-text', 'text on one side, its picture or diagram on the other', ['tls.t.body']),
  content('annotated', ['timeline', 'two-column'], ['tls.g.breakdown', 'tls.g.bracket', 'tls.g.iceberg', 'tls.m.image'], ['definition', 'hierarchy', 'image-led'], 'neutral', 'diagram', 'content-image-text', 'a figure or diagram with its parts pointed out'),
  content('big-number', ['section-stack', 'blank', 'timeline'], ['tls.c.big-stat', 'tls.t.hero-number', 'tls.c.stat-spotlight', 'tls.d.icon-array'], ['number', 'share'], 'lively', 'poster', 'data-big-stat', 'one number is the message', ['tls.t.takeaway']),
  content('number-story', ['timeline', 'band'], ['tls.c.number-story', 'tls.c.kpi-row', 'tls.d.stat-compare', 'tls.c.bento'], ['number', 'series'], 'neutral', 'dense', 'data-kpi-row', '2–4 numbers read in sequence', ['tls.t.takeaway']),
  content('chart-insight', ['timeline', 'two-column'], ['tls.c.chart-insight', 'tls.d.line', 'tls.d.bar', 'tls.d.donut', 'tls.d.stacked-bar', 'tls.d.slope'], ['series', 'share', 'ranking'], 'neutral', 'diagram', 'data-chart-insight', 'a chart and what it says', ['tls.t.takeaway']),
  content('versus', ['comparison', 'timeline'], ['tls.c.comparison', 'tls.g.before-after', 'tls.g.pros-cons', 'tls.g.balance', 'tls.c.problem-solution', 'tls.d.stat-compare'], ['contrast'], 'lively', 'dense', 'comparison-options', 'two sides set against each other'),
  content('myth-buster', ['timeline'], ['tls.g.myth-fact', 'tls.g.before-after', 'tls.t.qa'], ['contrast', 'question'], 'lively', 'dense', 'comparison-before-after', 'a common belief set right'),
  content('card-grid', ['timeline', 'band'], ['tls.c.cards', 'tls.c.feature-grid', 'tls.m.icon-list', 'tls.c.feature-reveal'], ['group', 'terms'], 'neutral', 'dense', 'content-cards', 'peer items side by side'),
  content('bento', ['timeline', 'blank'], ['tls.c.bento'], ['group', 'number', 'image-led'], 'lively', 'dense', 'content-bento', 'mixed tiles: a number, points, a picture'),
  content('path', ['timeline', 'band'], ['tls.g.staircase', 'tls.c.journey', 'tls.c.steps', 'tls.g.chevrons', 'tls.g.steps', 'tls.g.bridge'], ['sequence', 'timeline', 'action'], 'lively', 'diagram', 'process-steps', 'steps along a road or a staircase'),
  content('loop', ['timeline', 'two-column'], ['tls.g.cycle', 'tls.g.orbit'], ['cycle'], 'lively', 'diagram', 'process-steps', 'steps that come back to the start'),
  content('layers', ['timeline', 'two-column'], ['tls.g.layers', 'tls.g.pyramid', 'tls.g.target', 'tls.g.iceberg'], ['hierarchy'], 'neutral', 'diagram', 'content-cards', 'levels stacked on each other'),
  content('tree-map', ['timeline', 'sidebar-title'], ['tls.g.tree', 'tls.g.mindmap', 'tls.g.graph', 'tls.g.breakdown'], ['hierarchy', 'network'], 'neutral', 'diagram', 'content-cards', 'branches from one root'),
  content('matrix', ['timeline'], ['tls.g.matrix-2x2', 'tls.g.swot', 'tls.d.compare-table', 'tls.d.heatmap'], ['matrix', 'contrast'], 'neutral', 'dense', 'comparison-matrix', 'items placed on two axes or in a grid'),
  content('timeline-river', ['timeline', 'band'], ['tls.g.timeline', 'tls.g.milestones', 'tls.c.journey', 'tls.g.roadmap'], ['timeline', 'story'], 'neutral', 'diagram', 'process-timeline', 'dated events along one line'),
  content('formula-board', ['two-column', 'section-stack', 'timeline'], ['tls.t.formula', 'tls.t.definition'], ['formula'], 'calm', 'poster', 'content-statement', 'an equation and what each part means', ['tls.t.kv-list']),
  content('code-walk', ['two-column', 'timeline'], ['tls.t.code'], ['code', 'worked-example'], 'calm', 'dense', 'content-bullets-image', 'code with its lines explained', ['tls.t.numbered', 'tls.t.callout']),
  content('worked-steps', ['timeline', 'two-column'], ['tls.c.steps', 'tls.t.numbered', 'tls.g.flow', 'tls.g.graph'], ['worked-example', 'sequence'], 'neutral', 'dense', 'process-steps', 'an example solved step by step', ['tls.t.callout']),
  content('quote-poster', ['quote', 'section-stack'], ['tls.t.quote', 'tls.t.pull-quote', 'tls.c.testimonial'], ['quote'], 'calm', 'poster', 'quote-pull', 'the quote is the slide'),
  content('statement-poster', ['section-stack', 'blank'], ['tls.t.statement', 'tls.t.takeaway'], ['statement'], 'calm', 'poster', 'content-statement', 'one sentence, very large'),
  content('question-spotlight', ['section-stack', 'blank'], ['tls.t.statement', 'tls.t.qa'], ['question'], 'lively', 'poster', 'content-statement', 'one question for the room'),
  content('quiz-check', ['timeline'], ['tls.c.quiz', 'tls.t.qa', 'tls.t.checklist'], ['question'], 'lively', 'dense', 'content-cards', 'a check of understanding with options'),
  content('sticky-board', ['timeline', 'blank'], ['tls.c.bento', 'tls.c.cards', 'tls.t.tags'], ['group', 'terms'], 'lively', 'dense', 'content-cards', 'ideas pinned on a board'),
  content('checklist', ['timeline', 'two-column'], ['tls.t.checklist', 'tls.c.objectives', 'tls.m.icon-list'], ['action', 'recap'], 'neutral', 'dense', 'content-icon-list-image', 'things to do or to check'),
  content('people-row', ['timeline'], ['tls.c.team', 'tls.c.gallery-wall', 'tls.c.cards', 'tls.m.icon-list'], ['people', 'group'], 'neutral', 'dense', 'people-team', 'the people or roles involved'),
  content('photo-led', ['image-left', 'image-right', 'full-bleed'], ['tls.c.image-text', 'tls.c.image-full', 'tls.c.photo-essay', 'tls.m.image', 'tls.m.image-grid'], ['image-led', 'story'], 'neutral', 'poster', 'content-image-text', 'a picture carries the slide'),
  content('icon-constellation', ['timeline'], ['tls.g.orbit', 'tls.g.hub-spoke', 'tls.c.feature-grid'], ['group', 'network'], 'lively', 'diagram', 'content-feature-grid', 'related ideas as icons around one centre'),
  content('zoom-in', ['two-column', 'timeline'], ['tls.g.target', 'tls.g.breakdown', 'tls.g.bracket'], ['hierarchy', 'definition'], 'neutral', 'diagram', 'content-image-text', 'a close-up of one part of the previous diagram'),
  content('scenario', ['two-column', 'image-right'], ['tls.c.case-study', 'tls.c.storyboard', 'tls.c.problem-solution', 'tls.t.statement'], ['story', 'worked-example'], 'lively', 'dense', 'content-statement', '"Imagine…": a situation the audience steps into'),

  // spro creative CR13: the wave-2/3 moves (PLAN Appendix C.3/C.4)
  content('decision-path', ['timeline', 'sidebar-title'], ['tls.g.decision-tree', 'tls.g.tree', 'tls.g.flow'], ['question', 'cause-effect', 'hierarchy'], 'neutral', 'diagram', 'content-cards', 'a choice made by answering questions in turn'),
  content('cause-map', ['timeline', 'blank'], ['tls.g.fishbone', 'tls.g.breakdown', 'tls.g.mindmap'], ['cause-effect'], 'neutral', 'diagram', 'content-cards', 'the causes behind one effect, in groups'),
  content('trade-off', ['timeline', 'two-column'], ['tls.g.balance', 'tls.g.spectrum', 'tls.g.pros-cons'], ['contrast', 'ranking'], 'neutral', 'diagram', 'comparison-options', 'two sides weighed, or options between two poles'),
  content('storyboard', ['timeline', 'band'], ['tls.c.storyboard', 'tls.c.journey', 'tls.g.timeline'], ['story', 'people', 'sequence'], 'lively', 'dense', 'process-steps', 'a scenario in three or four panels'),
  content('do-dont', ['timeline', 'comparison'], ['tls.c.do-dont', 'tls.g.pros-cons', 'tls.g.myth-fact'], ['contrast', 'action'], 'lively', 'dense', 'comparison-before-after', 'the right way set against the common mistakes'),
  content('editorial-spread', ['two-column', 'blank', 'section-stack'], ['tls.c.magazine', 'tls.t.pull-quote', 'tls.t.drop-cap', 'tls.c.photo-essay'], ['story', 'quote', 'image-led'], 'calm', 'poster', 'content-statement', 'a passage set like a magazine page, one line pulled out'),
  // ── cover (7) ──
  frame('poster-type', 'cover', ['blank', 'section-stack'], ['tls.c.poster-cover', 'tls.c.full-bleed-type', 'tls.c.title-card', 'tls.c.cover', 'tls.c.hero'], 'neutral', 'poster', 'cover-hero', 'the title set large, nothing else'),
  frame('question-hook', 'cover', ['section-stack', 'blank'], ['tls.c.hook-cover', 'tls.t.statement', 'tls.c.hero'], 'lively', 'poster', 'cover-hero', 'the deck opens with the question it answers'),
  frame('number-hook', 'cover', ['two-column', 'blank'], ['tls.c.hook-cover', 'tls.c.big-stat', 'tls.t.hero-number'], 'lively', 'poster', 'cover-hero', 'the deck opens with one striking number', ['tls.t.title']),
  frame('motif-hero', 'cover', ['blank'], ['tls.c.cover', 'tls.c.hero'], 'lively', 'poster', 'cover-hero', 'the deck motif drawn large beside the title'),
  frame('figure-hero', 'cover', ['image-right', 'full-bleed'], ['tls.c.cover', 'tls.c.image-full'], 'neutral', 'poster', 'cover-split-image', 'a source figure carries the title page'),
  frame('split-field', 'cover', ['blank'], ['tls.c.split-cover', 'tls.c.hero', 'tls.c.cover'], 'neutral', 'poster', 'cover-hero', 'a colour field on one side, the title on the other'),
  frame('kinetic', 'cover', ['blank'], ['tls.c.kinetic-title'], 'lively', 'poster', 'cover-kinetic', 'words rise in one by one'),

  // ── agenda (5) ──
  frame('route-map', 'agenda', ['timeline', 'band'], ['tls.c.route-agenda', 'tls.c.journey', 'tls.g.chevrons'], 'lively', 'diagram', 'agenda-full', 'the parts of the deck as a route'),
  frame('chapter-tabs', 'agenda', ['timeline'], ['tls.c.agenda', 'tls.c.cards'], 'neutral', 'dense', 'agenda-full', 'the parts as tabs or cards'),
  frame('questions-we-answer', 'agenda', ['timeline', 'two-column'], ['tls.t.qa', 'tls.t.numbered', 'tls.m.icon-list'], 'neutral', 'dense', 'agenda-full', 'the agenda as the questions the deck answers'),
  frame('objectives-board', 'agenda', ['timeline', 'two-column'], ['tls.c.objectives', 'tls.t.checklist'], 'calm', 'dense', 'agenda-full', 'what the audience will be able to do'),
  frame('numbered-stack', 'agenda', ['sidebar-title', 'timeline'], ['tls.c.agenda', 'tls.t.numbered'], 'calm', 'dense', 'agenda-full', 'a numbered list of the parts'),

  // ── divider (5) ──
  frame('big-numeral', 'divider', ['section-stack', 'blank'], ['tls.c.chapter-divider', 'tls.c.divider'], 'neutral', 'poster', 'section-divider', 'the section number set huge'),
  frame('chapter-question', 'divider', ['section-stack'], ['tls.c.chapter-divider', 'tls.t.statement'], 'lively', 'poster', 'section-title', 'the section opens with its question'),
  frame('progress-journey', 'divider', ['band', 'timeline'], ['tls.g.chevrons', 'tls.g.steps', 'tls.c.journey'], 'neutral', 'diagram', 'section-divider', 'where we are on the route'),
  frame('color-field', 'divider', ['blank'], ['tls.c.divider', 'tls.c.full-bleed-type'], 'calm', 'poster', 'section-divider', 'a full colour field with the section title'),
  frame('quote-divider', 'divider', ['quote', 'section-stack'], ['tls.t.quote', 'tls.t.pull-quote', 'tls.c.title-card'], 'calm', 'poster', 'section-title', 'a quote opens the section'),

  // ── summary (4) ──
  frame('three-things', 'summary', ['timeline', 'three-column'], ['tls.c.takeaway-poster', 'tls.c.recap', 'tls.c.cards'], 'neutral', 'dense', 'content-cards', 'three things to remember'),
  frame('recap-map', 'summary', ['timeline'], ['tls.g.mindmap', 'tls.g.hub-spoke', 'tls.g.orbit'], 'neutral', 'diagram', 'content-cards', 'the ideas of the deck on one map'),
  frame('checklist-recap', 'summary', ['timeline', 'two-column'], ['tls.t.checklist', 'tls.c.objectives'], 'calm', 'dense', 'content-icon-list-image', 'the objectives ticked off'),
  frame('before-after-learning', 'summary', ['comparison', 'timeline'], ['tls.g.before-after'], 'lively', 'dense', 'comparison-before-after', 'what we knew before, what we know now'),

  // ── Q&A (3) ──
  frame('question-wall', 'qa', ['timeline'], ['tls.c.question-wall', 'tls.t.tags', 'tls.t.qa'], 'lively', 'dense', 'section-title', 'questions people often ask'),
  frame('big-question', 'qa', ['section-stack', 'blank'], ['tls.c.one-question', 'tls.t.statement'], 'calm', 'poster', 'section-title', 'one large invitation to ask'),
  frame('discussion-prompts', 'qa', ['timeline', 'two-column'], ['tls.t.numbered', 'tls.m.icon-list', 'tls.c.quiz'], 'neutral', 'dense', 'section-title', 'prompts to discuss in pairs'),

  // ── closing (8) ──
  frame('one-question', 'closing', ['section-stack', 'blank'], ['tls.c.one-question', 'tls.t.statement'], 'calm', 'poster', 'closing-centered', 'leave one question with the audience'),
  frame('call-to-action', 'closing', ['blank', 'section-stack'], ['tls.c.cta', 'tls.c.closing', 'tls.c.hero'], 'lively', 'poster', 'closing-centered', 'one thing to do next'),
  frame('callback', 'closing', ['blank', 'section-stack'], ['tls.c.callback', 'tls.t.statement', 'tls.c.title-card', 'tls.c.big-stat'], 'neutral', 'poster', 'closing-centered', 'answer the cover: its question, its number, its image'),
  frame('takeaway-poster', 'closing', ['section-stack', 'blank'], ['tls.c.takeaway-poster', 'tls.t.takeaway', 'tls.t.statement'], 'calm', 'poster', 'closing-centered', 'the one takeaway, very large'),
  frame('homework', 'closing', ['timeline', 'two-column'], ['tls.c.homework', 'tls.t.checklist', 'tls.c.objectives'], 'neutral', 'dense', 'closing-centered', 'what to do before next time'),
  frame('contact', 'closing', ['two-column', 'blank'], ['tls.c.contact', 'tls.c.closing'], 'calm', 'dense', 'closing-split', 'who to contact (only with contact data from the brief or document)'),
  frame('next-steps-path', 'closing', ['timeline', 'band'], ['tls.c.steps', 'tls.g.chevrons', 'tls.g.steps'], 'neutral', 'dense', 'closing-centered', 'the actions to take, in order (only for a decision or a call to act)'),
  frame('thanks-motif', 'closing', ['blank', 'section-stack'], ['tls.c.closing', 'tls.t.statement'], 'lively', 'poster', 'closing-centered', 'thanks with the deck motif (playful decks, always with a takeaway)', ['tls.t.takeaway']),
]

const BY_ID = new Map(DESIGN_MOVES.map((m) => [m.id, m]))

export function findMove(id: string): DesignMove | undefined {
  return BY_ID.get(id)
}

/** The moves a frame role or the content slides can use. */
export function movesFor(role: FrameRole | 'content'): DesignMove[] {
  return DESIGN_MOVES.filter((m) => (role === 'content' ? m.kind === 'content' : m.frameRole === role))
}

/** The moves a block type can carry as the main block. */
export function movesOfBlock(type: string): string[] {
  return DESIGN_MOVES.filter((m) => m.main.includes(type)).map((m) => m.id)
}
