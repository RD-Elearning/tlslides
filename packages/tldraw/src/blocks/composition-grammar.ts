/**
 * CMP4 — the free-composition grammar (`reviews/blocks/composition/README.md` CMP4, SURVEY D2.6).
 *
 * Composition patterns (`patterns.ts`) are the main source of new designs. Beyond them, the LLM may
 * compose a slide itself, under a closed grammar the validator enforces
 * (`validateFreeComposition`: `validateDeckSpec` plus these rules); a slide that breaks it, or that the
 * oracle and the quality gate reject, falls back to the nearest pattern of its role
 * (`nearestPattern`). The rules:
 *
 * - `grammar/container`: containers are `tls.l.stack | row | grid | split | card | overlay` (and
 *   `tls.l.spacer` as an empty cell); a section, repeater, sidebar, … is not part of it.
 * - `grammar/depth`: at most 3 authored levels (a region block is level 1).
 * - `grammar/leaves`: at most 6 children per container.
 * - `grammar/scope`: inside a container only element-scope blocks the AI may use (atoms, text,
 *   small media and data marks); a composite (`tls.c.*`, a chart group) stands alone in a region.
 * - `grammar/peers`: the children of a row or a grid share one type (spacers aside): peers are
 *   peers.
 * - `grammar/style`: `BlockStyleSpec` fields the engine reads only (CMP1's honest fields).
 * - `grammar/accent` (spro compose PLAN.md B2): at most one focal accent (`tls.t.takeaway`,
 *   `tls.t.callout`) as a region block — a second one competes with the main structure.
 * - `grammar/decoration` (B6): at most one decorative region block (`tls.m.decoration`, `tls.m.pattern`).
 *
 * Connectors are checked by the validator's own `connector/*` rules (by block id, no coordinates).
 * Pure and DOM-free.
 */

import { AI_HIDDEN_TYPES } from './capability-digest'
import { useOf } from './library/block-fits'
import { eachBlock } from './recipes'
import type { RecipeRole, SlideRecipe } from './recipes'
import type { BlockRegistry } from './registry'
import type { BlockSpec, DeckSpec, SlideSpec } from './types'
import { validateDeckSpec } from './validate-deck-spec'
import type { DeckFinding } from './validate-deck-spec'

/** Containers the grammar allows. */
export const GRAMMAR_CONTAINERS: readonly string[] = ['tls.l.stack', 'tls.l.row', 'tls.l.grid', 'tls.l.split', 'tls.l.card', 'tls.l.panel', 'tls.l.overlay']
/** Authored levels a composition may use (region block = 1). */
export const GRAMMAR_MAX_DEPTH = 3
/** Children per container. */
export const GRAMMAR_MAX_CHILDREN = 8 // S11 (sprint 2026-11b): 6 → 8, for grids of small cells
/** The style fields the engine reads (CMP1). */
export const GRAMMAR_STYLE_FIELDS: readonly string[] = ['surface', 'on', 'accent', 'tone', 'radius', 'padding', 'gap', 'elevation', 'align']

/** S11: the split ratios a composition uses (one side leads: a third, two fifths, half, …). */
export const GRAMMAR_SPLIT_RATIOS: readonly number[] = [0.33, 0.4, 0.5, 0.6, 0.67]
/** S11-e: the share of a composition's leaves that carry content (not decoration): below the first an
 *  error, below the second a warning. */
export const GRAMMAR_MIN_CONTENT_SHARE = 0.5
export const GRAMMAR_GOOD_CONTENT_SHARE = 0.6

const SPACER = 'tls.l.spacer'
const PEER_CONTAINERS = new Set(['tls.l.row', 'tls.l.grid'])

export interface GrammarFinding {
  level: 'error' | 'warning'
  rule: 'grammar/container' | 'grammar/depth' | 'grammar/leaves' | 'grammar/scope' | 'grammar/peers' | 'grammar/template' | 'grammar/ratio' | 'grammar/content' | 'grammar/style' | 'grammar/accent' | 'grammar/decoration'
  /** e.g. `regions.content[0].props.children[2]`. */
  path: string
  message: string
}

const kids = (b: BlockSpec): BlockSpec[] | undefined => {
  const c = (b?.props as { children?: unknown } | undefined)?.children
  return Array.isArray(c) ? (c as BlockSpec[]) : undefined
}

