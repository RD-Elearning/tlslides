/**
 * AC8 — the variety mechanism of the S2a pick (`reviews/blocks/ai-curation/README.md` §8,
 * LLM-ARCHITECTURE S2a "Variety").
 *
 * A slide's **look signature** is its layout plus, per region, each block's type and the resolved
 * value of every look knob (`BlockDefinition.looks`): authored, else the style's `blockDefaults`,
 * else the block's `defaults`. Content never enters it: two slides with one signature are one
 * design with other words.
 *
 * The **candidates** of a role are its eligible recipes × their variants (`SlideRecipe.variants`)
 * that the deck style allows (`styleAllows`), de-duplicated by signature. The **pick** walks them
 * from a start that is a pure function of (style, role, seed), skipping signatures already used in
 * the deck and the ones the caller asks to avoid (`avoidSignatures`: e.g. the user's recent decks),
 * whenever another candidate is left. The **deck look** fixes the knobs that must stay consistent
 * inside one deck (the title treatment) once per deck, also from the seed.
 *
 * Deterministic and pure (no `Math.random`, no clock): the same (style, outline, seed) gives the
 * same deck; nearby seeds give maximally different decks (the seed advances the start by a stride
 * coprime with the candidate count, so seeds 1, 2, 3 start on three different candidates).
 * The backend mirrors this module, or calls it, before S3.
 */
import { BASE_VARIANT, composedSlide, eachBlock, recipeSlide, variantIds, findVariant } from '../recipes'
import type { RecipeRole, SlideRecipe } from '../recipes'
import type { BlockRegistry } from '../registry'
import type { BlockSpec, DeckStyle, SlideSpec } from '../types'

/** One design a slide of a role can take. */
export interface LookCandidate {
  recipe: SlideRecipe
  /** `base` or a variant id of `recipe`. */
  variant: string
  signature: string
}

/** Knobs fixed once per deck (consistent inside it, varied across decks). */
export interface DeckLook {
  /** `tls.t.title` look knobs applied to every title the recipe or variant leaves open. */
  title: Record<string, unknown>
}

/** The block types whose look is decided per deck, not per slide. */
export const DECK_LOOK_TYPES = ['tls.t.title'] as const

/** 32-bit FNV-1a of a string: a stable start offset for (style, role). */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/**
 * The step a seed advances the start by, for `k` candidates over `r` distinct recipes: coprime with
 * `k` (every candidate is reachable), near k × 0.38 (seeds far apart in the list), and when the
 * role has 3+ recipes not a multiple of `r` for one or two steps (so seeds 1, 2, 3 land on other
 * recipes, not only other variants — the candidates are interleaved by recipe).
 */
export function seedStride(k: number, r = 1): number {
  if (k <= 1) return 0
  const ok = (s: number) => gcd(s, k) === 1 && (r < 3 || (s % r !== 0 && (2 * s) % r !== 0))
  const start = Math.max(1, Math.round(k * 0.38))
  for (let d = 0; d < k; d++) {
    if (start + d < k && ok(start + d)) return start + d
    if (start - d >= 1 && ok(start - d)) return start - d
  }
  return 1
}

/**
 * The resolved look-knob values of one block (authored > style default > block default). CMP4: a
 * container's look includes its children's (`[a+b]`), and a layered block its layer and anchor, so
 * two compositions of the same container are two designs.
 */
export function blockLook(block: BlockSpec, style: DeckStyle | undefined, registry: BlockRegistry): string {
  const def = registry.get(block.type)
  if (!def) return block.type
  const pinned = style?.blockDefaults[block.type] ?? {}
  const props = (block.props ?? {}) as Record<string, unknown>
  const defaults = (def.defaults ?? {}) as Record<string, unknown>
  const knobs = (def.looks ?? []).map((k) => `${k}=${String(props[k] ?? pinned[k] ?? defaults[k])}`)
  const placed = block.layer && block.layer !== 'content' ? `@${block.layer}${block.anchor ? `:${block.anchor}` : ''}` : ''
  const kids = Array.isArray(props.children) ? `[${(props.children as BlockSpec[]).map((c) => blockLook(c, style, registry)).join('+')}]` : ''
  return `${block.type}{${knobs.join(',')}}${placed}${kids}`
}

