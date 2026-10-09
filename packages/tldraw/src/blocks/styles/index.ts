/**
 * AC1 — deck style presets (`reviews/blocks/ai-curation/README.md` §3.2) and their resolution.
 *
 * Resolution, lowest to highest precedence (all applied at compile/read time, never written into
 * the authored `DeckSpec`):
 *   1. theme: the style's `palettes[0]` when `DeckSpec.theme` (a string) names none of its palettes;
 *   2. tokens: `style.tokens` < `DeckSpec.tokens` (`mergeDeckTokens`);
 *   3. masters: appended as `style:<name>`; a slide with no `masterId` gets one by role (`styleMasterFor`);
 *   4. blockDefaults: filled under each block's authored props (`applyStyleBlockDefaults`), recorded
 *      as `$block.styleDefaults` so `shapeToBlock` drops them again;
 *   5. motionStyle: `style.motionStyle` < `DeckSpec.motionStyle` < `SlideSpec.motionStyle` < block `motion`.
 *
 * Pure and DOM-free.
 */
import type { DeckTheme, TDDocument } from '~types'
import type { BlockSpec, DeckSpec, DeckStyle, DeckTokens, MasterSpec, SlideSpec } from '../types'
import { CORPORATE_STYLE } from './corporate'
import { MINIMAL_STYLE } from './minimal'
import { GRADIENT_STYLE } from './gradient'
import { LUXURY_STYLE } from './luxury'
import { EDITORIAL_STYLE } from './editorial'
import { GLASS_STYLE } from './glass'
import { SWISS_STYLE } from './swiss'
import { DOODLE_STYLE } from './doodle'
import { MEMPHIS_STYLE } from './memphis'
import { CONSULTING_STYLE } from './consulting'
import { textWidthRatio } from '../layout/font-metrics'

/** Every built-in deck style (ai-curation §3.1: ten styles in four families). */
export const BUILT_IN_STYLES: readonly DeckStyle[] = [
  CORPORATE_STYLE,
  MINIMAL_STYLE,
  GRADIENT_STYLE,
  LUXURY_STYLE,
  EDITORIAL_STYLE,
  GLASS_STYLE,
  SWISS_STYLE,
  DOODLE_STYLE,
  MEMPHIS_STYLE,
  CONSULTING_STYLE,
]

/** Reserved master-name prefix for style masters. */
export const STYLE_MASTER_PREFIX = 'style:'

export function getDeckStyle(id: string | undefined): DeckStyle | undefined {
  if (typeof id !== 'string') return undefined
  return BUILT_IN_STYLES.find((s) => s.id === id)
}

/** Every palette any style ships, by id (built-in themes a style reuses appear once there too). */
export function stylePaletteById(id: string): DeckTheme | undefined {
  for (const s of BUILT_IN_STYLES) {
    const p = s.palettes.find((t) => t.id === id)
    if (p) return p
  }
  return undefined
}

/** Ids of every style-only palette (not one of `BUILT_IN_DECK_THEMES`). */
export function stylePaletteIds(): string[] {
  const ids: string[] = []
  for (const s of BUILT_IN_STYLES) for (const p of s.palettes) if (!ids.includes(p.id)) ids.push(p.id)
  return ids
}

/**
 * The theme a styled deck uses: the authored theme when it is an object (a host brand kit) or one
 * of the style's palette ids, else the style's default palette. `undefined` = no style applies.
 */
export function styleTheme(style: DeckStyle | undefined, theme: DeckSpec['theme']): DeckTheme | undefined {
  if (!style || typeof theme !== 'string') return undefined
  return style.palettes.find((p) => p.id === theme) ?? style.palettes[0]
}

/** `base` < `over`, merged per token group the way `resolveTokens` merges onto the scales. */
export function mergeDeckTokens(base: DeckTokens | undefined, over: DeckTokens | undefined): DeckTokens | undefined {
  if (!base) return over
  if (!over) return base
  const out: DeckTokens = {}
  if (base.color || over.color) out.color = { ...base.color, ...over.color }
  const categorical = over.categorical ?? base.categorical
  if (categorical) out.categorical = [...categorical]
  if (base.type || over.type) {
    const type: NonNullable<DeckTokens['type']> = {}
    const keys = new Set([...Object.keys(base.type ?? {}), ...Object.keys(over.type ?? {})]) as Set<keyof NonNullable<DeckTokens['type']>>
    for (const k of keys) type[k] = { ...base.type?.[k], ...over.type?.[k] }
    out.type = type
  }
  if (base.space || over.space) out.space = { ...base.space, ...over.space }
  if (base.radius || over.radius) out.radius = { ...base.radius, ...over.radius }
  if (base.elevation || over.elevation) {
    const elevation: NonNullable<DeckTokens['elevation']> = {}
    for (const lvl of [0, 1, 2] as const) {
      const v = { ...base.elevation?.[lvl], ...over.elevation?.[lvl] }
      if (Object.keys(v).length) elevation[lvl] = v
    }
    out.elevation = elevation
  }
  if (base.motion || over.motion) {
    out.motion = {
      duration: { ...base.motion?.duration, ...over.motion?.duration },
      ease: { ...base.motion?.ease, ...over.motion?.ease },
    }
  }
  const density = over.density ?? base.density
  if (density) out.density = density
  if (base.surface || over.surface) out.surface = { ...base.surface, ...over.surface }
  return out
}

