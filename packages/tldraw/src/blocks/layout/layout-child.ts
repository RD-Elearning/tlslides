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
import type { BlockRegistry } from '../registry'
import type { MeasureTextProvider } from './measure'
import { estimateMetrics } from './measure'
import { surfaceFromPaint } from '../tokens'

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
  /** Colour resolution. Defaults to returning `{ color, ratio: 1, ok: true }` with the token value. */
  resolveColor?: (role: ColorRole | string) => ResolvedColor
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
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Default resolveColor                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Default `resolveColor` implementation. Returns the token-derived colour with an
 * informational contrast ratio of 1 and `ok: true`. This is a stand-in; the real
 * implementation contrast-solves against `ctx.luminance` and lives in `tokens.ts`.
 *
 * For blocks that need contrast-correct colours, inject the `resolveColor` from `tokens.ts`.
 */
function defaultResolveColor(
  role: ColorRole | string,
  tokens: ResolvedTokens
): ResolvedColor {
  const color = tokens.color[role as ColorRole] ?? role
  return { color, ratio: 1, ok: true }
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
    ((role: ColorRole | string) => defaultResolveColor(role, tokens))

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
        return resolveColorFn(instanceStyle.on)
      }
      if (role === 'accent' && instanceStyle.accent !== undefined) {
        return resolveColorFn(instanceStyle.accent)
      }
      // `surface` override: when it's a string, resolve it through the base.
      // When it's a Paint (gradient), the surface context already reflects it,
      // so resolveColor('surface') simply returns the paint's solid representative.
      if (role === 'surface' && instanceStyle.surface !== undefined) {
        if (typeof instanceStyle.surface === 'string') {
          return resolveColorFn(instanceStyle.surface)
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
    return resolveColorFn(role)
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
      const childCtx = createLayoutContext({
        box: { width: box.width, height: box.height },
        tokens,
        surface: effectiveSurface,
        registry,
        measureText,
        resolveColor: wrappedResolveColor,
        resolveText: resolveTextFn,
        asset: assetFn,
        resolveAsset: resolveAssetFn,
        icon: iconFn,
        depth: newDepth,
        headless,
        style: childStyle,
      })

      const childNode = def.layout(spec.props as Record<string, unknown>, childCtx)
      return { k: 'group' as const, box, children: [childNode] }
    },
    asset: assetFn,
    resolveAsset: resolveAssetFn,
    icon: iconFn,
    depth,
    headless,
  }

  return ctx
}