/** The look signature of a slide (see the module comment; CMP4: plus its connectors' routes). */
export function lookSignature(slide: SlideSpec, style: DeckStyle | undefined, registry: BlockRegistry): string {
  const regions = Object.entries(slide.regions ?? {}).map(([name, blocks]) => `${name}:${blocks.map((b) => blockLook(b, style, registry)).join('+')}`)
  const links = slide.connectors?.length ? `|cx:${slide.connectors.map((c) => `${c.route ?? 'straight'}/${c.head ?? 'end'}`).join(',')}` : ''
  return `${slide.layout}|${regions.join(';')}${links}`
}

/**
 * Does the style allow this knob value? A style's `variety[type][knob]` lists the values it accepts
 * (its `blockDefaults` value is always accepted); without a list, a knob the style sets is fixed to
 * that value and any other knob is open.
 */
export function knobAllowed(type: string, knob: string, value: unknown, style: DeckStyle | undefined): boolean {
  if (!style) return true
  const pinned = style.blockDefaults[type]?.[knob]
  const allowed = style.variety?.[type]?.[knob]
  if (allowed) return allowed.some((a) => a === value) || pinned === value
  return pinned === undefined || pinned === value
}

/** The knobs a recipe design sets on each block type: the recipe's own, then the variant's. */
function designKnobs(recipe: SlideRecipe, variant: string): Array<[string, Record<string, unknown>]> {
  const v = findVariant(recipe, variant)
  const out: Array<[string, Record<string, unknown>]> = []
  if (recipe.compose) {
    // CMP4: every block of the pattern's tree with the props it sets (a style that pins a knob to
    // another value rules the look out, as for a recipe)
    eachBlock(composedSlide(recipe, v?.id ?? BASE_VARIANT).regions, (b) => {
      const { children: _kids, ...props } = (b.props ?? {}) as Record<string, unknown>
      void _kids
      out.push([b.type, props])
    })
    return out
  }
  for (const blocks of Object.values(recipe.regions)) {
    for (const blk of blocks) out.push([blk.type, { ...(blk.knobs ?? {}), ...(v?.knobs?.[blk.type] ?? {}) }])
  }
  return out
}

/** Does the style allow this recipe design (every knob it sets passes `knobAllowed`)? */
export function styleAllows(recipe: SlideRecipe, variant: string, style: DeckStyle | undefined): boolean {
  return designKnobs(recipe, variant).every(([type, knobs]) => Object.entries(knobs).every(([k, v]) => knobAllowed(type, k, v, style)))
}

/** Every allowed combination of the style's `variety` values for one deck-level type, in a stable order. */
function deckLookCombos(type: string, style: DeckStyle | undefined): Array<Record<string, unknown>> {
  const variety = style?.variety?.[type]
  if (!variety) return [{}]
  let combos: Array<Record<string, unknown>> = [{}]
  for (const [knob, values] of Object.entries(variety)) {
    const pinned = style!.blockDefaults[type]?.[knob]
    const all = pinned !== undefined && !values.includes(pinned as string | boolean) ? [pinned as string | boolean, ...values] : values
    combos = combos.flatMap((c) => all.map((v) => ({ ...c, [knob]: v })))
  }
  return combos
}

/** The deck look for a seed: one title treatment out of the style's allowed ones. */
export function deckLook(style: DeckStyle | undefined, seed = 0): DeckLook {
  const combos = deckLookCombos('tls.t.title', style)
  const k = combos.length
  const start = hashString(`${style?.id ?? ''}|deck`) % k
  return { title: combos[(start + seed * seedStride(k)) % k] ?? {} }
}