/** The grammar findings of one slide (its region blocks that compose: containers). */
export function checkGrammar(slide: SlideSpec, registry: BlockRegistry, basePath = ''): GrammarFinding[] {
  const out: GrammarFinding[] = []
  const hidden = new Set<string>(AI_HIDDEN_TYPES)
  const style = (b: BlockSpec, path: string) => {
    if (!b.style || typeof b.style !== 'object') return
    for (const k of Object.keys(b.style)) {
      if (!GRAMMAR_STYLE_FIELDS.includes(k)) out.push({ level: 'warning', rule: 'grammar/style', path: `${path}.style.${k}`, message: `\`style.${k}\` is not read by the engine; use ${GRAMMAR_STYLE_FIELDS.join(', ')}.` })
    }
  }
  const strongPanels: string[] = []
  const visit = (b: BlockSpec, path: string, level: number) => {
    style(b, path)
    // S11-d: one focal panel per slide (an accent or inverted surface)
    const surf = (b.props as { surface?: unknown } | undefined)?.surface
    if (b.type === 'tls.l.panel' && (surf === 'accent' || surf === 'inverted')) strongPanels.push(path)
    const children = kids(b)
    const isContainer = b.type.startsWith('tls.l.')
    if (isContainer && b.type !== SPACER && !GRAMMAR_CONTAINERS.includes(b.type)) {
      out.push({ level: 'error', rule: 'grammar/container', path, message: `\`${b.type}\` is not a composition container; use one of ${GRAMMAR_CONTAINERS.join(', ')}.` })
    }
    if (level > GRAMMAR_MAX_DEPTH) {
      out.push({ level: 'error', rule: 'grammar/depth', path, message: `\`${b.id}\` is at level ${level}; a composition may nest ${GRAMMAR_MAX_DEPTH} levels (region block = 1). Flatten it, or pick a pattern.` })
    }
    if (level > 1) {
      const def = registry.get(b.type)
      const tier = def?.aiTier
      if (!isContainer && (!def || def.scope !== 'element' || hidden.has(b.type) || (tier !== 1 && tier !== 2))) {
        out.push({ level: 'error', rule: 'grammar/scope', path, message: `\`${b.type}\` cannot sit inside a container: only element blocks (atoms, text, small media) compose; a composite stands alone in a region.` })
      }
    }
    if (!children) return
    if (children.length > GRAMMAR_MAX_CHILDREN) {
      out.push({ level: 'error', rule: 'grammar/leaves', path, message: `\`${b.id}\` holds ${children.length} children; at most ${GRAMMAR_MAX_CHILDREN}. Split the content, or drop the weakest items.` })
    }
    if (PEER_CONTAINERS.has(b.type)) {
      const peers = children.filter((c) => c && typeof c.type === 'string' && c.type !== SPACER)
      // S11-b: cells (cards / panels) are peers when they repeat one template, whatever the cell type
      const cells = peers.length > 1 && peers.every((c) => CELL_TYPES.has(c.type))
      const types = cells ? [] : [...new Set(peers.map((c) => c.type))]
      if (types.length > 1) out.push({ level: 'error', rule: 'grammar/peers', path, message: `the children of \`${b.id}\` are peers and must share one type (found ${types.join(', ')}); wrap each in a \`tls.l.card\` or \`tls.l.panel\` with the same parts.` })
      const templates = [...new Set(peers.filter((c) => kids(c)).map((c) => templateOf(c)))]
      if (templates.length > 1) out.push({ level: 'warning', rule: 'grammar/template', path, message: `the cells of \`${b.id}\` differ (${templates.join(' | ')}): give every cell the same parts in the same order.` })
    }
    if (b.type === 'tls.l.split') {
      const r = Number((b.props as { ratio?: unknown } | undefined)?.ratio ?? 0.5)
      if (Number.isFinite(r) && !GRAMMAR_SPLIT_RATIOS.some((x) => Math.abs(x - r) < 0.011)) {
        const near = GRAMMAR_SPLIT_RATIOS.reduce((a, x) => (Math.abs(x - r) < Math.abs(a - r) ? x : a))
        out.push({ level: 'warning', rule: 'grammar/ratio', path: `${path}.props.ratio`, message: `ratio ${r} is not one of ${GRAMMAR_SPLIT_RATIOS.join(', ')}; use ${near}.` })
      }
    }
    children.forEach((c, i) => {
      const at = `${path}.props.children[${i}]`
      // a child with no type is a malformed answer: reported, never a crash (spro llm-eval
      // 2026-10-13: a model's child block without `type` made /check answer 500)
      if (!c || typeof c !== 'object' || typeof c.type !== 'string') {
        out.push({ level: 'error', rule: 'grammar/container', path: at, message: 'every child needs a `type` and `props`; this one has no type.' })
        return
      }
      visit(c, at, level + 1)
    })
  }
  const accents: string[] = []
  const decorations: string[] = []
  for (const [region, blocks] of Object.entries(slide.regions ?? {})) {
    blocks.forEach((b, i) => {
      if (!b || typeof b !== 'object' || typeof b.type !== 'string') return
      const path = `${basePath}regions.${region}[${i}]`
      if (FOCAL_ACCENTS.has(b.type)) accents.push(path)
      if (DECORATIONS.has(b.type)) decorations.push(path)
      visit(b, path, 1)
      // S11-e: a composition is content first — most of its leaves carry the slide's text or data
      if (kids(b) && b.type !== SPACER) {
        const leaves: string[] = []
        const walk = (x: BlockSpec) => {
          if (!x || typeof x !== 'object' || typeof x.type !== 'string') return
          const c = kids(x)
          if (c) c.forEach(walk)
          else if (x.type !== SPACER) leaves.push(x.type)
        }
        walk(b)
        const content = leaves.filter((t) => useOf(t) !== 'decor').length
        const share = leaves.length ? content / leaves.length : 1
        if (leaves.length >= 3 && share < GRAMMAR_GOOD_CONTENT_SHARE) {
          out.push({ level: share < GRAMMAR_MIN_CONTENT_SHARE ? 'error' : 'warning', rule: 'grammar/content', path, message: `only ${content} of ${leaves.length} parts of \`${b.id}\` carry content; a composition is mostly text, numbers and media from the passages — drop decoration or add the content.` })
        }
      }
    })
  }
  if (accents.length > 1) {
    out.push({ level: 'warning', rule: 'grammar/accent', path: accents[1], message: `${accents.length} takeaways or callouts on one slide; keep one accent beside the main structure (drop or merge the others).` })
  }
  if (strongPanels.length > 1) {
    out.push({ level: 'warning', rule: 'grammar/accent', path: strongPanels[1], message: `${strongPanels.length} accent or inverted panels on one slide; keep one focal panel (make the others base, alt or outline).` })
  }
  if (decorations.length > 1) {
    out.push({ level: 'warning', rule: 'grammar/decoration', path: decorations[1], message: `${decorations.length} decorative blocks on one slide; keep at most one.` })
  }
  return out
}

