/**
 * AC7 — the scripted S2a→S4.1 dry run (`reviews/blocks/ai-curation/README.md` §5, §6 AC7).
 *
 * No LLM: a fixed outline, a deterministic recipe picker (stands in for S2a), a filler that swaps
 * the outline headline into each recipe's title slot (stands in for S3), the layout oracle with at
 * most three repair rounds (S4.1), and a measurement of the S2a prompt sections against §5.2.
 * `tools/layout-report/dry-run.js` is the CLI around it; `dry-run.spec.ts` asserts it stays clean.
 *
 * Pure and DOM-free: the registry, recipes, styles and the oracle only.
 */
import { AI_HIDDEN_TYPES, capabilityIndex } from '../capability-digest'
import { analyzeDeck } from '../layout-report'
import type { LayoutReport } from '../layout-report'
import { RECIPE_ROLES, assetsAllow, recipeSlide, recipesFor } from '../recipes'
import type { RecipeRole, SlideAssets, SlideRecipe } from '../recipes'
import { deckTitleSize, slideQuality } from './quality'
import { DESIGN_CODES } from '../design-checks'
import type { SlideQuality } from './quality'
import { applyDeckLook, deckLook, lookCandidates, lookSignature, pickOrder } from './variety'
import type { DeckLook, LookCandidate } from './variety'
import type { BlockRegistry } from '../registry'
import { BUILT_IN_STYLES, getDeckStyle, styleCard } from '../styles'
import type { BlockSpec, DeckSpec, DeckStyle, SlideSpec } from '../types'
import { validateDeckSpec, defaultBlockRegistry } from '../validate-deck-spec'

/** One S1 outline entry. */
export interface OutlineEntry {
  role: RecipeRole
  headline: string
  keyMessage: string
  /** AC8.5: a short label above the headline (cover kicker). */
  kicker?: string
  /** AC8.5: what this slide's content has, over the deck's `DryRunOptions.assets`. */
  assets?: Partial<SlideAssets>
}

/**
 * AC8.5 — what the dry run's content provides (the S1 outline's assets): photos, portraits and
 * chart data, no logos (the example logo URLs do not load offline, and a client list was never
 * part of this outline).
 */
export const DRY_RUN_ASSETS: SlideAssets = { images: true, logos: false, portraits: true, chartData: true }

/** The fixed 12-slide outline: one topic, the ten planner roles (data and content twice). */
export const DRY_RUN_OUTLINE: readonly OutlineEntry[] = [
  { role: 'cover', headline: 'Expanding Pulse analytics to mid-market teams', keyMessage: 'A focused plan to win the 200 to 2,000 employee segment', kicker: 'Quarterly review' },
  { role: 'agenda', headline: 'Agenda', keyMessage: 'Five questions we answer today' },
  { role: 'section', headline: 'Why mid-market, why now', keyMessage: 'The segment is under-served and ready to buy' },
  { role: 'content', headline: 'Mid-market teams outgrow spreadsheets', keyMessage: 'They need shared metrics without a data team' },
  { role: 'data', headline: 'Pipeline grew 3x in two quarters', keyMessage: 'Mid-market leads now drive most new pipeline' },
  { role: 'comparison', headline: 'Build in-house or buy Pulse', keyMessage: 'Buying is faster and cheaper over two years' },
  { role: 'process', headline: 'A three-phase rollout', keyMessage: 'Pilot, expand, then self-serve' },
  { role: 'people', headline: 'The team behind the launch', keyMessage: 'Product, data and customer success work as one squad' },
  { role: 'data', headline: 'Net retention reached 118%', keyMessage: 'Existing accounts keep expanding after year one' },
  { role: 'quote', headline: 'Customers want answers, not dashboards', keyMessage: 'The market is asking for guided insight' },
  { role: 'content', headline: 'What we need from leadership', keyMessage: 'Budget, two hires and one design partner' },
  { role: 'closing', headline: 'Thank you', keyMessage: 'Questions and next steps' },
]

