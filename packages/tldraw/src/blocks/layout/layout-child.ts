/**
 * LayoutContext construction and child layout with depth capping.
 *
 * `createLayoutContext` builds a real `LayoutContext` from tokens, surface, box, and providers.
 * `layoutChild` recursively lays out child blocks inside a box, capping depth at 4.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type {
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
} from '../types'
import type { DeckTheme } from '~types'
import type { BlockRegistry } from '../registry'
import type { MeasureTextProvider } from './measure'
import { estimateMetrics } from './measure'
import { resolveColor as solveColor, surfaceFromPaint } from '../tokens'

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
  /** Text measurement provider. Defaults to `estimateMetrics`. */
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
function defaultResolveText(
  token: TypeToken,
  over: Partial<TextStyleSpec> | undefined,
  tokens: ResolvedTokens
): ResolvedTextStyle {
  const entry = tokens.type[token]
  const size = over?.size ?? entry.size
  const lineHeight = over?.lineHeight ?? entry.lineHeight
  const family = over?.family ?? tokens.fontFamily ?? DEFAULT_FONT_FAMILY
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

const MAX_DEPTH = 4

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
  }

  const surface: SurfaceContext = { ...options.surface }

  const measureText: MeasureTextProvider = options.measureText ?? estimateMetrics

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
    layoutChild: (spec: BlockSpec, box: Box): LayoutNode => {
      const newDepth = depth + 1
      if (newDepth > MAX_DEPTH) {
        // Depth overflow: return a lint-style error node. Not a throw, not a stack overflow.
        return {
          k: 'group',
          box,
          part: 'lint/depth-overflow',
          children: [],
        }
      }

      if (!registry) {
        // No registry: return an empty placeholder.
        return { k: 'group', box, children: [] }
      }

      const def = registry.get(spec.type)
      if (!def) {
        // Unknown block type: return an empty placeholder.
        return { k: 'group', box, children: [] }
      }

      // Build a child context with incremented depth.
      // Child sees only Size (width/height) — its coordinates are always
      // relative to the group that layoutChild wraps around it.
      // Extract the child's own $block.style if present.
      const childMeta = (spec.props as Record<string, unknown>)?.$block as
        | Record<string, unknown>
        | undefined
      const childStyle = childMeta?.style as BlockStyleSpec | undefined

      // A gradient (or solid) parent fill is position-dependent: resample the parent's *raw*
      // Paint at this child's own `box`, rather than forwarding the parent's already-sampled
      // `effectiveSurface`. Two children at opposite ends of a gradient card must not receive
      // identical `ctx.surface` — that is the light-on-light-text bug R4's Watch-out predicted.
      const parentPaint = instanceStyle?.surface
      const childSurface: SurfaceContext =
        parentPaint !== undefined && typeof parentPaint !== 'string'
          ? surfaceFromPaint(parentPaint, box, {
              x: 0,
              y: 0,
              width: options.box.width,
              height: options.box.height,
            })
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
      })

      const childNode = def.layout(spec.props as Record<string, unknown>, childCtx)
      return { k: 'group' as const, box, children: [childNode] }
    },
    asset: assetFn,
    resolveAsset: resolveAssetFn,
    icon: iconFn,
    depth,
    headless,
    intrinsicSizeCache: options.intrinsicSizeCache, // F3.1: scoped memo cache
  }

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
  ctx: LayoutContext,
  registry?: BlockRegistry
): Size {
  // F3.1: Depth guard — refuse to measure past MAX_DEPTH.
  // This prevents runaway recursion when nested containers measure each other.
  if (ctx.depth !== undefined && ctx.depth > MAX_DEPTH) {
    return { width: 100, height: 100 }
  }

  // F3.1: Memo — key by (type, props-hash, box). Scoped to one compile pass
  // via the cache carried on LayoutContext.
  const boxKey = `${ctx.box.width}:${ctx.box.height}`
  const cacheKey = `${spec.type}:${hashValue(spec.props)}:${boxKey}`

  if (ctx.intrinsicSizeCache) {
    const cached = ctx.intrinsicSizeCache.get(cacheKey)
    if (cached) {
      return { ...cached }
    }
  }

  // First, check if the block definition has an intrinsicSize function
  if (registry) {
    const def = registry.get(spec.type)
    if (def?.intrinsicSize) {
      return def.intrinsicSize(spec.props, ctx)
    }
  }

  // Fallback: derive from layout() with a minimal probe box
  // Text blocks will measure their content; layout blocks will return their preferred size
  const probeBox: Size = { width: ctx.box.width, height: ctx.box.height }
  const probeCtx = createLayoutContext({
    ...ctx,
    box: probeBox,
  })

  // Create a minimal child context and call layout
  const def = registry?.get(spec.type)
  if (def?.layout) {
    // F3.1: try/catch around layout() — never crash the compiler for a bad block.
    try {
      const node = def.layout(spec.props as Record<string, unknown>, probeCtx)
      const result = { width: node.box.width, height: node.box.height }
      // F3.1: write to cache.
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