/** AC4: a style's tokens with its `surface` as `DeckTokens.surface`. */
function styleTokens(style: DeckStyle | undefined): DeckTokens | undefined {
  if (!style) return undefined
  return style.surface ? { ...style.tokens, surface: { ...style.surface } } : style.tokens
}

/** The effective token overrides of a deck spec: style tokens under `spec.tokens`. */
export function deckSpecTokens(spec: Pick<DeckSpec, 'style' | 'tokens'>): DeckTokens | undefined {
  return mergeDeckTokens(styleTokens(getDeckStyle(spec.style)), spec.tokens)
}

/** The effective token overrides of a document: its style's tokens under `doc.tokens`. */
export function documentDeckTokens(doc: Pick<TDDocument, 'styleId' | 'tokens'>): DeckTokens | undefined {
  return mergeDeckTokens(styleTokens(getDeckStyle(doc.styleId)), doc.tokens as DeckTokens | undefined)
}

/** Style masters under their reserved names (`style:cover`, …). */
export function styleMasters(style: DeckStyle | undefined): MasterSpec[] {
  if (!style) return []
  return style.masters.map((m) => ({ ...JSON.parse(JSON.stringify(m)), name: STYLE_MASTER_PREFIX + m.name }))
}

const COVER_TYPES = new Set(['tls.c.cover', 'tls.c.hero', 'tls.c.kinetic-title', 'tls.c.closing'])
const SECTION_TYPES = new Set(['tls.c.divider'])

/**
 * The style master a slide with no `masterId` gets: `cover` for a cover/closing role or a
 * cover-type block, `section` for a section role/layout or a divider, else `content`; only when
 * the style defines that master.
 */
export function styleMasterFor(style: DeckStyle | undefined, slide: SlideSpec): string | undefined {
  if (!style || slide.masterId !== undefined) return undefined
  const types = Object.values(slide.regions ?? {}).flat().map((b) => b?.type)
  let kind = 'content'
  if (slide.role === 'cover' || slide.role === 'closing' || types.some((t) => COVER_TYPES.has(t))) kind = 'cover'
  else if (slide.role === 'section' || slide.layout === 'section' || types.some((t) => SECTION_TYPES.has(t))) kind = 'section'
  return style.masters.some((m) => m.name === kind) ? STYLE_MASTER_PREFIX + kind : undefined
}

/**
 * The block with the style's knob defaults for its type filled under the authored props, and the
 * keys that were filled (for `$block.styleDefaults`). Only top-level props the block did not author
 * are filled; the input is never mutated. `filled` is `undefined` when nothing applied.
 */
export function applyStyleBlockDefaults(
  block: BlockSpec,
  defaults: DeckStyle['blockDefaults'] | undefined
): { block: BlockSpec; filled?: Record<string, unknown> } {
  const d = defaults?.[block?.type]
  if (!d || !block.props || typeof block.props !== 'object') return { block }
  const filled: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(d)) if (!(k in block.props)) filled[k] = JSON.parse(JSON.stringify(v))
  if (!Object.keys(filled).length) return { block }
  return { block: { ...block, props: { ...filled, ...block.props } }, filled }
}

/** One compact index line per style (tier-1 index). */
export function styleLine(style: DeckStyle): string {
  return `${style.id} (${style.family}) — palettes: ${style.palettes.map((p) => p.id).join(', ')}`
}

/** A style's prefer/avoid lists as the digest's `CapabilityPreference` shape. */
export function stylePreference(style: DeckStyle): { prefer: string[]; avoid: string[] } {
  return { prefer: [...style.prefer], avoid: [...style.avoid] }
}

/** The full style card (≤ 1.2k chars) the planner gets on demand (§3.4). */
export function styleCard(style: DeckStyle): string {
  const lines: string[] = []
  lines.push(`## Style: ${style.id} — ${style.name}`)
  lines.push(style.brief)
  lines.push(`Palettes (write one as \`theme\`): ${style.palettes.map((p) => p.id).join(', ')} (first = default).`)
  // AC3 (§3.4): how wide each face sets text against Inter, so the AI sizes copy for the style.
  const w = (k: string) => `×${textWidthRatio(k).toFixed(2)}`
  lines.push(
    `Fonts: ${style.fonts.heading.family} / ${style.fonts.body.family} (text width vs Inter: heading ${w(style.fonts.heading.metricsKey)}, body ${w(style.fonts.body.metricsKey)}). Motion: ${style.motionStyle} (deck default).`
  )
  lines.push('Rules: ' + style.rules.join(' '))
  if (style.prefer.length) lines.push('Prefer: ' + style.prefer.join(', '))
  if (style.avoid.length) lines.push('Avoid: ' + style.avoid.join(', '))
  const defs = Object.entries(style.blockDefaults).map(
    ([t, kv]) => `${t}(${Object.entries(kv).map(([k, v]) => `${k}=${String(v)}`).join(',')})`
  )
  if (defs.length) lines.push('Already set by the style (do not repeat): ' + defs.join(' '))
  return lines.join('\n')
}
