/**
 * LayoutContext construction and child layout with depth capping.
 *
 * `createLayoutContext` builds a real `LayoutContext` from tokens, surface, box, and providers.
 * `layoutChild` recursively lays out child blocks inside a box, capping depth at 4.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type {
  BlockDefinition,
  BlockSpec,
  BlockStyleSpec,
  Box,
  ColorRole,
  IconPath,
  AssetInfo,
  LayoutContext,
  LayoutNode,
  Paint,
  ResolvedColor,
  ResolvedTextStyle,
  ResolvedTokens,
  Size,
  SurfaceContext,
  TextStyleSpec,
  TypeToken,
  SpaceToken,
} from '../types'
import type { DeckTheme } from '~types'
import { MAX_NESTING_DEPTH } from '../types'
import type { BlockRegistry } from '../registry'
import type { MeasureTextProvider } from './measure'
import { editorMetrics } from './measure'
import { imageSurface, resolveColor as solveColor, surfaceFromPaint } from '../tokens'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Default font family for block text                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

const DEFAULT_FONT_FAMILY = '"Source Sans Pro", sans-serif'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* CreateLayoutContextOptions                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Options for building a `LayoutContext`. Required fields are the structural context
 * (box, tokens, surface); providers and the registry are injectable with sensible defaults.
 */
export interface CreateLayoutContextOptions {
  /** The box this block must fill, in slide units. Origin at top-left (0,0). */
  box: Size
  /** Resolved design tokens for this deck: colors, scales, radii. */
  tokens: ResolvedTokens
  /** What is behind this block. Foreground colors are solved against it. */
  surface: SurfaceContext
  /** Block registry for `layoutChild` lookups. */
  registry?: BlockRegistry
  /** Text measurement provider. Defaults to `editorMetrics` (browser-calibrated `tableMetrics`, LO6). */
  measureText?: MeasureTextProvider
  /** Colour resolution. Receives the effective surface this context resolves against, so the
   *  default (and any injected solver) can contrast-solve against the block's own background
   *  rather than a fixed one. Defaults to `tokens.ts`'s luminance-aware `resolveColor`. */
  resolveColor?: (role: ColorRole | string, surface: SurfaceContext) => ResolvedColor
  /** Type-token resolution. Defaults to looking up `tokens.type` with a default font family. */
  resolveText?: (token: TypeToken, over?: Partial<TextStyleSpec>) => ResolvedTextStyle
  /** Asset lookup. Returns `undefined` by default. */
  asset?: (assetId: string) => AssetInfo | undefined
  /** Resolve an asset id to a renderable URL. Returns `undefined` by default. */
  resolveAsset?: (id: string) => string | undefined
  /** Icon lookup. Returns `undefined` by default. */
  icon?: (id: string) => IconPath | undefined
  /** Current nesting depth. Defaults to 0. */
  depth?: number
  /** True when laying out for export/thumbnail; false for live editor. */
  headless?: boolean
  /** Per-instance style overrides. When `surface` is a `Paint`, the block's surface context
   *  is derived from the paint sampled at the block's box. */
  style?: BlockStyleSpec
  /** The deck theme, used only to resolve `theme:`-sentinel literals (`'theme:accent1'`). */
  theme?: DeckTheme
  /** Memo cache for `measureIntrinsicSize`, scoped to one compile pass. */
  intrinsicSizeCache?: Map<string, Size>
  /** CMP1 — a deck style's knob defaults per block type. `layoutChild` fills them into an
   *  authored nested child's props, as the compiler fills them into a slide-level block's props.
   *  Propagated to every child context. */
  blockDefaults?: Record<string, Record<string, unknown>>
  /** CMP1 — authored nesting level of the block this context lays out (region block = 1).
   *  Internal: set by `layoutChild`; absent = 1 (+ `depth`). */
  nestLevel?: number
  /** CMP1 — is the block this context lays out authored (in the document), rather than built by
   *  its parent's layout (a composite's spec tree, a card's inner stack)? Internal; absent = true. */
  authoredBlock?: boolean
  /** CMP1 — the authored child specs seen in this layout pass (by identity). Internal. */
  authored?: WeakSet<object>
}

