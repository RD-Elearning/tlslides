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
import { RECIPE_ROLES, recipeSlide, recipesFor } from '../recipes'
import type { RecipeRole, SlideRecipe } from '../recipes'
import type { BlockRegistry } from '../registry'
import { BUILT_IN_STYLES, getDeckStyle, styleCard } from '../styles'
import type { BlockSpec, DeckSpec, DeckStyle, SlideSpec } from '../types'
import { validateDeckSpec, defaultBlockRegistry } from '../validate-deck-spec'

/** One S1 outline entry. */
export interface OutlineEntry {
  role: RecipeRole
  headline: string
  keyMessage: string
}

/** The fixed 12-slide outline: one topic, the ten planner roles (data and content twice). */
export const DRY_RUN_OUTLINE: readonly OutlineEntry[] = [
  { role: 'cover', headline: 'Expanding Pulse analytics to mid-market teams', keyMessage: 'A focused plan to win the 200 to 2,000 employee segment' },
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
  deck: DeckSpec
  slides: number
  recipes: string[]
  repairs: Repair[]
  errors: number
  warnings: number
  needsVisualCheck: number
  /** Slides where no title slot took the outline headline. */
  exampleKept: number
  /** Every error/warning left, `slide N code: message`. */
  findings: string[]
  /** All roles' recipes in the prompt (what the tier-1 index holds). */
  prompt: PromptSections
  /** The largest S2a prompt when only the slide's own role's recipes are sent (§5.2 "or all"). */
  promptPerRole: PromptSections & { role: RecipeRole }
}

export interface DryRunOptions {
  registry?: BlockRegistry
  outline?: readonly OutlineEntry[]
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
export function fillSlide(recipe: SlideRecipe, headline: string, registry: BlockRegistry, id: string): { slide: SlideSpec; titled: boolean } {
  const base = recipeSlide(recipe, registry)
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
      if (!slot) return blk
      titled = true
      const props: Record<string, unknown> = { ...(blk.props ?? {}), [slot.prop]: slot.rich ? { runs: [{ text: headline }] } : headline }
      if (blk.type === 'tls.c.kinetic-title') props.highlight = headline.split(/\s+/).slice(-1)[0]
      return { ...blk, id: blk.id, props }
    })
  }
  return { slide: { ...slide, regions }, titled }
}

function deckOf(style: DeckStyle, slides: SlideSpec[]): DeckSpec {
  return {
    version: 1,
    id: `dryrun-${style.id}`,
    title: `Dry run — ${style.id}`,
    theme: style.palettes[0].id,
    style: style.id,
    aspect: 'widescreen',
    slides,
  }
}

function bad(report: LayoutReport): string[] {
  return report.findings.filter((f) => f.severity !== 'info').map((f) => `${f.severity} ${f.code}: ${f.message}`)
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
    header: len(header),
    // the card plus the index's own one-line style section
    styleCard: card.length + 1 + len(styles),
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

/** Run the whole pick, fill and repair loop for one style. */
export function runStyle(style: DeckStyle, styleIndex: number, opts: DryRunOptions = {}): StyleRunResult {
  const registry = opts.registry ?? defaultBlockRegistry()
  const outline = opts.outline ?? DRY_RUN_OUTLINE
  const repairs: Repair[] = []
  const used: string[] = []
  const seen: Partial<Record<RecipeRole, number>> = {}
  let exampleKept = 0
  const analyze = (slide: SlideSpec) => analyzeDeck(deckOf(style, [slide]), { registry })[0]

  const slides = outline.map((entry, i) => {
    const eligible = eligibleRecipes(entry.role, style, registry)
    if (!eligible.length) throw new Error(`style ${style.id}: no eligible recipe for role ${entry.role}`)
    // S2a stand-in: rotate through the role's eligible recipes, never the previous slide's recipe if another exists.
    const nth = seen[entry.role] ?? 0
    seen[entry.role] = nth + 1
    let pick = (nth + styleIndex) % eligible.length
    if (eligible.length > 1 && eligible[pick].id === used[i - 1]) pick = (pick + 1) % eligible.length
    const id = `s${String(i + 1).padStart(2, '0')}`
    let recipe = eligible[pick]
    let headline = entry.headline
    let filled = fillSlide(recipe, headline, registry, id)
    let report = analyze(filled.slide)
    // S4.1 stand-in: at most 3 repair rounds — next eligible recipe, then a shorter headline.
    let best = { filled, recipe, headline, count: bad(report).length, report }
    for (let round = 1; round <= 3 && bad(report).length; round++) {
      let action: Repair['action']
      const from = recipe.id
      if (round !== 2 && eligible.length > 1) {
        action = 'next-recipe'
        pick = (pick + 1) % eligible.length
        recipe = eligible[pick]
      } else {
        action = 'shorten-headline'
        headline = shortenHeadline(headline)
      }
      filled = fillSlide(recipe, headline, registry, id)
      report = analyze(filled.slide)
      repairs.push({ slide: i + 1, round, action, from, to: recipe.id, detail: action === 'next-recipe' ? bad(best.report)[0] ?? '' : `"${headline}"` })
      if (bad(report).length < best.count || !best.count) best = { filled, recipe, headline, count: bad(report).length, report }
    }
    // Keep the cleanest variant seen (the last when it is clean).
    if (!bad(report).length) best = { filled, recipe, headline, count: 0, report }
    if (!best.filled.titled) exampleKept++
    used.push(best.recipe.id)
    return best.filled.slide
  })

  const deck = deckOf(style, slides)
  const reports = analyzeDeck(deck, { registry })
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
  for (const f of validateDeckSpec(deck, registry)) {
    if (f.level === 'error') errors++
    else warnings++
    findings.push(`validate ${f.level} ${f.rule} ${f.path}: ${f.message}`)
  }
  return {
    style: style.id,
    deck,
    slides: slides.length,
    recipes: used,
    repairs,
    errors,
    warnings,
    needsVisualCheck: reports.filter((r) => r.needsVisualCheck.length).length,
    exampleKept,
    findings,
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