/** §5.2 targets in characters; `total` is the spec ceiling. */
export const PROMPT_BUDGET = { header: 1200, styleCard: 1200, recipes: 3000, tier1: 7000, tier2: 1500, icons: 1300, total: 16000 } as const

export interface PromptSections {
  header: number
  styleCard: number
  recipes: number
  tier1: number
  tier2: number
  icons: number
  total: number
}

export interface Repair {
  slide: number
  round: number
  action: 'next-recipe' | 'shorten-headline'
  from: string
  to: string
  detail: string
}

export interface StyleRunResult {
  style: string
  /** AC8: the variety seed this deck was picked with. */
  seed: number
  deck: DeckSpec
  slides: number
  recipes: string[]
  /** AC8: `recipe/variant` per slide. */
  designs: string[]
  /** AC8: the look signature per slide (`pipeline/variety.ts`). */
  signatures: string[]
  /** AC8: candidates per slide (the role's designs the style allows). */
  candidates: number[]
  /** AC8: slides whose signature repeats an earlier slide's although the role had another unused design. */
  avoidableRepeats: number
  /** AC8: the deck-level look (title treatment) the seed chose. */
  deckLook: DeckLook
  repairs: Repair[]
  errors: number
  warnings: number
  needsVisualCheck: number
  /** Slides where no title slot took the outline headline. */
  exampleKept: number
  /** Every error/warning left, `slide N code: message`. */
  findings: string[]
  /** AC8.5: the quality gate per slide (`pipeline/quality.ts`). */
  quality: SlideQuality[]
  /** AC8.5: every quality finding left, `slide N code: message`. */
  qualityFindings: string[]
  /** All roles' recipes in the prompt (what the tier-1 index holds). */
  prompt: PromptSections
  /** The largest S2a prompt when only the slide's own role's recipes are sent (§5.2 "or all"). */
  promptPerRole: PromptSections & { role: RecipeRole }
}

export interface DryRunOptions {
  registry?: BlockRegistry
  outline?: readonly OutlineEntry[]
  /** AC8: the variety seed (default 0). Same seed, same deck; nearby seeds, different decks. */
  seed?: number
  /** AC8: signatures to avoid while another design exists (e.g. the user's recent decks). */
  avoidSignatures?: Iterable<string>
  /** AC8: palette id (default the style's first). */
  theme?: string
  /** AC8.5: the deck's content assets (default `DRY_RUN_ASSETS`); an outline entry's `assets`
   *  override it per slide. The picker only offers designs whose needs are present. */
  assets?: Partial<SlideAssets>
}

/** Where a block type takes a headline: its prop, and whether that prop is rich text. */
const TITLE_SLOTS: Record<string, { prop: string; rich: boolean }> = {
  'tls.t.title': { prop: 'text', rich: true },
  'tls.c.hero': { prop: 'title', rich: true },
  'tls.c.cover': { prop: 'title', rich: false },
  'tls.c.kinetic-title': { prop: 'title', rich: false },
  'tls.c.divider': { prop: 'title', rich: false },
  'tls.c.closing': { prop: 'title', rich: false },
  'tls.c.image-text': { prop: 'title', rich: false },
  'tls.c.image-full': { prop: 'title', rich: false },
  'tls.t.statement': { prop: 'text', rich: false },
}

/**
 * AC8.5 — the other slots S3 writes from the outline: the key message under the headline, the
 * kicker above it, a big number's caption. Before AC8.5 these kept the block's example text
 * ("Centre, spread and shape", a Vietnamese kinetic subtitle) on every dry-run deck.
 */