/** S11-b: the containers that make a cell of a row / grid. */
const CELL_TYPES = new Set(['tls.l.card', 'tls.l.panel', 'tls.l.stack'])
/** A cell's template: its child types in order (`tls.t.title+tls.t.body`). */
const templateOf = (c: BlockSpec): string => (kids(c) ?? []).map((x) => x?.type).join('+')

/** B2/B6: region-level blocks that count as the slide's one accent / one decoration. */
const FOCAL_ACCENTS = new Set(['tls.t.takeaway', 'tls.t.callout'])
const DECORATIONS = new Set(['tls.m.decoration', 'tls.m.pattern', 'tls.m.icon-cluster'])

/** The leaf types of a slide (a multiset as type → count). */
function leafTypes(regions: Record<string, readonly BlockSpec[]>): Map<string, number> {
  const m = new Map<string, number>()
  eachBlock(regions, (b) => {
    if (kids(b)) return
    m.set(b.type, (m.get(b.type) ?? 0) + 1)
  })
  return m
}

/**
 * The pattern design closest to a rejected free composition: the same role, then the most shared
 * leaf types (weighted Jaccard), then the same layout. `designs` are the role's eligible pattern
 * recipes (`eligibleRecipes(…)` filtered to `compose`); `undefined` when there are none.
 */
export function nearestPattern(slide: SlideSpec, role: RecipeRole, designs: readonly SlideRecipe[], build: (r: SlideRecipe, look: string) => SlideSpec): { recipe: SlideRecipe; look: string; score: number } | undefined {
  const mine = leafTypes(slide.regions ?? {})
  let best: { recipe: SlideRecipe; look: string; score: number } | undefined
  for (const r of designs) {
    if (r.role !== role || !r.compose) continue
    for (const look of ['base', ...(r.variants ?? []).map((v) => v.id)]) {
      const theirs = leafTypes(build(r, look).regions ?? {})
      let inter = 0
      let union = 0
      for (const t of new Set([...mine.keys(), ...theirs.keys()])) {
        inter += Math.min(mine.get(t) ?? 0, theirs.get(t) ?? 0)
        union += Math.max(mine.get(t) ?? 0, theirs.get(t) ?? 0)
      }
      const score = (union ? inter / union : 0) + (r.layout === slide.layout ? 0.05 : 0)
      if (!best || score > best.score) best = { recipe: r, look, score }
    }
  }
  return best
}

/**
 * The validator for an LLM's free composition: `validateDeckSpec`'s findings plus the grammar's,
 * in the same shape (`rule`, `path` from `slides[i]`, a message written as a fix instruction).
 */
export function validateFreeComposition(deck: DeckSpec, registry: BlockRegistry): DeckFinding[] {
  const out = validateDeckSpec(deck, registry)
  ;(deck.slides ?? []).forEach((slide, i) => {
    for (const f of checkGrammar(slide, registry, `slides[${i}].`)) out.push({ level: f.level, rule: f.rule, path: f.path, message: f.message })
  })
  return out
}
