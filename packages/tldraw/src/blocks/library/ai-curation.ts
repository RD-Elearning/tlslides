/**
 * AC0 — AI curation metadata for every built-in block: `aiTier`, `absorbs`, `looks`.
 *
 * Source: `reviews/blocks/ai-curation/README.md` §1.2 (tier + look knobs per block) and §2.2
 * (the 45 tier-1 blocks, their key knobs and what each absorbs), approved 2026-10-09.
 *
 * Kept as one table rather than spread over 129 definition files on purpose: the tier-1 set is
 * a *curated* list (35–48 entries, ratcheted by `catalog-conformance.spec.ts`), and a curated
 * list is reviewed as a whole. `applyAiCuration()` copies each row onto its definition object
 * once, when `library/index.ts` builds `BUILT_IN_BLOCKS`, so `def.aiTier` / `def.absorbs` /
 * `def.looks` read like any other definition field.
 *
 * Rules (enforced by the conformance spec):
 * - every built-in block has a row;
 * - `absorbs` names exist and are tier 2, and each absorbed block's `describe.avoid` names one of
 *   its tier-1 absorbers;
 * - `looks` names are `option` slots of kind `enum` or `boolean` in the block's schema.
 */

import type { BlockDefinition } from '../types'

export interface AiCuration {
  aiTier: 1 | 2
  absorbs?: string[]
  looks?: string[]
}

const t1 = (looks: string[] = [], absorbs: string[] = []): AiCuration => ({
  aiTier: 1,
  ...(absorbs.length ? { absorbs } : {}),
  ...(looks.length ? { looks } : {}),
})
const t2 = (looks: string[] = []): AiCuration => ({ aiTier: 2, ...(looks.length ? { looks } : {}) })