/** CMP1 — the per-context nesting state `layoutChild` / `layoutBlock` share (never on `ctx`). */
interface NestState {
  level: number
  authoredBlock: boolean
  authored: WeakSet<object>
  blockDefaults?: Record<string, Record<string, unknown>>
}
const NEST = new WeakMap<LayoutContext, NestState>()

/** The internal options that carry a context's nesting state into a rebuilt context. */
function nestOptions(ctx: LayoutContext): Partial<CreateLayoutContextOptions> {
  const st = NEST.get(ctx)
  return st
    ? { nestLevel: st.level, authoredBlock: st.authoredBlock, authored: st.authored, ...(st.blockDefaults ? { blockDefaults: st.blockDefaults } : {}) }
    : {}
}

/**
 * CMP1 — record the child specs of an authored block as authored (by identity), so `layoutChild`
 * counts them as a nesting level and fills their defaults. Reads every `blocks`-kind slot of the
 * schema (and `children`).
 */
function registerAuthoredChildren(def: BlockDefinition, props: Record<string, unknown> | undefined, set: WeakSet<object>): void {
  if (!props || typeof props !== 'object') return
  const slots = new Set<string>(['children'])
  for (const [name, slot] of Object.entries(def.schema ?? {})) if (slot?.type?.kind === 'blocks') slots.add(name)
  for (const name of slots) {
    const v = props[name]
    if (Array.isArray(v)) for (const c of v) if (c && typeof c === 'object') set.add(c)
  }
}

/** CMP1 — a nested child's style: `spec.style` wins over the composites' private `$block.style`. */
function childStyleOf(spec: BlockSpec): BlockStyleSpec | undefined {
  const meta = (spec.props as Record<string, unknown> | undefined)?.$block as Record<string, unknown> | undefined
  const legacy = meta?.style as BlockStyleSpec | undefined
  const own = spec.style && typeof spec.style === 'object' ? spec.style : undefined
  if (!legacy) return own
  if (!own) return legacy
  return { ...legacy, ...own }
}

/**
 * CMP1 — the deck style's knob defaults under an authored child's props, exactly as the compiler
 * fills them under a slide-level block's (`applyStyleBlockDefaults`): a block looks the same at
 * any nesting level. Schema `defaults` are deliberately *not* filled at any level: they are the
 * gallery's sample content (a timeline's four example events, `alternate: true`), and filling
 * them would inject sample text and change a nested block's look against the same block at the
 * top. Every block defaults its own option props instead — pinned by `defaults-sweep.spec.ts`.
 */