const MESSAGE_SLOTS: Record<string, Array<{ prop: string; from: 'keyMessage' | 'headline' | 'kicker'; rich?: boolean }>> = {
  'tls.c.hero': [{ prop: 'subtitle', from: 'keyMessage', rich: true }, { prop: 'kicker', from: 'kicker' }],
  'tls.c.cover': [{ prop: 'subtitle', from: 'keyMessage' }, { prop: 'kicker', from: 'kicker' }],
  'tls.c.kinetic-title': [{ prop: 'subtitle', from: 'keyMessage' }, { prop: 'kicker', from: 'kicker' }],
  'tls.c.divider': [{ prop: 'subtitle', from: 'keyMessage' }],
  'tls.c.closing': [{ prop: 'text', from: 'keyMessage' }],
  'tls.t.statement': [{ prop: 'attribution', from: 'keyMessage' }],
  'tls.c.big-stat': [{ prop: 'label', from: 'headline' }, { prop: 'context', from: 'keyMessage' }],
  // AC8.6: the section message under a section-title's display title (the only recipe with a body).
  'tls.t.body': [{ prop: 'text', from: 'keyMessage', rich: true }],
  // AC8.6: the key message under the spotlight's label (the example has no context line).
  'tls.c.stat-spotlight': [{ prop: 'context', from: 'keyMessage' }],
  'tls.c.image-full': [{ prop: 'text', from: 'keyMessage' }],
  'tls.c.image-text': [{ prop: 'body', from: 'keyMessage' }],
}

/** Block types whose message slot carries the headline when the recipe has no title slot. */
const HEADLINE_CARRIERS = new Set(['tls.c.big-stat'])

/** Recipes the style allows: tier-1 blocks only, none of the style's `avoid` types or editor-only guides. */
export function eligibleRecipes(role: RecipeRole, style: DeckStyle, registry: BlockRegistry): SlideRecipe[] {
  const dropped = new Set<string>([...style.avoid, ...AI_HIDDEN_TYPES])
  return recipesFor(role).filter((r) =>
    Object.values(r.regions).every((blocks) => blocks.every((blk) => !dropped.has(blk.type) && registry.get(blk.type)?.aiTier === 1))
  )
}

/** Shorten a headline to its first ~60 % of words (at least two). */
export function shortenHeadline(headline: string): string {
  const words = headline.split(/\s+/).filter(Boolean)
  if (words.length <= 2) return headline
  return words.slice(0, Math.max(2, Math.ceil(words.length * 0.6))).join(' ')
}

/** S3 stand-in: the recipe filled from examples, the headline put in every title slot. */
export function fillSlide(
  recipe: SlideRecipe,
  headline: string,
  registry: BlockRegistry,
  id: string,
  variant?: string,
  style?: DeckStyle,
  look?: DeckLook,
  entry?: Pick<OutlineEntry, 'keyMessage' | 'kicker'>
): { slide: SlideSpec; titled: boolean } {
  const raw = recipeSlide(recipe, registry, variant, style)
  const base = look ? applyDeckLook(raw, look, recipe, variant) : raw
  // block ids are unique across the whole deck (validator rule block/duplicate-id)
  const slide: SlideSpec = {
    ...base,
    id,
    regions: Object.fromEntries(Object.entries(base.regions ?? {}).map(([n, bs]) => [n, bs.map((b) => ({ ...b, id: `${id}_${b.id}` }))])),
  }
  let titled = false
  const regions: Record<string, BlockSpec[]> = {}
  for (const [name, blocks] of Object.entries(slide.regions ?? {})) {
    regions[name] = blocks.map((blk) => {
      const slot = TITLE_SLOTS[blk.type]
      const extra = entry ? MESSAGE_SLOTS[blk.type] ?? [] : []
      if (!slot && !extra.length) return blk
      const props: Record<string, unknown> = { ...(blk.props ?? {}) }
      if (slot) {
        titled = true
        props[slot.prop] = slot.rich ? { runs: [{ text: headline }] } : headline
        if (blk.type === 'tls.c.kinetic-title') props.highlight = headline.split(/\s+/).slice(-1)[0]
      }
      for (const m of extra) {
        const text = m.from === 'headline' ? headline : m.from === 'kicker' ? entry?.kicker ?? '' : entry?.keyMessage ?? ''
        if (m.from === 'kicker' && !text) continue
        props[m.prop] = m.rich ? { runs: [{ text }] } : text
        if (m.from === 'headline' && HEADLINE_CARRIERS.has(blk.type)) titled = true
      }
      return { ...blk, id: blk.id, props }
    })
  }
  return { slide: { ...slide, regions }, titled }
}