export const AI_CURATION: Record<string, AiCuration> = {
  // ── structure (all tier 2: layout regions + recipes cover arrangement) ──
  'tls.l.stack': t2(['gap', 'sizing']),
  'tls.l.row': t2(['gap', 'sizing']),
  'tls.l.grid': t2(['gap', 'sizing']),
  'tls.l.split': t2(['gutter', 'axis']),
  'tls.l.overlay': t2(),
  'tls.l.card': t2(['padding']),
  'tls.l.section': t2(['showTitle', 'showDivider', 'gap']),
  'tls.l.repeater': t2(['direction', 'gap']),
  'tls.l.spacer': t2(),
  'tls.l.safe-area': t2(['inset']),
  'tls.l.grid-guide': t2(),
  'tls.l.sidebar': t2(['gutter', 'sidebarSide']),
  'tls.l.footer': t2(['gutter']),

  // ── decoration ──
  'tls.l.field': t2(),
  'tls.g.arrow': t2(['kind', 'direction', 'heads', 'weight', 'tone']),
  'tls.m.decoration': t1(['shape', 'tone', 'opacity']),
  'tls.m.pattern': t2(['pattern', 'scale', 'tone', 'opacity']),
  'tls.x.rule': t2(['axis', 'weight', 'tone', 'length']),

  // ── heading ──
  'tls.t.title': t1(['size', 'align', 'rule'], ['tls.t.kicker']),
  'tls.t.subtitle': t2(['align']),
  'tls.t.kicker': t2(['case', 'tracking', 'marker']),

  // ── text ──
  'tls.t.body': t1(['align', 'autoFit'], ['tls.t.definition']),
  'tls.t.caption': t2(['align', 'position']),
  'tls.t.footnote': t1(['marker', 'align']),
  'tls.t.definition': t2(['layout', 'termTone', 'showPronunciation', 'showExample']),

  // ── list ──
  'tls.t.bullets': t1(['marker', 'spacing'], ['tls.t.numbered', 'tls.t.checklist', 'tls.t.tags']),
  'tls.t.numbered': t2(['markerStyle', 'spacing', 'columns', 'markerTone']),
  'tls.t.checklist': t2(['doneStyle', 'spacing', 'columns']),
  'tls.t.kv-list': t2(['leader', 'valueAlign', 'keyTone', 'columns']),
  'tls.t.tags': t2(['tone', 'shape', 'size', 'align', 'colorBy']),
  'tls.c.feature-grid': t1(['cell', 'align', 'iconStyle'], ['tls.m.icon-label', 'tls.c.feature-reveal']),
  'tls.c.cards': t1(['lead', 'tone', 'align'], ['tls.c.stat-card']),
  'tls.c.feature-reveal': t2(),
  'tls.m.icon-list': t1(['iconStyle', 'iconTone', 'spacing'], ['tls.m.icon-label']),

  // ── metric ──
  'tls.t.hero-number': t2(['format', 'emphasis']),
  'tls.d.progress-bar': t2(['showValue', 'thickness', 'tone', 'labelPos', 'track', 'format']),
  'tls.d.progress-ring': t2(['thickness', 'cap', 'tone', 'format']),
  'tls.d.stat-compare': t2(['format', 'delta', 'polarity', 'connector']),
  'tls.d.gauge': t2(['needle', 'showTicks', 'format']),
  'tls.d.trend-badge': t2(['format', 'polarity', 'size']),
  'tls.d.bullet-chart': t2(['bands', 'format']),
  'tls.c.kpi-tile': t2(['showDelta', 'showLabel', 'showSparkline', 'polarity', 'format']),
  'tls.c.kpi-row': t1(['gap'], ['tls.c.kpi-tile', 'tls.c.stat-card', 'tls.d.stat-compare', 'tls.d.trend-badge']),
  'tls.c.big-stat': t1(['format', 'showContext', 'showLabel'], ['tls.t.hero-number']),
  'tls.c.stat-card': t2(['showIcon', 'format', 'emphasis', 'padding']),
  'tls.c.dashboard': t2(['layout', 'chartRatio', 'showInsight']),
  'tls.c.stat-spotlight': t1([], ['tls.d.progress-ring', 'tls.d.gauge', 'tls.d.progress-bar']),

  // ── emphasis ──
  'tls.t.quote': t1(['markStyle']),
  'tls.t.takeaway': t1(['tone', 'size'], ['tls.t.callout']),
  'tls.t.statement': t1(['size', 'align', 'emphasis', 'showMark'], ['tls.t.callout']),
  'tls.t.callout': t2(['variant', 'fill', 'showIcon', 'showTitle']),
  'tls.c.quote-image': t2(['anchor', 'scrim']),

  // ── learning ──
  'tls.t.qa': t2(['marker']),
  'tls.c.quiz': t2(['layout', 'reveal', 'showExplanation']),

  // ── chart ──
  'tls.d.bar': t1(['orientation', 'valueLabels']),
  'tls.d.donut': t1(['labels', 'showPercent'], ['tls.d.pie']),
  'tls.d.line': t1(['curve', 'markers', 'endLabels', 'legend'], ['tls.d.area', 'tls.d.sparkline', 'tls.d.slope']),
  'tls.d.area': t2(['mode', 'curve', 'opacity', 'gridlines', 'format', 'legend']),
  'tls.d.grouped-bar': t1(['orientation', 'valueLabels', 'legend'], ['tls.d.stacked-bar']),
  'tls.d.stacked-bar': t2(['orientation', 'normalize', 'totals', 'valueLabels', 'gridlines', 'format', 'legend']),
  'tls.d.pie': t2(['labels', 'showPercent', 'sort']),
  'tls.d.sparkline': t2(['fill', 'endDot', 'showLast', 'format']),
  'tls.d.waterfall': t2(['connectors', 'colorBy', 'valueLabels', 'gridlines', 'format']),
  'tls.d.funnel-chart': t2(['shape', 'showDropoff', 'format']),
  'tls.d.scatter': t2(['quadrants', 'trendline', 'labelPoints', 'gridlines', 'format', 'legend']),
  'tls.d.radar': t2(['fill', 'legend']),
  'tls.d.slope': t2(['highlight', 'format']),
  'tls.d.bubble': t2(['sizeLegend', 'gridlines', 'format']),
  'tls.d.heatmap': t2(['ramp', 'showValues', 'format']),
  'tls.c.chart-insight': t1(['side', 'ratio', 'showSource', 'insightSize'], ['tls.c.dashboard']),

  // ── table ──
  'tls.d.table': t1(['zebra', 'rules', 'header', 'density'], ['tls.d.scorecard', 'tls.d.ranking', 'tls.t.kv-list']),
  'tls.d.scorecard': t2(['showTarget', 'statusStyle', 'showNote']),
  'tls.d.ranking': t2(['showBars', 'medals', 'sort', 'format']),

  // ── comparison ──
  'tls.d.compare-table': t1(['cellKind', 'zebra', 'density']),
  'tls.d.pricing': t1(['featuredStyle', 'align', 'showCta']),
  'tls.g.matrix-2x2': t1(['highlight', 'style', 'showItems'], ['tls.g.swot']),
  'tls.g.swot': t2(['style', 'letters']),
  'tls.g.pros-cons': t1(['style', 'balance', 'showVerdict']),
  'tls.g.before-after': t1(['arrow', 'emphasis'], ['tls.c.problem-solution', 'tls.m.image-compare', 'tls.g.iceberg']),
  'tls.g.iceberg': t2(['waterline']),
  'tls.c.comparison': t1([], ['tls.c.case-study']),
  'tls.c.case-study': t2(['layout', 'emphasis', 'showMetric', 'showClient']),
  'tls.c.problem-solution': t2(['showIcons', 'style']),

  // ── process ──
  'tls.g.steps': t2(['direction', 'connector']),
  'tls.g.chevrons': t1(['fill', 'textPlacement']),
  'tls.g.cycle': t2(['direction', 'nodeStyle', 'arrowStyle', 'showCenter', 'showText']),
  'tls.g.funnel': t2(['orientation', 'notes']),
  'tls.g.flow': t2(['direction', 'routing']),
  'tls.c.steps': t1(['orientation'], ['tls.g.steps', 'tls.g.cycle', 'tls.g.flow']),

  // ── timeline ──
  'tls.g.timeline': t1(['axis', 'alternate', 'nodeStyle'], ['tls.g.milestones', 'tls.c.journey']),
  'tls.g.roadmap': t1(['statusColors', 'laneLabels']),
  'tls.g.milestones': t2(['axis', 'labels']),
  'tls.c.journey': t2(),

  // ── hierarchy ──
  'tls.g.tree': t1(['direction', 'nodeStyle', 'compact'], ['tls.g.hub-spoke', 'tls.g.mindmap']),
  'tls.g.pyramid': t1(['direction', 'notes', 'fill'], ['tls.g.layers', 'tls.g.breakdown']),
  'tls.g.layers': t2(['style', 'notes']),
  'tls.g.breakdown': t2(['direction', 'showShare']),
  'tls.g.mindmap': t2(['balance', 'curve']),

  // ── relationship ──
  'tls.g.venn': t2(['opacity', 'labels']),
  'tls.g.hub-spoke': t2(['layout', 'connector']),
  'tls.g.bracket': t2(['side', 'style']),

  // ── cover ──
  'tls.c.hero': t1(['variant', 'showKicker', 'showSubtitle', 'showCta'], ['tls.t.kicker', 'tls.t.subtitle']),
  'tls.c.cover': t1(['variant', 'decoration', 'showImage', 'showLogo']),
  'tls.c.kinetic-title': t1(['align', 'decoration']),

  // ── media ──
  'tls.c.image-text': t1(['placement', 'gutter']),
  'tls.m.image': t1(['fit'], ['tls.m.device-mock']),
  'tls.m.icon': t2(['size']),
  'tls.m.icon-label': t2(['size']),
  'tls.m.image-grid': t1(['pattern', 'cols', 'gap', 'radius', 'captions']),
  'tls.m.image-compare': t2(['mode', 'divider']),
  'tls.m.device-mock': t2(['device', 'tone', 'shadow']),

  // ── agenda ──
  'tls.c.agenda': t1([], ['tls.c.objectives', 'tls.t.numbered', 'tls.t.checklist']),
  'tls.c.objectives': t2(['marker', 'cols', 'showIntro']),

  // ── people ──
  'tls.c.testimonial': t1(['variant'], ['tls.c.quote-image']),
  'tls.c.profile-card': t2(['layout', 'tone', 'showBio', 'showContact']),
  'tls.c.team': t1(['cols', 'card', 'showBio'], ['tls.c.profile-card', 'tls.m.avatar', 'tls.m.avatar-group']),
  'tls.m.avatar': t2(['shape', 'size', 'layout', 'align', 'ring', 'showName', 'showRole']),
  'tls.m.avatar-group': t2(['size', 'overlap']),

  // ── divider ──
  'tls.c.divider': t1(['variant', 'align']),

  // ── closing ──
  'tls.c.closing': t1(['variant', 'ctaStyle'], ['tls.c.contact', 'tls.c.recap']),
  'tls.c.recap': t2(['style']),
  'tls.c.contact': t2(['showPerson']),

  // ── brand ──
  'tls.m.logo': t2(['maxHeight', 'align', 'plate']),
  'tls.m.logo-wall': t1(['cols', 'plates', 'dividers'], ['tls.m.logo']),

  // ── chrome (placed by style masters, AC1+) ──
  'tls.x.page-number': t2(['align']),
  'tls.x.footer-text': t2(['align', 'separator', 'showRule']),
  'tls.x.logo-mark': t2(['size', 'corner']),
  'tls.x.header': t2(['showRule', 'tone']),
  'tls.x.watermark': t2(['opacity']),
}

/**
 * Copy the curation row onto each definition (in place, so registry identity is kept). A block
 * without a row is left untouched; the conformance spec fails on it.
 */
export function applyAiCuration(defs: BlockDefinition[]): BlockDefinition[] {
  for (const def of defs) {
    const row = AI_CURATION[def.type]
    if (!row) continue
    def.aiTier = row.aiTier
    if (row.absorbs) def.absorbs = [...row.absorbs]
    if (row.looks) def.looks = [...row.looks]
  }
  return defs
}