function filledProps(def: BlockDefinition, props: Record<string, unknown>, blockDefaults?: Record<string, Record<string, unknown>>): Record<string, unknown> {
  const own = props && typeof props === 'object' ? props : {}
  const fill: Record<string, unknown> = {}
  const src = blockDefaults?.[def.type]
  if (src && typeof src === 'object') {
    for (const [k, v] of Object.entries(src)) if (!(k in own) && v !== undefined) fill[k] = v
  }
  if (!Object.keys(fill).length) return own
  return { ...(JSON.parse(JSON.stringify(fill)) as Record<string, unknown>), ...own }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Default resolveColor                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Default `resolveColor` implementation: the real, luminance-aware solver from `tokens.ts`.
 * A foreground role (`text`, `textMuted`, `line`) is contrast-solved against the *effective*
 * surface — the one behind this block, including a per-child resample of a gradient parent —
 * rather than the theme's nominal background. This is what makes `ctx.resolveColor` in
 * production honour R4 Do item 2's "text colours keep passing contrast" claim.
 */
function defaultResolveColor(
  role: ColorRole | string,
  surface: SurfaceContext,
  tokens: ResolvedTokens,
  theme?: DeckTheme
): ResolvedColor {
  return solveColor(role, surface, tokens, theme)
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Default resolveText                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Default `resolveText` implementation. Looks up `tokens.type[token]` for size and
 * line-height, applies any overrides, and returns a `ResolvedTextStyle` with the
 * font family from the resolved tokens (which comes from the theme, or the built-in
 * default when the theme doesn't set one).
 */
/** AC3: type tokens set in the heading family; every other token uses the body family. */
export const HEADING_TOKENS: ReadonlySet<TypeToken> = new Set<TypeToken>(['display', 'title', 'heading', 'subheading'])

function defaultResolveText(
  token: TypeToken,
  over: Partial<TextStyleSpec> | undefined,
  tokens: ResolvedTokens
): ResolvedTextStyle {
  const entry = tokens.type[token]
  const size = over?.size ?? entry.size
  const lineHeight = over?.lineHeight ?? entry.lineHeight
  // AC3: heading tokens take the heading family, the rest the body family (F4).
  const tokenFamily = HEADING_TOKENS.has(token) ? tokens.headingFamily : tokens.bodyFamily
  const family = over?.family ?? tokenFamily ?? tokens.fontFamily ?? DEFAULT_FONT_FAMILY
  const letterSpacing = over?.letterSpacing ?? -0.03
  return {
    family,
    size,
    lineHeight,
    letterSpacing,
    color: tokens.color.text,
    verticalAlign: undefined,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* createLayoutContext                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Recursion safety net in layout hops (every `layoutChild` call, a composite's internal ones
 * included) — like the validator's `HARD_DEPTH_CAP`, it never fires for a tree within
 * `MAX_NESTING_DEPTH`: a composite or a card adds at most a few internal hops per level.
 */
const MAX_LAYOUT_HOPS = 32

/**
 * Build a real `LayoutContext` from tokens, surface, box, and injectable providers.
 *
 * Every module-level object (`tokens`, `surface`) is **copied** into the context so the
 * returned `LayoutContext` is structurally isolated from the caller's originals. This is
 * enforced by tests that assert `not.toBe` *and* `toEqual`.
 */
export function createLayoutContext(
  options: CreateLayoutContextOptions
): LayoutContext {
  // Copy module-level objects — never alias them.
  const tokens: ResolvedTokens = {
    color: { ...options.tokens.color },
    categorical: [...options.tokens.categorical],
    space: { ...options.tokens.space },
    radius: { ...options.tokens.radius },
    type: Object.fromEntries(
      Object.entries(options.tokens.type).map(([k, v]) => [k, { ...v }])
    ) as ResolvedTokens['type'],
    elevation: Object.fromEntries(
      Object.entries(options.tokens.elevation).map(([k, v]) => [k, { ...v }])
    ) as ResolvedTokens['elevation'],
    motion: {
      duration: { ...options.tokens.motion.duration },
      ease: { ...options.tokens.motion.ease },
    },
    density: options.tokens.density,
    fontFamily: options.tokens.fontFamily,
    ...(options.tokens.headingFamily !== undefined ? { headingFamily: options.tokens.headingFamily } : {}),
    ...(options.tokens.bodyFamily !== undefined ? { bodyFamily: options.tokens.bodyFamily } : {}),
    ...(options.tokens.surface !== undefined ? { surface: { ...options.tokens.surface } } : {}),
  }

  const surface: SurfaceContext = { ...options.surface }

  const measureText: MeasureTextProvider = options.measureText ?? editorMetrics

  // Deep copy the instance style so the context is structurally isolated.
  const instanceStyle: BlockStyleSpec | undefined = options.style
    ? JSON.parse(JSON.stringify(options.style))
    : undefined

  // If the instance style specifies a Paint surface, recompute the surface context
  // from that paint sampled at this block's box.
  let effectiveSurface = surface
  if (instanceStyle?.surface && typeof instanceStyle.surface !== 'string') {
    // It is a Paint (solid or gradient). The block's own box is at the origin
    // in the block's local coordinate space (0,0,width,height), so we sample
    // against the full box as the parent bounds.
    effectiveSurface = surfaceFromPaint(
      instanceStyle.surface as Paint,
      { x: 0, y: 0, width: options.box.width, height: options.box.height },
      { x: 0, y: 0, width: options.box.width, height: options.box.height },
    )
  }

  const resolveColorFn =
    options.resolveColor ??
    ((role: ColorRole | string, surface: SurfaceContext) =>
      defaultResolveColor(role, surface, tokens, options.theme))

  const resolveTextFn =
    options.resolveText ??
    ((token: TypeToken, over?: Partial<TextStyleSpec>) => defaultResolveText(token, over, tokens))

  const assetFn = options.asset ?? (() => undefined)
  const resolveAssetFn = options.resolveAsset
  const iconFn = options.icon ?? (() => undefined)
  const depth = options.depth ?? 0
  const headless = options.headless ?? false
  const registry = options.registry
  const nest: NestState = {
    level: options.nestLevel ?? 1 + depth,
    authoredBlock: options.authoredBlock ?? true,
    authored: options.authored ?? new WeakSet<object>(),
    ...(options.blockDefaults ? { blockDefaults: options.blockDefaults } : {}),
  }

  // Wrap resolveColor with instance style overrides: when the instance specifies
  // `on`, `accent`, or `surface` as a literal hex / role string, honour it.
  // A role-valued `on` still goes through the base resolveColor (contrast solver);
  // a literal `on` is passed through directly (validation may warn later).
  const wrappedResolveColor = (role: ColorRole | string): ResolvedColor => {
    if (instanceStyle) {
      // `on` and `accent` override specific foreground roles
      if (role === 'text' && instanceStyle.on !== undefined) {
        return resolveColorFn(instanceStyle.on, effectiveSurface)
      }
      if (role === 'accent' && instanceStyle.accent !== undefined) {
        return resolveColorFn(instanceStyle.accent, effectiveSurface)
      }
      // `surface` override: when it's a string, resolve it through the base.
      // When it's a Paint (gradient), the surface context already reflects it,
      // so resolveColor('surface') simply returns the paint's solid representative.
      if (role === 'surface' && instanceStyle.surface !== undefined) {
        if (typeof instanceStyle.surface === 'string') {
          return resolveColorFn(instanceStyle.surface, effectiveSurface)
        }
        // Paint: return the first stop colour as a solid representative.
        const paint = instanceStyle.surface
        if (paint.type === 'solid') {
          return { color: paint.color, ratio: 1, ok: true }
        }
        const firstStop = paint.stops[0]
        return { color: firstStop?.color ?? tokens.color.surface, ratio: 1, ok: true }
      }
    }
    return resolveColorFn(role, effectiveSurface)
  }

  // Build the context object with all methods bound.
  const ctx: LayoutContext = {
    box: { ...options.box },
    tokens,
    surface: effectiveSurface,
    ...(instanceStyle ? { style: instanceStyle } : {}),
    resolveColor: wrappedResolveColor,
    resolveText: resolveTextFn,
    measureText,
    layoutChild: (spec: BlockSpec, box: Box, childOpts?: { surface?: Paint; overImage?: boolean }): LayoutNode => {
      const newDepth = depth + 1
      // X2: the wrapper group names the child block (id + type) for exporters and the report.
      const ident = {
        ...(typeof spec?.id === 'string' && spec.id ? { blockId: spec.id } : {}),
        ...(typeof spec?.type === 'string' ? { type: spec.type } : {}),
      }
      // CMP1: only authored nesting counts toward `MAX_NESTING_DEPTH`; a composite's own spec
      // tree and a card's inner stack stay on their author's level.
      const authoredChild = !!spec && typeof spec === 'object' && nest.authored.has(spec)
      const childLevel = authoredChild ? nest.level + 1 : nest.level
      if (childLevel > MAX_NESTING_DEPTH || newDepth > MAX_LAYOUT_HOPS) {
        // Too deep: an empty lint group (the layout report calls it `block/dropped`). Not a
        // throw, not a stack overflow.
        return {
          k: 'group',
          box,
          part: 'lint/depth-overflow',
          ...ident,
          children: [],
        }
      }

      if (!registry) {
        // No registry: return an empty placeholder.
        return { k: 'group', box, ...ident, children: [] }
      }

      const def = registry.get(spec.type)
      if (!def) {
        // Unknown block type: return an empty placeholder.
        return { k: 'group', box, ...ident, children: [] }
      }

      // Build a child context with incremented depth.
      // Child sees only Size (width/height) — its coordinates are always
      // relative to the group that layoutChild wraps around it.
      // CMP1: the child's own `style` (falling back to the composites' `$block.style`).
      const childStyle = childStyleOf(spec)

      // A gradient (or solid) parent fill is position-dependent: resample the parent's *raw*
      // Paint at this child's own `box`, rather than forwarding the parent's already-sampled
      // `effectiveSurface`. Two children at opposite ends of a gradient card must not receive
      // identical `ctx.surface` — that is the light-on-light-text bug R4's Watch-out predicted.
      // CMP1: a container that paints its own surface under the child (a card's fill, an
      // overlay's surface) passes it, and the child solves against that paint instead.
      const parentBounds = { x: 0, y: 0, width: options.box.width, height: options.box.height }
      const parentPaint = childOpts?.surface ?? instanceStyle?.surface
      const childSurface: SurfaceContext = childOpts?.overImage
        ? imageSurface()
        : parentPaint !== undefined && typeof parentPaint !== 'string'
          ? surfaceFromPaint(parentPaint, box, parentBounds)
          : effectiveSurface

      const childCtx = createLayoutContext({
        box: { width: box.width, height: box.height },
        tokens,
        surface: childSurface,
        registry,
        measureText,
        // Pass the *base* (surface-aware) resolver down, not this context's wrapped one: the
        // child's own style overrides must not inherit the parent's `on`/`accent`/`surface`.
        resolveColor: resolveColorFn,
        resolveText: resolveTextFn,
        asset: assetFn,
        resolveAsset: resolveAssetFn,
        icon: iconFn,
        depth: newDepth,
        headless,
        style: childStyle,
        theme: options.theme,
        intrinsicSizeCache: options.intrinsicSizeCache, // F3.1: propagate memo cache
        nestLevel: childLevel,
        authoredBlock: authoredChild,
        authored: nest.authored,
        ...(nest.blockDefaults ? { blockDefaults: nest.blockDefaults } : {}),
      })

      // CMP1: an authored child gets the deck style's knob defaults, as a slide-level block does
      // (generated specs are their builder's business).
      const raw = spec.props as Record<string, unknown>
      const props = authoredChild ? filledProps(def, raw, nest.blockDefaults) : raw
      const childNode = layoutBlock(def, props, childCtx)
      return { k: 'group' as const, box, ...ident, children: [childNode] }
    },
    // G8.5: bound the same way `layoutChild` above is — `registry` stays a closure variable,
    // never a raw field a block can read off `ctx` (matches this file's own `layoutChild`
    // pattern and 04-block-anatomy.md's documented `LayoutContext` shape, neither of which
    // exposes the registry directly). Fixes a real, previously-undiagnosed bug: `tls-l-row`/
    // `tls-l-stack`/`tls-l-grid`'s `sizing: 'content'` mode read `(ctx as any).registry`, a
    // field `LayoutContext` never had — `content` mode fell back to `equal` unconditionally for
    // every deck ever compiled, not only when a text block's intrinsic size happened to be a
    // no-op (BACKLOG-visual-fix-2.md §8.5 — found while testing that item's own fix, when a new
    // `tls.t.body.intrinsicSize` export changed nothing because this call was never reached).
    measureIntrinsicSize: (spec: BlockSpec): Size => measureIntrinsicSize(spec, ctx, registry),
    /**
     * H6: build a child context with a different box. All providers, the style overrides and the
     * effective surface are preserved verbatim — only `box` changes. Implemented as a fresh
     * `createLayoutContext` call (not a spread) so closure-bound methods resample against the
     * new box, fixing the padding-too-wide trap recorded in B3-H6.
     */
    withBox: (size: Size): LayoutContext =>
      createLayoutContext({
        ...options,
        box: size,
      }),
    asset: assetFn,
    resolveAsset: resolveAssetFn,
    icon: iconFn,
    depth,
    headless,
    intrinsicSizeCache: options.intrinsicSizeCache, // F3.1: scoped memo cache
  }

  NEST.set(ctx, nest)
  return ctx
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Intrinsic size measurement (Phase 4 V4.1)                                       */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Measure the intrinsic (natural) size of a block's content.
 * This is used by containers with `sizing: 'content'` to distribute space
 * based on each child's preferred dimensions.
 *
 * When the block definition provides an `intrinsicSize` function, it is used
 * directly. Otherwise, falls back to calling `layout()` with a probe box
 * and reading the resulting dimensions.
 *
 * F3.1 hardening:
 * - Respects `ctx.depth` — refuses to measure past `MAX_DEPTH = 4`.
 * - Memoises results by `(type, props-hash, box)` scoped to one compile pass
 *   (the `intrinsicSizeCache` WeakMap on the context).
 * - Wraps `def.layout(...)` in try/catch — a malformed block layout must never
 *   crash the slide compiler; it returns the fallback size instead.
 *
 * @param spec The block spec to measure.
 * @param ctx The layout context for measurement.
 * @param registry Optional registry to look up block definitions.
 * @returns The intrinsic size of the block's content.
 */

/**
 * Simple deterministic hash of an arbitrary JSON-serialisable value.
 * Used to key the memo cache without external dependencies.
 */
function hashValue(value: unknown): string {
  const json = JSON.stringify(value)
  let hash = 0
  for (let i = 0; i < json.length; i++) {
    hash = (hash * 31 + json.charCodeAt(i)) | 0
  }
  return `${hash}`
}

export function measureIntrinsicSize(
  spec: BlockSpec,
  ctxIn: LayoutContext,
  registry?: BlockRegistry
): Size {
  let ctx = ctxIn
  // F3.1: Depth guard — refuse to measure past the recursion safety net.
  // This prevents runaway recursion when nested containers measure each other.
  if (ctx.depth !== undefined && ctx.depth > MAX_LAYOUT_HOPS) {
    return { width: 100, height: 100 }
  }

  // CMP1: measure the child as `layoutChild` lays it out — with its own style (not the
  // container's: a padded card used to add its padding to every child it measured), its filled
  // defaults when authored, and its nesting level.
  const outer = ctx
  const st = NEST.get(outer)
  const authoredChild = !!st && !!spec && typeof spec === 'object' && st.authored.has(spec)
  const childStyle = spec ? childStyleOf(spec) : undefined
  ctx = createLayoutContext({
    ...outer,
    box: { width: outer.box.width, height: outer.box.height },
    registry,
    style: childStyle,
    ...nestOptions(outer),
    ...(st ? { nestLevel: authoredChild ? st.level + 1 : st.level, authoredBlock: authoredChild } : {}),
    depth: outer.depth + 1,
  })
  const def = registry?.get(spec.type)
  const props = def && authoredChild ? filledProps(def, spec.props as Record<string, unknown>, st?.blockDefaults) : spec.props

  // F3.1: Memo — key by (type, props-hash, style-hash, box). Scoped to one compile pass
  // via the cache carried on LayoutContext. Style must be in the key because two children with
  // the same props but different padding share a cache slot otherwise (B3-H2).
  const boxKey = `${ctx.box.width}:${ctx.box.height}`
  const cacheKey = `${spec.type}:${hashValue(props)}:${hashValue(ctx.style ?? null)}:${boxKey}`

  if (ctx.intrinsicSizeCache) {
    const cached = ctx.intrinsicSizeCache.get(cacheKey)
    if (cached) {
      return { ...cached }
    }
  }

  // First, check if the block definition has an intrinsicSize function.
  if (def?.intrinsicSize) {
    let result = def.intrinsicSize(props, ctx)
    // B3-H2: add padding to the intrinsic size so containers distribute space correctly.
    if (ctx.style?.padding !== undefined) {
      const [padV, padH] = resolvePadding(ctx.style.padding, ctx.tokens.space)
      result = { width: result.width + padH * 2, height: result.height + padV * 2 }
    }
    if (ctx.intrinsicSizeCache) {
      ctx.intrinsicSizeCache.set(cacheKey, { ...result })
    }
    return result
  }

  // Fallback: derive from layoutBlock with a minimal probe box (B3: layoutBlock applies padding).
  const probeCtx = ctx

  if (def?.layout) {
    try {
      const node = layoutBlock(def, props as Record<string, unknown>, probeCtx)
      const result = { width: node.box.width, height: node.box.height }
      if (ctx.intrinsicSizeCache) {
        ctx.intrinsicSizeCache.set(cacheKey, { ...result })
      }
      return result
    } catch {
      // A layout function threw — return fallback so the slide still renders.
    }
  }

  // Final fallback: minimal size for unknown types
  const fallback: Size = { width: 100, height: 100 }
  if (ctx.intrinsicSizeCache) {
    ctx.intrinsicSizeCache.set(cacheKey, { ...fallback })
  }
  return fallback
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Space distribution algorithm (Phase 4 V4.2)                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Distribution modes for container children.
 */
export type SizingMode = 'equal' | 'content'

/**
 * Result of space distribution for each child.
 */
export interface DistributedSize {
  /** Final size for this child slot. */
  size: Size
  /** Whether this child is sized to content (not just stretched). */
  isContentSized: boolean
}

/**
 * Distribute space among children in a container.
 *
 * For `equal` mode: all children get the same share of available space.
 * For `content` mode: children are sized to their intrinsic size, with
 * extra space distributed proportionally (similar to flex-grow behavior).
 *
 * @param availableSize The total space available for distribution.
 * @param childrenCount Number of children to distribute space among.
 * @param gap Size of gap between children.
 * @param mode Distribution mode: 'equal' or 'content'.
 * @param intrinsicSizes Optional intrinsic sizes for each child (used in 'content' mode).
 * @returns Array of distributed sizes for each child.
 */
export function distributeSpace(
  availableSize: Size,
  childrenCount: number,
  gap: number,
  mode: SizingMode = 'equal',
  intrinsicSizes?: Size[]
): DistributedSize[] {
  if (childrenCount === 0) {
    return []
  }

  // Determine if we're distributing horizontally or vertically based on which dimension varies
  const isHorizontal = availableSize.height === 0 || (availableSize.width !== 0 && availableSize.height === 0)
  const mainAvailable = isHorizontal ? availableSize.width : availableSize.height
  const crossSize = isHorizontal ? availableSize.height : availableSize.width

  // Calculate total gap space
  const totalGap = Math.max(0, (childrenCount - 1) * gap)
  const remainingSpace = Math.max(0, mainAvailable - totalGap)

  // Equal distribution mode (default)
  if (mode === 'equal') {
    const childMainSize = remainingSpace / childrenCount
    return Array.from({ length: childrenCount }, () => ({
      size: isHorizontal
        ? { width: childMainSize, height: crossSize }
        : { width: crossSize, height: childMainSize },
      isContentSized: false,
    }))
  }

  // Content-based distribution
  if (!intrinsicSizes || intrinsicSizes.length < childrenCount) {
    // Not enough intrinsic sizes, fall back to equal distribution
    const childMainSize = remainingSpace / childrenCount
    return Array.from({ length: childrenCount }, () => ({
      size: isHorizontal
        ? { width: childMainSize, height: crossSize }
        : { width: crossSize, height: childMainSize },
      isContentSized: false,
    }))
  }

  // Calculate total intrinsic main dimension
  const totalIntrinsicMain = intrinsicSizes.reduce((sum, s) => {
    return sum + (isHorizontal ? s.width : s.height)
  }, 0)

  if (totalIntrinsicMain <= 0) {
    // Invalid intrinsic sizes, fall back to equal
    const childMainSize = remainingSpace / childrenCount
    return Array.from({ length: childrenCount }, () => ({
      size: isHorizontal
        ? { width: childMainSize, height: crossSize }
        : { width: crossSize, height: childMainSize },
      isContentSized: false,
    }))
  }

  // Distribute proportionally to intrinsic sizes
  const results: DistributedSize[] = []
  const scaleFactor = remainingSpace / totalIntrinsicMain

  for (let i = 0; i < childrenCount; i++) {
    const intrinsicMain = isHorizontal ? intrinsicSizes[i].width : intrinsicSizes[i].height
    const childMainSize = Math.max(1, intrinsicMain * scaleFactor)

    results.push({
      size: isHorizontal
        ? { width: childMainSize, height: crossSize }
        : { width: crossSize, height: childMainSize },
      isContentSized: true,
    })
  }

  return results
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* layoutBlock — lay out a placed block honouring instance padding + align          */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Resolve a `SpaceToken | number | [number, number]` padding value into a concrete
 * `[block, inline]` tuple (vertical, horizontal) using the context's resolved space scale.
 * - A space token is looked up in `ctx.tokens.space`.
 * - A bare number is applied uniformly.
 * - A `[block, inline]` tuple is returned as-is.
 */
function resolvePadding(
  padding: SpaceToken | number | [number, number],
  space: Record<SpaceToken, number>
): [number, number] {
  if (typeof padding === 'number') return [padding, padding]
  if (Array.isArray(padding)) return [padding[0], padding[1]]
  return [space[padding], space[padding]]
}

/**
 * Lay out a placed block honouring its instance box style (`padding`, `align`).
 *
 * - **No padding and no align** → returns `def.layout(props, ctx)` unchanged. This is the
 *   identity invariant: every existing slide's geometry is untouched when no style override
 *   is set.
 * - **Padding** → insets the box using `insetBox`, builds an inner ctx via `ctx.withBox`
 *   (preserving providers/style/surface, only changing the box so closure methods resample
 *   correctly), calls `def.layout`, and wraps the result in groups so the outer box reports
 *   the true content height + vertical padding.
 * - **Align** (`'center'` when content is shorter than the inner box) → offsets the inner
 *   content group vertically within the padded area.
 *
 * For Tier B (host nodes) the same wrapper insets the box for both DOM and poster, keeping
 * parity automatic — no CSS padding is added in templates.
 *
 * H3: the outer group carries the inner node's original `part` (so motion's `data-part="root"`
 * still wraps the whole visible block), and the inner node's `part` is cleared.
 */
export function layoutBlock(
  def: BlockDefinition,
  props: Record<string, unknown>,
  ctx: LayoutContext
): LayoutNode {
  // CMP1: an authored block's child specs are authored too (one nesting level deeper).
  const nest = NEST.get(ctx)
  if (nest?.authoredBlock) registerAuthoredChildren(def, props, nest.authored)

  const style = ctx.style
  const hasPadding = style !== undefined && style.padding !== undefined
  const hasAlign = style !== undefined && style.align !== undefined && style.align !== 'start'

  // Identity invariant: no style override → call layout directly, zero geometry change.
  if (!hasPadding && !hasAlign) {
    return def.layout(props, ctx)
  }

  // Resolve padding into [vertical, horizontal].
  const [padV, padH] = hasPadding
    ? resolvePadding(style!.padding as SpaceToken | number | [number, number], ctx.tokens.space)
    : [0, 0]

  // Inset the box for the inner content (origin at 0,0 in the block's local space).
  const innerSize: Size = {
    width: Math.max(0, ctx.box.width - padH * 2),
    height: Math.max(0, ctx.box.height - padV * 2),
  }

  // Build an inner context with only the box changed.
  // H6: use ctx.withBox if available so closure-bound methods resample against the new box.
  const innerCtx: LayoutContext = ctx.withBox
    ? ctx.withBox({ width: innerSize.width, height: innerSize.height })
    : (() => {
        // Fallback for hand-built test contexts without withBox — rare but possible.
        return createLayoutContext({
          box: { width: innerSize.width, height: innerSize.height },
          tokens: ctx.tokens,
          surface: ctx.surface,
          registry: (ctx as unknown as { _registry?: never })._registry,
          measureText: ctx.measureText,
          resolveColor: ctx.resolveColor,
          resolveText: ctx.resolveText,
          asset: ctx.asset,
          resolveAsset: ctx.resolveAsset,
          icon: ctx.icon,
          depth: ctx.depth,
          headless: ctx.headless,
          style: ctx.style,
          intrinsicSizeCache: ctx.intrinsicSizeCache,
          ...nestOptions(ctx),
        })
      })()

  // Let the block lay out inside the inset box.
  const innerNode = def.layout(props, innerCtx)

  // Compute vertical alignment offset.
  // Align only applies when content is shorter than the inner box (H4).
  const reportedHeight = innerNode.box.height
  const freeSpace = Math.max(0, innerSize.height - reportedHeight)
  let alignOffsetY = 0
  if (hasAlign && style!.align === 'center') {
    alignOffsetY = freeSpace / 2
  } else if (hasAlign && style!.align === 'end') {
    alignOffsetY = freeSpace
  }

  // H3: move the inner root's `part` to the outer group; clear it on the inner node.
  const innerPart = innerNode.part
  innerNode.part = undefined

  // The inner node sits at (padH, padV + alignOffset) within the outer group.
  // A group's children are positioned relative to the group's own origin (0,0),
  // so the inner group's box origin is the padding offset, and the inner node
  // stays at its own 0,0 within that.
  const totalHeight = reportedHeight + padV * 2

  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: totalHeight },
    part: innerPart,
    children: [
      {
        k: 'group',
        box: { x: padH, y: padV + alignOffsetY, width: innerSize.width, height: innerSize.height },
        children: [innerNode],
      },
    ],
  }
}