/**
 * Block system types. A block is a named, typed, themeable, animatable unit of slide
 * content — defined by pure layout function, renderable to both DOM and SVG, with
 * optional animation and nesting. These are the runtime primitives; concrete block
 * definitions live in `@tlslides/blocks`.
 */

import type { TDShape, AnimationTrigger } from '~types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Block instance and spec                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * One block instance. Plain JSON: no functions, no class instances, no React.
 * Round-trips through JSON.parse(JSON.stringify(...)) unchanged — enforced by test.
 */
export interface BlockSpec {
  /** Registry key of the definition, namespaced. Built-ins use `tls.`; a host uses its own. */
  type: string
  /** Stable within its slide. Used to target motion, to let AI cross-reference, and as the
   *  animation part-key prefix. Generated on insert if absent. */
  id?: string
  /** Content + options. Validated against the definition's `schema`. */
  props: Record<string, unknown>
  /** Presentation overrides. Every field optional; the theme + definition defaults fill the rest. */
  style?: BlockStyleSpec
  /** Motion overrides. Absent = the definition's default recipe, which may itself be "none". */
  motion?: BlockMotionSpec
  /** Only meaningful for container blocks (`family: 'layout'`). */
  children?: BlockSpec[]
  /** Bridges to the Phase 13 template slot system. */
  slot?: string
}

/**
 * Style overrides for a block. Deliberately small: anything a block needs that is not
 * here belongs in its own `props`, because a per-block option is discoverable and a
 * universal style field is not.
 */
export interface BlockStyleSpec {
  /** The block's own background. ColorRole or literal hex or theme token. */
  surface?: ColorRole | string
  /** Foreground colour; derived from `surface` when absent. */
  on?: ColorRole | string
  /** The block's one emphasis colour. */
  accent?: ColorRole | string
  /** Visual tone. */
  tone?: 'filled' | 'outline' | 'ghost' | 'inverted' | 'gradient'
  /** Corner radius token or pixel value. */
  radius?: RadiusToken | number
  /** Padding: token, pixel value, or [block, inline]. */
  padding?: SpaceToken | number | [number, number]
  /** Gap between children: token or pixel value. */
  gap?: SpaceToken | number
  /** Elevation level: 0, 1, or 2. */
  elevation?: 0 | 1 | 2
  /** Content alignment. */
  align?: 'start' | 'center' | 'end'
  /** Density: visual compactness. */
  density?: 'compact' | 'default' | 'roomy'
}

/**
 * Motion overrides for a block. Absent = the definition's default recipe.
 */
export interface BlockMotionSpec {
  /** Motion preset ID: 'fade-up', 'stagger-lines', etc. */
  preset?: MotionPresetId
  /** When this block enters the build. */
  trigger?: AnimationTrigger
  /** Build order within the slide. */
  order?: number
  /** Duration token or milliseconds. */
  duration?: DurationToken | number
  /** Delay token or milliseconds. */
  delay?: DurationToken | number
  /** Easing function token. */
  ease?: EaseToken
  /** Stagger delay between parts. */
  stagger?: DurationToken | number
  /** Per-named-part motion override. Part names are declared by the motion recipe. */
  parts?: Record<string, PartMotionSpec>
  /** Presentation-only ambient loop (shimmer, drift). Off unless explicitly set. */
  ambient?: AmbientMotionSpec
}

/**
 * Motion specification for a single named part within a block.
 */
export interface PartMotionSpec {
  /** Motion preset for this part. */
  preset?: MotionPresetId
  /** Duration override for this part. */
  duration?: DurationToken | number
  /** Delay override for this part. */
  delay?: DurationToken | number
  /** Easing override for this part. */
  ease?: EaseToken
}

/**
 * Ambient (presentation-only) motion specification.
 */