function deckOf(style: DeckStyle, slides: SlideSpec[], seed = 0, theme?: string): DeckSpec {
  return {
    version: 1,
    id: `dryrun-${style.id}${seed ? `-s${seed}` : ''}`,
    title: `Dry run — ${style.id}${seed ? ` (seed ${seed})` : ''}`,
    theme: theme ?? style.palettes[0].id,
    style: style.id,
    aspect: 'widescreen',
    slides,
  }
}

/** The oracle's geometry findings (the design checks are the quality gate's, CMP2). */
function bad(report: LayoutReport): string[] {
  return report.findings
    .filter((f) => f.severity !== 'info' && !(DESIGN_CODES as readonly string[]).includes(f.code))
    .map((f) => `${f.severity} ${f.code}: ${f.message}`)
}

/** Measure the S2a prompt for one style against §5.2: the tier-1 index split into its sections plus the style card. */
export function measurePrompt(style: DeckStyle, registry: BlockRegistry, roles?: RecipeRole[]): PromptSections {
  const index = capabilityIndex(registry, { tier: 1, style: style.id, ...(roles ? { roles } : {}) })
  const lines = index.split('\n')
  const len = (ls: string[]) => ls.length ? ls.join('\n').length + 1 : 0
  const header: string[] = []
  const styles: string[] = []
  const recipes: string[] = []
  const tier1: string[] = []
  const tier2: string[] = []
  const icons: string[] = []
  let mode: 'header' | 'styles' | 'recipes' | 'cats' | 'icons' = 'header'
  for (const line of lines) {
    if (line === '## Styles') mode = 'styles'
    else if (line === '## Recipes') mode = 'recipes'
    else if (line === '## Icons') mode = 'icons'
    else if (line.startsWith('## ') && mode !== 'header') mode = 'cats'
    const target = mode === 'header' ? header : mode === 'styles' ? styles : mode === 'recipes' ? recipes : mode === 'icons' ? icons : line.startsWith('also: ') ? tier2 : tier1
    target.push(line)
  }
  const card = styleCard(style)
  const sections = {
    // the index preamble plus its own "## Styles" section (one line for the chosen style)
    header: len(header) + len(styles),
    styleCard: card.length + 1,
    recipes: len(recipes),
    tier1: len(tier1),
    tier2: len(tier2),
    icons: len(icons),
  }
  return { ...sections, total: Object.values(sections).reduce((a, b) => a + b, 0) }
}

/** The worst case over roles of the prompt with only that role's recipes. */
function perRolePrompt(style: DeckStyle, registry: BlockRegistry): PromptSections & { role: RecipeRole } {
  let worst: (PromptSections & { role: RecipeRole }) | undefined
  for (const role of RECIPE_ROLES) {
    const p = measurePrompt(style, registry, [role])
    if (!worst || p.total > worst.total) worst = { ...p, role }
  }
  return worst as PromptSections & { role: RecipeRole }
}

/** Run the whole pick, fill and repair loop for one style. `_styleIndex` is kept for AC7 callers
 *  (AC8: the start of each role's rotation is a hash of the style id and the seed instead). */