/** Put the deck look's knobs on every deck-level block of a slide that does not set them itself. */
export function applyDeckLook(slide: SlideSpec, look: DeckLook, recipe?: SlideRecipe, variant?: string): SlideSpec {
  const set = recipe ? new Map(designKnobs(recipe, variant ?? BASE_VARIANT)) : new Map<string, Record<string, unknown>>()
  const regions: Record<string, BlockSpec[]> = {}
  for (const [name, blocks] of Object.entries(slide.regions ?? {})) {
    regions[name] = blocks.map((b) => {
      if (b.type !== 'tls.t.title' || !Object.keys(look.title).length) return b
      // CMP4: a pattern authors its blocks: the title's own props are what the design sets
      const own = recipe?.compose ? ((b.props ?? {}) as Record<string, unknown>) : set.get(b.type) ?? {}
      const add = Object.fromEntries(Object.entries(look.title).filter(([k]) => !(k in own)))
      return { ...b, props: { ...(b.props ?? {}), ...add } }
    })
  }
  return { ...slide, regions }
}

/**
 * The candidates of a role for a style, interleaved by recipe (every recipe's base, then every
 * recipe's first variant, …) and de-duplicated by signature (a variant that resolves to a design
 * already listed under this style is dropped). `recipes` is the role's eligible recipes, in order.
 */
export function lookCandidates(recipes: readonly SlideRecipe[], style: DeckStyle | undefined, registry: BlockRegistry, look: DeckLook = { title: {} }): LookCandidate[] {
  const gated = (strict: boolean) => {
    const perRecipe = recipes.map((r) => variantIds(r).filter((v) => !strict || styleAllows(r, v, style)).map((v) => ({ recipe: r, variant: v })))
    const out: Array<{ recipe: SlideRecipe; variant: string }> = []
    const depth = Math.max(0, ...perRecipe.map((l) => l.length))
    for (let i = 0; i < depth; i++) for (const l of perRecipe) if (l[i]) out.push(l[i])
    return out
  }
  // a style that allows none of a role's designs still gets them all (the oracle loop decides)
  let designs = gated(true)
  if (!designs.length) designs = gated(false)
  const seen = new Set<string>()
  const out: LookCandidate[] = []
  for (const d of designs) {
    const slide = applyDeckLook(recipeSlide(d.recipe, registry, d.variant, style), look, d.recipe, d.variant)
    const signature = lookSignature(slide, style, registry)
    if (seen.has(signature)) continue
    seen.add(signature)
    out.push({ ...d, signature })
  }
  return out
}

export interface PickContext {
  /** Signatures already in this deck. */
  used: ReadonlySet<string>
  /** Signatures to stay away from (recent decks), honoured while an alternative exists. */
  avoid?: ReadonlySet<string>
  /** The previous slide's recipe id (no recipe twice in a row while another exists). */
  previousRecipe?: string
}

/**
 * The order in which to try the candidates for the `nth` slide (0-based) of `role` in a deck:
 * a rotation that starts at `hash(style, role) + seed × stride + nth`, then sorted into passes —
 * fresh and not avoided and another recipe than the previous slide's; fresh and not avoided; fresh;
 * anything. The caller takes the first one the oracle accepts.
 */
export function pickOrder(candidates: readonly LookCandidate[], styleId: string, role: RecipeRole, seed: number, nth: number, ctx: PickContext): LookCandidate[] {
  const k = candidates.length
  if (!k) return []
  const recipes = new Set(candidates.map((c) => c.recipe.id)).size
  const start = (hashString(`${styleId}|${role}`) + seed * seedStride(k, recipes) + nth) % k
  const rotated = candidates.map((_, i) => candidates[(start + i) % k])
  const fresh = (c: LookCandidate) => !ctx.used.has(c.signature)
  const welcome = (c: LookCandidate) => !ctx.avoid?.has(c.signature)
  const other = (c: LookCandidate) => c.recipe.id !== ctx.previousRecipe
  const passes = [
    rotated.filter((c) => fresh(c) && welcome(c) && other(c)),
    rotated.filter((c) => fresh(c) && welcome(c)),
    rotated.filter((c) => fresh(c)),
    rotated,
  ]
  const out: LookCandidate[] = []
  const taken = new Set<LookCandidate>()
  for (const pass of passes) for (const c of pass) if (!taken.has(c)) taken.add(c), out.push(c)
  return out
}