export interface AmbientMotionSpec {
  /** Ambient preset: 'shimmer', 'drift', etc. */
  preset?: MotionPresetId
  /** Duration of one ambient cycle. */
  duration?: DurationToken | number
  /** Easing applied to the ambient animation. */
  ease?: EaseToken
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Block definition and schema                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Supported block families. Blocks are grouped by structural purpose and rendering approach.
 */
export type BlockFamily = 'layout' | 'text' | 'data' | 'diagram' | 'media' | 'composite' | 'chrome' | 'live'

/**
 * Runtime metadata and behaviour for a block type. The definition lives in code; each
 * instance is a plain JSON `BlockSpec` in the document.
 */
export interface BlockDefinition<P extends Record<string, unknown> = Record<string, unknown>> {
  /** Registry key, namespaced. */
  type: string
  /** Display name shown in the inserter. */
  name: string
  /** Structural family. */
  family: BlockFamily
  /** 'A' = pure layout, exports headlessly. 'B' = DOM-only. */
  tier: 'A' | 'B'
  /** One-line summary, shown in the inserter and given to the AI. */
  summary: string
  /** Keywords for inserter search and AI selection. */
  keywords: string[]

  /** Content and option schema. */
  schema: BlockSchema
  /** A valid, good-looking instance with no input at all. Deep-cloned per instantiation. */
  defaults: P

  /** Sizing. `preferred` is what the inserter drops; `min` is enforced on resize.
   *  All in slide units (1920×1080 frame). */
  size: { preferred: [number, number]; min: [number, number]; aspect?: number }

  /** Pure layout function. No DOM, no React, no `document`, no `Date.now()`, no throwing.
   *  This is the single source of truth for what the block looks like. */
  layout(props: P, ctx: LayoutContext): LayoutNode

  /** Tier B only. When present, it draws the live block; `poster()` supplies the export image.
   *  Tier A blocks leave both undefined. */
  Component?: React.FC<BlockRenderProps<P>>
  poster?(props: P, ctx: LayoutContext): LayoutNode

  /** Named parts and default choreography. */
  motion: MotionRecipe

  /** Report whether content fits, and suggest overflow remedies. */
  capacity?(props: P, box: Size, ctx: LayoutContext): CapacityReport

  /** Run static design lint rules. */
  lint?(props: P, ctx: LintContext): LintFinding[]