export function runStyle(style: DeckStyle, _styleIndex: number, opts: DryRunOptions = {}): StyleRunResult {
  const registry = opts.registry ?? defaultBlockRegistry()
  const outline = opts.outline ?? DRY_RUN_OUTLINE
  const seed = opts.seed ?? 0
  const avoid = new Set(opts.avoidSignatures ?? [])
  const look = deckLook(style, seed)
  const repairs: Repair[] = []
  const used: string[] = []
  const designs: string[] = []
  const signatures: string[] = []
  const candidateCounts: number[] = []
  const usedSigs = new Set<string>()
  const seen: Partial<Record<RecipeRole, number>> = {}
  let exampleKept = 0
  let avoidableRepeats = 0
  // CMP2: the dry run stands in for the LLM — its slides are LLM-authored (`nesting/too-deep`).
  const analyze = (slide: SlideSpec) => analyzeDeck(deckOf(style, [slide], seed, opts.theme), { registry, llmAuthored: true })[0]
  // AC8.5: the quality gate is part of S4.1 — a design that looks unfinished is repaired like a warning.
  const titleSize = deckTitleSize(deckOf(style, [], seed, opts.theme))
  const problems = (report: LayoutReport) => [...bad(report), ...slideQuality(report, { titleSize }).findings.map((f) => `quality ${f.code}: ${f.message}`)]
  const deckAssets = opts.assets ?? DRY_RUN_ASSETS

  const slides = outline.map((entry, i) => {
    const eligible = eligibleRecipes(entry.role, style, registry)
    if (!eligible.length) throw new Error(`style ${style.id}: no eligible recipe for role ${entry.role}`)
    // AC8.5: only designs whose asset needs the slide's content meets (all of them if none does).
    const assets = { ...deckAssets, ...(entry.assets ?? {}) }
    const all = lookCandidates(eligible, style, registry, look)
    const fit = all.filter((c) => assetsAllow(c.recipe, c.variant, assets))
    const candidates = fit.length ? fit : all
    candidateCounts.push(candidates.length)
    // S2a stand-in (AC8 variety): rotate from a seeded start, fresh signatures first.
    const nth = seen[entry.role] ?? 0
    seen[entry.role] = nth + 1
    const order = pickOrder(candidates, style.id, entry.role, seed, nth, { used: usedSigs, avoid, previousRecipe: used[i - 1] })
    const id = `s${String(i + 1).padStart(2, '0')}`
    let at = 0
    let cand: LookCandidate = order[0]
    let headline = entry.headline
    const fill = () => fillSlide(cand.recipe, headline, registry, id, cand.variant, style, look, entry)
    let filled = fill()
    let report = analyze(filled.slide)
    // S4.1 stand-in: at most 3 repair rounds — next design in the order, then a shorter headline.
    let best = { filled, cand, headline, count: problems(report).length, report }
    for (let round = 1; round <= 3 && problems(report).length; round++) {
      let action: Repair['action']
      const from = `${cand.recipe.id}/${cand.variant}`
      // AC8.5: a slide that only fails the quality gate gets another design, never a cut headline
      // (shortening "Why mid-market, why now" to "Why mid-market, why" does not make it look finished)
      const qualityOnly = !bad(report).length
      if ((round !== 2 || qualityOnly) && order.length > 1) {
        action = 'next-recipe'
        at = (at + 1) % order.length
        cand = order[at]
      } else {
        action = 'shorten-headline'
        headline = shortenHeadline(headline)
      }
      filled = fill()
      report = analyze(filled.slide)
      repairs.push({ slide: i + 1, round, action, from, to: `${cand.recipe.id}/${cand.variant}`, detail: action === 'next-recipe' ? problems(best.report)[0] ?? '' : `"${headline}"` })
      if (problems(report).length < best.count || !best.count) best = { filled, cand, headline, count: problems(report).length, report }
    }
    // Keep the cleanest variant seen (the last when it is clean).
    if (!problems(report).length) best = { filled, cand, headline, count: 0, report }
    if (!best.filled.titled) exampleKept++
    const sig = lookSignature(best.filled.slide, style, registry)
    if (usedSigs.has(sig) && candidates.some((c) => !usedSigs.has(c.signature))) avoidableRepeats++
    usedSigs.add(sig)
    used.push(best.cand.recipe.id)
    designs.push(`${best.cand.recipe.id}/${best.cand.variant}`)
    signatures.push(sig)
    return best.filled.slide
  })

  const deck = deckOf(style, slides, seed, opts.theme)
  const reports = analyzeDeck(deck, { registry, llmAuthored: true })
  const findings: string[] = []
  let errors = 0
  let warnings = 0
  reports.forEach((r, i) => {
    for (const f of r.findings) {
      if (f.severity === 'error') errors++
      else if (f.severity === 'warning') warnings++
      if (f.severity !== 'info') findings.push(`slide ${i + 1} ${f.severity} ${f.code}: ${f.message}`)
    }
  })
  const quality = reports.map((r) => slideQuality(r, { titleSize }))
  const qualityFindings = quality.flatMap((q, i) => q.findings.map((f) => `slide ${i + 1} ${f.code}: ${f.message}`))
  for (const f of validateDeckSpec(deck, registry)) {
    if (f.level === 'error') errors++
    else warnings++
    findings.push(`validate ${f.level} ${f.rule} ${f.path}: ${f.message}`)
  }
  return {
    style: style.id,
    seed,
    deck,
    slides: slides.length,
    recipes: used,
    designs,
    signatures,
    candidates: candidateCounts,
    avoidableRepeats,
    deckLook: look,
    repairs,
    errors,
    warnings,
    needsVisualCheck: reports.filter((r) => r.needsVisualCheck.length).length,
    exampleKept,
    findings,
    quality,
    qualityFindings,
    prompt: measurePrompt(style, registry),
    promptPerRole: perRolePrompt(style, registry),
  }
}

