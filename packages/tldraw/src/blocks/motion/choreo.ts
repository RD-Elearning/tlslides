/**
 * spro creative PLAN CR10 — choreography per design move (`SlideSpec.choreography`): the order the
 * slide's blocks reveal in, and the preset a block plays when the move asks for one. It fills the
 * motion of blocks that author none (the compiler's motion-style pass, `applyMotionStyle`), so an
 * authored `motion` always wins. Pure.
 *
 * | move | order | presets |
 * |---|---|---|
 * | diagram-hero, process-flow, cycle, journey | the diagram, then the rest | the diagram's own (edges draw, then nodes) |
 * | big-number, stat-hero, kpi-wall | the number, then its caption | count-up |
 * | versus, compare-split, before-after | both sides, then the rest | split-in |
 * | path, timeline-river, route-agenda | the route stop by stop | sweep-nodes |
 * | statement-poster, question-hook, quote-hero, one-question | the statement | words-in |
 * | quiz-check | the question, then the options (the answer is a click build, set by spro) | — |
 * | anything else | the title, the main block, then the support blocks | the block's own |
 */
import type { BlockSpec, MotionPresetId } from '../types'

interface Rule {
  /** Block types (prefix match on `tls.x.` style ids) that lead the reveal. */
  lead: (type: string) => boolean
  /** The preset the leading blocks play (absent: their own). */
  preset?: MotionPresetId
}

const isText = (t: string) => /^tls\.t\.(statement|big-statement|quote|highlight|speech-bubble)$/.test(t) || /^tls\.c\.(one-question|poster-cover|hook-cover|callback)$/.test(t)
const isDiagram = (t: string) => t.startsWith('tls.g.') || /^tls\.c\.(process|cycle|journey|steps|flow)/.test(t)
const isNumber = (t: string) => /stat|kpi|number|counter/.test(t)
const isSides = (t: string) => /compar|versus|before-after|pros-cons|split/.test(t)
const isRoute = (t: string) => /timeline|route|journey|roadmap|path|steps/.test(t)

const RULES: Record<string, Rule> = {
  'diagram-hero': { lead: isDiagram },
  'process-flow': { lead: isDiagram },
  cycle: { lead: isDiagram },
  journey: { lead: isDiagram },
  'big-number': { lead: isNumber, preset: 'count-up' },
  'stat-hero': { lead: isNumber, preset: 'count-up' },
  'kpi-wall': { lead: isNumber },
  versus: { lead: isSides, preset: 'split-in' },
  'compare-split': { lead: isSides, preset: 'split-in' },
  'before-after': { lead: isSides },
  path: { lead: isRoute, preset: 'sweep-nodes' },
  'timeline-river': { lead: isRoute, preset: 'sweep-nodes' },
  'route-agenda': { lead: isRoute },
  'statement-poster': { lead: isText, preset: 'words-in' },
  'question-hook': { lead: isText, preset: 'words-in' },
  'quote-hero': { lead: isText, preset: 'words-in' },
  'one-question': { lead: isText, preset: 'words-in' },
  'quiz-check': { lead: (t) => /title|question/.test(t) },
}

/** The moves with a choreography of their own (others: title, main, support). */
export const CHOREO_MOVES = Object.keys(RULES)

const isTitle = (t: string) => /^tls\.t\.(title|eyebrow|kicker)$/.test(t)

/**
 * The reveal order of `blocks` (indices into it) under `move`, starting from their reading order:
 * the move's leading blocks first (a statement move keeps its title in the lead), then the title,
 * then the rest in reading order. A move without a rule: titles first, then reading order.
 */
export function choreoOrder(move: string | undefined, blocks: BlockSpec[]): number[] {
  const idx = blocks.map((_, i) => i)
  const rule = move ? RULES[move] : undefined
  const rank = (b: BlockSpec) => (rule?.lead(b.type) ? 0 : isTitle(b.type) ? 1 : 2)
  return idx.sort((a, b) => rank(blocks[a]) - rank(blocks[b]) || a - b)
}

/** The preset a block plays under `move`, when the move asks for one and the block leads. */
export function choreoPreset(move: string | undefined, block: BlockSpec, available: (id: string) => boolean): MotionPresetId | undefined {
  const rule = move ? RULES[move] : undefined
  if (!rule?.preset || !rule.lead(block.type) || !available(rule.preset)) return undefined
  return rule.preset
}