  /** Escape hatch: return a TDShape array when a block cannot be expressed as LayoutNode. */
  toShapes?(props: P, box: Box, ctx: LayoutContext): TDShape[]
}

/**
 * Motion recipe: declares named parts and a default choreography.
 * (Full shape defined in Phase 22; for P18 this is a placeholder.)
 */
export interface MotionRecipe {
  /** Named parts this block declares. Listed here so motion.parts can target them. */
  parts?: string[]
  /** Default motion preset. */
  preset?: MotionPresetId
}

/**
 * Schema of valid content for a block. Drives inserter UI, AI prompting, and linting.
 */
export interface BlockSchema {
  /** Map of slot name to its specification. */
  [key: string]: SlotSpec
}

/**
 * Specification of a single content or option slot.
 */
export interface SlotSpec {
  /** What kind of value belongs here. */
  type: SlotType
  /** 'content' slots are filled by the AI; 'option' slots are chosen by templates/themes/user. */
  role: 'content' | 'option'
  /** Display label. */
  label: string
  /** Help text. */
  help?: string
  /** Whether this slot is required. */
  required?: boolean
  /** Guidance for the AI: "One metric name, 1–3 words. Never a sentence." */
  guidance?: string
}

/**
 * Kinds of values a slot can hold.
 */
export type SlotType =
  | { kind: 'text'; maxChars?: number; multiline?: boolean }
  | { kind: 'richText'; maxChars?: number }
  | { kind: 'number'; min?: number; max?: number; format?: 'plain' | 'compact' | 'percent' | 'currency' }
  | { kind: 'enum'; values: string[] }
  | { kind: 'boolean' }
  | { kind: 'color' }
  | { kind: 'icon' }
  | { kind: 'image' }
  | { kind: 'list'; of: SlotType; min?: number; max?: number }
  | { kind: 'object'; fields: Record<string, SlotSpec> }
  | { kind: 'series'; value: 'number'; label: 'text'; max?: number }
  | { kind: 'blocks'; allow?: BlockFamily[]; min?: number; max?: number }

/**
 * Component render props passed to a Tier-B block's `Component`.
 */
export interface BlockRenderProps<P = Record<string, unknown>> {
  /** The block's content and options. */
  props: P
  /** The box this block fills, in slide units. */
  box: Box
  /** Resolved design context. */
  ctx: LayoutContext
  /** True when rendering for export/thumbnail, false for live editor. */
  headless: boolean
}

/**
 * Lint rule check result.
 */
export interface LintFinding {
  /** Severity: 'error', 'warning', or 'info'. */
  level: 'error' | 'warning' | 'info'
  /** The rule that fired, e.g. 'contrast/insufficient' */
  rule: string
  /** What part this applies to, if any. */
  part?: string
  /** Human-readable message. */
  message: string
}

/**
 * Context provided to a block's lint function.
 */
export interface LintContext {
  /** The resolved box. */
  box: Box
  /** Resolved tokens and colors. */
  tokens: ResolvedTokens
  /** Surface context for contrast checking. */
  surface: SurfaceContext
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Layout output types                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * A layout tree is a small, closed set of absolutely-positioned primitives.
 * Both DOM and SVG renderers consume the same tree, which is why they cannot disagree.
 */
export type LayoutNode =
  | { k: 'group'; box: Box; name?: string; part?: string; clip?: boolean; opacity?: number; children: LayoutNode[] }
  | { k: 'rect'; box: Box; part?: string; fill?: Paint; stroke?: Stroke; radius?: number | number[] }
  | { k: 'path'; box: Box; part?: string; d: string; fill?: Paint; stroke?: Stroke }
  | { k: 'text'; box: Box; part?: string; lines: TextLine[]; style: ResolvedTextStyle }
  | { k: 'image'; box: Box; part?: string; assetId: string; fit: 'cover' | 'contain'; radius?: number }
  | { k: 'icon'; box: Box; part?: string; icon: string; fill: string; strokeWidth?: number }
  | { k: 'line'; box: Box; part?: string; from: Pt; to: Pt; stroke: Stroke; marker?: MarkerSpec }
  | { k: 'host'; box: Box; part?: string; render: string }

/**
 * A 2D box: origin at top-left, measured in slide units (1920×1080 frame).
 */
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * A 2D size, measured in slide units.
 */
export interface Size {
  width: number
  height: number
}

/**
 * A 2D point, in slide units.
 */
export interface Pt {
  x: number
  y: number
}

/**
 * Paint: solid, linear gradient, or radial gradient. Same structure as `SlideBackground`.
 */
export type Paint =
  | { type: 'solid'; color: string }
  | { type: 'linearGradient'; angle: number; stops: Array<{ color: string; at: number }> }
  | { type: 'radialGradient'; cx: number; cy: number; stops: Array<{ color: string; at: number }> }

/**
 * Stroke specification: colour and width.
 */
export interface Stroke {
  color: string
  width: number
}

/**
 * One line of text, with individual glyph positions resolved for layout and rendering.
 */
export interface TextLine {
  /** The text content. */
  text: string
  /** Baseline position relative to the text node's origin. */
  baseline: number
  /** Width when rendered with the given style. */
  width: number
  /** Optional runs with inline styling. */
  runs?: TextRun[]
}

/**
 * An inline text run with optional emphasis.
 */
export interface TextRun {
  /** Text content. */
  text: string
  /** Bold emphasis. */
  bold?: boolean
  /** Italic emphasis. */
  italic?: boolean
  /** Inline colour override. */
  color?: string
  /** Inline size override (em multiplier). */
  size?: number
}

/**
 * Fully resolved text style after theme and defaults are applied.
 */
export interface ResolvedTextStyle {
  /** Font family (e.g. '"Poppins", sans-serif'). */
  family: string
  /** Font size in slide units. */
  size: number
  /** Line height multiplier. */
  lineHeight: number
  /** Letter spacing in em. */
  letterSpacing: number
  /** Text colour (hex or token). */
  color: string
  /** Vertical alignment: start (top), center, end (bottom). */
  verticalAlign?: 'start' | 'center' | 'end'
}

/**
 * Marker specification for line ends (arrowhead, circle, etc).
 */
export interface MarkerSpec {
  /** Marker kind: 'arrow', 'circle', etc. */
  kind: string
  /** Marker fill colour. */
  color: string
}

/**
 * Text measurement result from `ctx.measureText()`.
 */
export interface TextMetrics {
  width: number
  height: number
  lines: TextLine[]
}

/**
 * Asset info resolved from `ctx.asset()`.
 */
export interface AssetInfo {
  width: number
  height: number
}

/**
 * Icon path info from `ctx.icon()`.
 */
export interface IconPath {
  d: string
  viewBox: string
  kind: 'stroke' | 'fill'
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Context and resolution                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Context provided to a block's `layout()`, `capacity()`, and `lint()` functions.
 * The layout function is pure: given the same props, box, and context, it returns
 * the same tree. No `document`, no `window`, no `Date.now()`, no throwing.
 */
export interface LayoutContext {
  /** The box this block must fill, in slide units. Origin at top-left (0,0). */
  box: Size
  /** Resolved design tokens for this deck: colors, scales, radii. */
  tokens: ResolvedTokens
  /** What is behind this block. Foreground colors are solved against it. */
  surface: SurfaceContext
  /** Resolve a colour role to a concrete, contrast-correct value. */
  resolveColor(role: ColorRole | string): ResolvedColor
  /** Resolve a type token to concrete size, line-height, and family. */
  resolveText(token: TypeToken, over?: Partial<TextStyleSpec>): ResolvedTextStyle
  /** The ONLY text measurement primitive. Deterministic, available in Node. */
  measureText(text: string | RichText, style: ResolvedTextStyle, maxWidth?: number): TextMetrics
  /** Lay a child block out inside `box`, returning its node. Containers only. */
  layoutChild(spec: BlockSpec, box: Box): LayoutNode
  /** Asset lookup: intrinsic size when known. */
  asset(assetId: string): AssetInfo | undefined
  /** Icon lookup: returns a path, or undefined (block must degrade gracefully). */
  icon(id: string): IconPath | undefined
  /** Current nesting depth. Capped at 4; deeper trees are an error. */
  depth: number
  /** True when laying out for export/thumbnail; false for live editor. */
  headless: boolean
}

/**
 * One entry of the type scale (doc 02 §2.3): a font size and its line-height multiplier, both
 * already in slide units / unitless respectively — never CSS pixels (see `Box`'s comment).
 */
export interface TypeScaleValue {
  size: number
  lineHeight: number
}

/**
 * One elevation level (doc 02 §2.3). `dx` is always 0 — "one light source per slide" — kept as
 * an explicit field rather than assumed so a renderer never has to know that rule itself.
 * `shadow` is the convenience CSS `box-shadow` string (`'none'` at level 0); `dx`/`dy`/`blur`/
 * `color` are the same values decomposed for the SVG renderer (P20/P21), which has no
 * `box-shadow` primitive and must build a `<feDropShadow>`/blur filter from parts instead.
 */
export interface ElevationValue {
  level: 0 | 1 | 2
  dx: number
  dy: number
  blur: number
  color: string
  shadow: string
}

/**
 * Motion scale (doc 02 §2.3's "motion tokens" line). Deliberately minimal for P19: just enough
 * to give `ResolvedTokens.motion` a concrete shape so nothing downstream reads `unknown`. The
 * real five-dimension scale (duration, easing, distance, scale, blur) from transitions.dev is
 * P22's job (`05-motion-system.md`) and independent of the P19→P20→P21 spine; this is not that,
 * it is only what's needed so a block's `layout()` can ask `ctx.tokens.motion` for something
 * real today without P19 reaching into P22's scope.
 */
export interface MotionScale {
  duration: Record<DurationToken, number>
  ease: Record<EaseToken, string>
}

/**
 * Resolved tokens for a deck: the contract between theme/tokens and block layout. P18 shipped
 * this as `Record<string, unknown>` placeholders; P19 (`blocks/tokens.ts`) is the first phase to
 * actually produce one, via `resolveTokens(theme, tokens?)`.
 */
export interface ResolvedTokens {
  /** Colour role → concrete colour mappings, resolved from the active theme (and any
   *  `DeckTokens.color` overrides) but NOT yet contrast-solved against a surface — that only
   *  happens for `text`/`textMuted`/`line` inside `resolveColor`, which starts from this map. */
  color: Record<ColorRole, string>
  /** The categorical series ramp: up to 6 hues for charts, generated from `accent1`/`accent2`
   *  or overridden wholesale by `DeckTokens.categorical`. */
  categorical: string[]
  /** Spacing scale, in slide units, after `density` has shifted every step. */
  space: Record<SpaceToken, number>
  /** Radius scale, in slide units. */
  radius: Record<RadiusToken, number>
  /** Typography scale: size + line-height per named step. */
  type: Record<TypeToken, TypeScaleValue>
  /** Elevation scale: exactly 3 levels, per doc 02 §2.3 — a discipline, not a palette. */
  elevation: Record<0 | 1 | 2, ElevationValue>
  /** Motion/animation scale. See `MotionScale`'s comment for what P19 does and doesn't cover. */
  motion: MotionScale
  /** The density this scale was resolved at. Carried through so a block can read it back
   *  (e.g. to decide whether it has room for an optional decorative element) without needing
   *  the original `DeckTokens` it was built from. */
  density: 'compact' | 'default' | 'roomy'
}

/**
 * Surface context: what is behind a block, used for contrast solving (doc 02 §2.4).
 */
export interface SurfaceContext {
  /** The resolved paint behind this block: the slide background, or the parent block's fill.
   *  For an image background (unknowable luminance — see `luminance` below) this is a neutral
   *  mid-grey solid, not the image itself: `Paint` has no image variant (nothing needs to paint
   *  "an image" as a fill), and the neutral placeholder keeps this field meaningful without
   *  inventing one. `overImage` is what actually carries the "this is a photo" signal. */
  behind: Paint
  /** Perceived (WCAG relative) luminance of the surface, 0–1. For a gradient, sampled at this
   *  block's own box — not the slide centre — so a block on the dark end of a gradient knows it.
   *  For an image, unknowable without decoding pixels (out of scope for a pure, DOM-free
   *  layout-time function), so this is a neutral 0.5 and `overImage` is set instead. */
  luminance: number
  /** True if the surface is an image (forces a scrim decision — doc 02 §2.6 — rather than a
   *  contrast-solved text colour, since `luminance` above is a guess, not a measurement). */
  overImage: boolean
}

/**
 * Resolved colour after contrast checking (doc 02 §2.4).
 */
export interface ResolvedColor {
  /** Hex (or, for a literal/theme-token input that wasn't a `ColorRole`, whatever that input
   *  resolved to) — never contrast-adjusted for a literal, see `resolveColor`'s doc comment. */
  color: string
  /** Contrast ratio against `ctx.luminance`. Informational (not floor-checked) for any role
   *  other than `text`/`textMuted`/`line`, which have no declared floor. */
  ratio: number
  /** Whether this colour meets its role's contrast floor. Always `true` for a role with no
   *  floor. `false` means the floor could not be met without abandoning the role's own hue —
   *  reported honestly, never silently swapped for an arbitrary "safe" colour. */
  ok: boolean
}

/**
 * Rich text: inline runs with per-run styling.
 * (Full shape defined in Phase 23.)
 */
export interface RichText {
  runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }>
}

/**
 * Text style specification for measurement.
 */
export interface TextStyleSpec {
  family?: string
  size?: number
  lineHeight?: number
  letterSpacing?: number
}

/**
 * Capacity report: does this content fit, and what can be done about an overflow?
 */
export interface CapacityReport {
  /** True when content fits. */
  fits: boolean
  /** Budget per content slot: what this box could hold at current style. */
  budget: Record<string, { max: number; used: number; unit: 'chars' | 'items' | 'lines' }>
  /** In order, what the block would do about an overflow. */
  remedy: OverflowRemedy[]
}

/**
 * One overflow remedy. Order matters: reflow → shrink → paginate → truncate.
 */
export type OverflowRemedy =
  | { kind: 'shrink'; minScale: number }
  | { kind: 'reflow'; to: string }
  | { kind: 'truncate'; slot: string }
  | { kind: 'paginate' }

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Design system tokens                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Semantic colour role. Resolved against the active theme and surface context.
 */
export type ColorRole =
  | 'surface'
  | 'surfaceAlt'
  | 'accent'
  | 'accent2'
  | 'text'
  | 'textMuted'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'neutral'
  | 'line'
  | 'scrim'

/**
 * Radius token, resolved to a value (in slide units) from the theme scale. Doc 02 §2.3:
 * `none 0 · sm 8 · md 16 · lg 24 · xl 32 · pill 9999`.
 */
export type RadiusToken = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'pill'

/**
 * Spacing token, resolved to a value (in slide units) from the theme scale. Doc 02 §2.3:
 * `3xs 4 · 2xs 8 · xs 12 · sm 16 · md 24 · lg 32 · xl 48 · 2xl 64 · 3xl 96 · 4xl 128`.
 */
export type SpaceToken = '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'

/**
 * Duration token, resolved to milliseconds from the motion scale.
 */
export type DurationToken = 'fast' | 'normal' | 'slow'

/**
 * Easing token, resolved to a CSS easing function from the motion scale.
 */
export type EaseToken = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

/**
 * Type-scale token (doc 02 §2.3) — which named size/line-height step a text part uses. Not to
 * be confused with Phase 17's `fontToken: 'heading' | 'body'` (`ShapeStyles.fontToken`), which
 * picks a *font family* out of the theme's pairing; this instead picks a *size*. The two happen
 * to share two token names ('heading', 'body') because both vocabularies independently landed
 * on the same words for "the big one" and "the ordinary one" — a block's resolved text style
 * carries both a `TypeToken` (size) and a font-pairing choice (family), same as any other text
 * on this canvas.
 */
export type TypeToken =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'lead'
  | 'body'
  | 'caption'
  | 'footnote'

/**
 * Motion preset ID: 'fade-up', 'count-up', etc. Full list in Phase 22.
 */
export type MotionPresetId = string

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Slide / Master / Deck composition types                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * A slide authored by AI or human. Pure JSON — round-trips through
 * `JSON.parse(JSON.stringify(...))` unchanged.
 *
 * Every field is optional so that a partial spec is valid (the layout engine
 * supplies defaults for anything absent), and so the type can be used as a
 * lightweight overlay on top of an existing `TDPage` without requiring any
 * existing data to change.
 */
export interface SlideSpec {
  /** Named layout (e.g. `'title'`, `'two-column'`). */
  layout?: string
  /** Named content slots, each holding a `BlockSpec`. */
  content: Record<string, BlockSpec>
  /** Override slide background. */
  background?: Paint
  /** Speaker notes. */
  notes?: string
  /** When true, this slide is skipped in presentation mode. */
  skipInPresentation?: boolean
  /** References a reusable `MasterSpec` by name. */
  masterId?: string
}

/**
 * A reusable slide template — a background layer of named regions that a
 * `SlideSpec` can reference via `masterId`. Not a slide itself; it supplies
 * default `BlockSpec`s for the regions it declares.
 */
export interface MasterSpec {
  /** Unique name, used as the key in `DeckSpec.masters` and as the target of `SlideSpec.masterId`. */
  name: string
  /** Named regions, each holding a default `BlockSpec`. */
  blocks: Record<string, BlockSpec>
  /** Default background for slides that use this master. */
  background?: Paint
  /** Default layout name. */
  layout?: string
}

/**
 * A complete deck specification: an ordered array of slides plus optional
 * master definitions and deck-wide theme/metadata. Pure JSON.
 */
export interface DeckSpec {
  /** Ordered slides. */
  slides: SlideSpec[]
  /** Reusable master templates, keyed by name. */
  masters?: Record<string, MasterSpec>
  /** Deck-wide theme overrides. */
  theme?: {
    /** Colour token map. */
    colors?: Record<string, string>
    /** Font token map. */
    fonts?: Record<string, string>
  }
  /** Deck title. */
  title?: string
}