/** The dry run for the given style ids (default: all ten built-in styles). */
export function runDryRun(styleIds?: readonly string[], opts: DryRunOptions = {}): StyleRunResult[] {
  const out: StyleRunResult[] = []
  BUILT_IN_STYLES.forEach((style, i) => {
    if (!styleIds || styleIds.includes(style.id)) out.push(runStyle(getDeckStyle(style.id) ?? style, i, opts))
  })
  return out
}

/** AC8 — the share of slide positions (0..1) whose look signatures differ between two decks. */
export function signatureDiffer(a: readonly string[], b: readonly string[]): number {
  const n = Math.max(a.length, b.length)
  if (!n) return 0
  let d = 0
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) d++
  return d / n
}

/** AC8 — one style run with several seeds, and how different the decks came out. */
export interface VarietyReport {
  style: string
  seeds: number[]
  runs: StyleRunResult[]
  /** `signatureDiffer` for every pair of seeds, in order (1-2, 1-3, 2-3, …). */
  pairDiffer: number[]
  minDiffer: number
  /** Avoidable repeated signatures inside the decks, summed over the seeds. */
  avoidableRepeats: number
}

export interface VarietyOptions extends DryRunOptions {
  /** Seeds per style (default 1, 2, 3). */
  seeds?: readonly number[]
  /** Pass each seed's signatures on to the next as `avoidSignatures` (the "recent decks" use). */
  chainAvoid?: boolean
}

/** AC8 — the dry run for each style with N seeds (default all ten styles × seeds 1, 2, 3). */
export function runVariety(styleIds?: readonly string[], opts: VarietyOptions = {}): VarietyReport[] {
  const seeds = [...(opts.seeds ?? [1, 2, 3])]
  const out: VarietyReport[] = []
  BUILT_IN_STYLES.forEach((s, i) => {
    if (styleIds && !styleIds.includes(s.id)) return
    const style = getDeckStyle(s.id) ?? s
    const runs: StyleRunResult[] = []
    const recent: string[] = [...(opts.avoidSignatures ?? [])]
    for (const seed of seeds) {
      const r = runStyle(style, i, { ...opts, seed, avoidSignatures: opts.chainAvoid ? recent : opts.avoidSignatures })
      runs.push(r)
      recent.push(...r.signatures)
    }
    const pairDiffer: number[] = []
    for (let a = 0; a < runs.length; a++) for (let b = a + 1; b < runs.length; b++) pairDiffer.push(signatureDiffer(runs[a].signatures, runs[b].signatures))
    out.push({
      style: style.id,
      seeds,
      runs,
      pairDiffer,
      minDiffer: pairDiffer.length ? Math.min(...pairDiffer) : 1,
      avoidableRepeats: runs.reduce((a, r) => a + r.avoidableRepeats, 0),
    })
  })
  return out
}
