/**
 * 2026-10-24 — blocks that pick their type by their box (type tiers, `promoteToFit`) and honour
 * `style.typeStep`. `compileSlide` steps them down when a slide counts too many text sizes
 * (`harmonizeTypes`); a packed stack gives them the excess when its content is too tall.
 */
export const TIERED_BLOCK_TYPES: ReadonlySet<string> = new Set([
  'tls.g.timeline',
  'tls.g.tree',
  'tls.g.matrix-2x2',
  'tls.g.cycle',
  'tls.g.flow',
  'tls.g.venn',
  'tls.g.pyramid',
  'tls.g.mindmap',
  'tls.g.breakdown',
  'tls.g.layers',
  'tls.g.graph',
  'tls.c.agenda',
  'tls.c.kpi-row',
  'tls.c.kpi-tile',
  'tls.t.bullets',
  'tls.t.checklist',
  'tls.t.kv-list',
  'tls.t.qa',
  'tls.t.numbered',
  'tls.t.tags',
  'tls.m.icon-list',
])
