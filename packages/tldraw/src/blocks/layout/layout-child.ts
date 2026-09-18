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
  Box,
  ColorRole,
  IconPath,
  AssetInfo,
  LayoutContext,
  LayoutNode,
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
  /** Icon lookup. Returns `undefined` by default. */
  icon?: (id: string) => IconPath | undefined
  /** Current nesting depth. Defaults to 0. */
  depth?: number
  /** True when laying out for export/thumbnail; false for live editor. */
  headless?: boolean
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

  const resolveColorFn =
    options.resolveColor ??
    ((role: ColorRole | string) => defaultResolveColor(role, tokens))

  const resolveTextFn =
    options.resolveText ??
    ((token: TypeToken, over?: Partial<TextStyleSpec>) => defaultResolveText(token, over, tokens))

  const assetFn = options.asset ?? (() => undefined)
  const iconFn = options.icon ?? (() => undefined)
  const depth = options.depth ?? 0
  const headless = options.headless ?? false
  const registry = options.registry

  // Build the context object with all methods bound.
  const ctx: LayoutContext = {
    box: { ...options.box },
    tokens,
    surface,
    resolveColor: resolveColorFn,
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
      const childCtx = createLayoutContext({
        box: { width: box.width, height: box.height },
        tokens,
        surface,
        registry,
        measureText,
        resolveColor: resolveColorFn,
        resolveText: resolveTextFn,
        asset: assetFn,
        icon: iconFn,
        depth: newDepth,
        headless,
      })

      const childNode = def.layout(spec.props as Record<string, unknown>, childCtx)
      return { k: 'group' as const, box, children: [childNode] }
    },
    asset: assetFn,
    icon: iconFn,
    depth,
    headless,
  }

  return ctx
}
