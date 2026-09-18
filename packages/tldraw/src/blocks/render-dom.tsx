/**
 * DOM renderer for the block system. Maps a `LayoutNode` tree to absolutely-positioned
 * React elements in slide units. No layout is computed here — the renderer only places
 * what layout already resolved.
 *
 * Paint is set via inline `style`, never the `fill` attribute (Phase 11).
 * Paint on inner nodes, never the outer container (Phase 8a).
 * `.tl-positioned-div` sets `overflow: hidden` — overlays must portal.
 */

import * as React from 'react'
import type {
  LayoutNode,
  Paint,
  Stroke,
  Box,
  TextLine,
  TextRun,
  MarkerSpec,
  ResolvedTokens,
  SurfaceContext,
  HtmlTemplateContext,
  LayoutContext,
} from './types'
import type { BlockDefinition } from './types'
import type { HostRegistry, HostRenderer, HostRenderContext } from './host-registry'
import { HostRegistryContext } from '../hooks/useHostRegistry'
import { useBlockRegistry } from '../hooks/useBlockRegistry'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Host layout context — carries tokens/surface/props for host nodes               */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * React context carrying the resolved layout context for host nodes. `HostMount`
 * reads from this to set CSS custom properties and pass them to renderers.
 * Set by `ComponentUtil` and `DeckViewer` (and any other consumer of
 * `renderNodeToDom` that may contain host nodes).
 */
export interface HostLayoutContextValue {
  tokens: ResolvedTokens
  surface: SurfaceContext
  props: Record<string, unknown>
  headless: boolean
}

export const HostLayoutContext = React.createContext<HostLayoutContextValue | undefined>(undefined)

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Paint → CSS helpers                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Convert a `Paint` to inline CSS properties (background / backgroundImage). */
export function paintToCSS(paint: Paint): React.CSSProperties {
  switch (paint.type) {
    case 'solid':
      return { backgroundColor: paint.color }
    case 'linearGradient': {
      const stops = paint.stops
        .map((s) => `${s.color} ${s.at * 100}%`)
        .join(', ')
      return { background: `linear-gradient(${paint.angle}deg, ${stops})` }
    }
    case 'radialGradient': {
      const stops = paint.stops
        .map((s) => `${s.color} ${s.at * 100}%`)
        .join(', ')
      return {
        background: `radial-gradient(circle at ${paint.cx * 100}% ${paint.cy * 100}%, ${stops})`,
      }
    }
  }
}

/** Convert a `Stroke` to inline CSS border properties. */
function strokeToCSS(stroke: Stroke): React.CSSProperties {
  return {
    borderStyle: 'solid',
    borderWidth: `${stroke.width}px`,
    borderColor: stroke.color,
  }
}

/** Convert a border-radius spec (single number or array) to CSS string. */
function radiusToCSS(radius: number | number[] | undefined): string | undefined {
  if (radius === undefined) return undefined
  if (typeof radius === 'number') return `${radius}px`
  return radius.map((r) => `${r}px`).join(' ')
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Absolute positioning style                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Build the base absolute-positioning style from a Box (slide units). */
function posStyle(box: Box): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Isomorphic layout effect (SSR-safe)                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * A `useLayoutEffect` that is a no-op on the server. This avoids the React warning
 * when a host page server-renders a `<DeckViewer>` containing host nodes.
 */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Host CSS custom properties                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * The CSS custom properties set on every host root div, derived from the resolved
 * tokens. Renderers read these from CSS rather than receiving a shared object —
 * values are copied per-mount (DoD item 5).
 */
export const HOST_CSS_VARS = [
  '--tls-surface',
  '--tls-surface-color',
  '--tls-on',
  '--tls-accent',
  '--tls-text-muted',
  '--tls-font-family',
  '--tls-type-display',
  '--tls-type-title',
  '--tls-type-heading',
  '--tls-type-subheading',
  '--tls-type-lead',
  '--tls-type-body',
  '--tls-type-caption',
  '--tls-type-footnote',
] as const

/** Build a React CSSProperties object that sets HOST_CSS_VARS from resolved tokens. */
function hostCssVarStyle(
  tokens: ResolvedTokens,
  surface: SurfaceContext,
): React.CSSProperties {
  // --tls-surface: CSS gradient string for gradient, hex for solid.
  // --tls-surface-color: solid fallback (first stop for gradient, hex for solid).
  let surfaceCss: string
  let surfaceColor: string
  const behind = surface.behind
  if (behind.type === 'solid') {
    surfaceCss = behind.color
    surfaceColor = behind.color
  } else if (behind.type === 'linearGradient') {
    const stops = behind.stops.map((s) => `${s.color} ${s.at * 100}%`).join(', ')
    surfaceCss = `linear-gradient(${behind.angle}deg, ${stops})`
    surfaceColor = behind.stops[0]?.color ?? tokens.color.surface
  } else if (behind.type === 'radialGradient') {
    const stops = behind.stops.map((s) => `${s.color} ${s.at * 100}%`).join(', ')
    surfaceCss = `radial-gradient(circle at ${behind.cx * 100}% ${behind.cy * 100}%, ${stops})`
    surfaceColor = behind.stops[0]?.color ?? tokens.color.surface
  } else {
    surfaceCss = tokens.color.surface
    surfaceColor = tokens.color.surface
  }
  return {
    '--tls-surface': surfaceCss,
    '--tls-surface-color': surfaceColor,
    '--tls-on': tokens.color.text,
    '--tls-accent': tokens.color.accent,
    '--tls-text-muted': tokens.color.textMuted,
    '--tls-font-family': tokens.fontFamily,
    '--tls-type-display': `${tokens.type.display.size}px`,
    '--tls-type-title': `${tokens.type.title.size}px`,
    '--tls-type-heading': `${tokens.type.heading.size}px`,
    '--tls-type-subheading': `${tokens.type.subheading.size}px`,
    '--tls-type-lead': `${tokens.type.lead.size}px`,
    '--tls-type-body': `${tokens.type.body.size}px`,
    '--tls-type-caption': `${tokens.type.caption.size}px`,
    '--tls-type-footnote': `${tokens.type.footnote.size}px`,
  } as React.CSSProperties
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* HTML block → HostRenderer adapter                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * CSS custom property name map: role name → --tls-* variable.
 * Used by `ctx.cssVar()` in html block templates.
 */
const CSS_VAR_MAP: Record<string, string> = {
  surface: '--tls-surface',
  on: '--tls-on',
  accent: '--tls-accent',
  'text-muted': '--tls-text-muted',
  'font-family': '--tls-font-family',
}

/**
 * Adapt a `kind: 'html'` BlockDefinition into a `HostRenderer`. The template is called
 * with an `HtmlTemplateContext` that provides `esc()`, `cssVar()`, box, and tokens.
 *
 * Key invariants:
 * - `mount` replaces children (React StrictMode safety).
 * - `update` re-templates only when props changed; does NOT call `animate` again (R3 concern).
 * - `unmount` is a no-op (the disposer from mount handles cleanup).
 * - The host div is a leaf: no React children, ever.
 */
function createHtmlBlockRenderer(def: BlockDefinition): HostRenderer {
  return {
    mount(root: HTMLElement, hctx: HostRenderContext): void | (() => void) {
      const tplCtx: HtmlTemplateContext = {
        esc: htmlEscape,
        cssVar: (role: string) => {
          const varName = CSS_VAR_MAP[role] ?? `--tls-${role}`
          return `var(${varName})`
        },
        box: hctx.box,
        tokens: hctx.tokens,
      }
      const html = def.html!.template(hctx.props, tplCtx)
      root.innerHTML = html

      // R0.5 item 3: If this block has animate(), hide parts immediately so they
      // don't flash at full opacity between the layout effect (mount) and the
      // plain effect (reveal trigger in DeckViewer). animate()'s "from" state
      // will override this when it runs.
      if (def.html!.animate) {
        const parts = root.querySelectorAll('[data-part]')
        for (let i = 0; i < parts.length; i++) {
          (parts[i] as HTMLElement).style.opacity = '0'
        }
      }

      // If animate is defined and a BlockMotionRuntime is provided, call it.
      // When blockMotion is absent (e.g. initial load in editor), animate is skipped —
      // the block behaves as any other shape (rule 5: motion is off by default).
      if (def.html!.animate && hctx.blockMotion) {
        return def.html!.animate(root, hctx.blockMotion) ?? undefined
      }
      return undefined
    },

    update(root: HTMLElement, hctx: HostRenderContext): void {
      // Re-template. The previous DOM is replaced wholesale.
      // Do NOT call animate again — re-templating destroys running animations.
      const tplCtx: HtmlTemplateContext = {
        esc: htmlEscape,
        cssVar: (role: string) => {
          const varName = CSS_VAR_MAP[role] ?? `--tls-${role}`
          return `var(${varName})`
        },
        box: hctx.box,
        tokens: hctx.tokens,
      }
      const html = def.html!.template(hctx.props, tplCtx)
      root.innerHTML = html
    },
  }
}

/**
 * HTML-escape a string for safe insertion into markup. Escapes &, <, >, ", and '.
 * This is the whole security story for html-kind blocks: all user content goes
 * through this function.
 */
function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* HostMount — the React component that manages a host node's lifecycle            */
/* ─────────────────────────────────────────────────────────────────────────────── */

interface HostMountProps {
  render: string
  box: Box
  part?: string
}

/**
 * Internal React component that manages the lifecycle of a host node. It looks up
 * the renderer first in the `HostRegistry`, then in the `BlockRegistry` (for
 * `kind: 'html'` blocks whose `html.template` is adapted into a `HostRenderer`),
 * calls `mount` / `update` / `unmount`, and sets CSS custom properties from
 * resolved tokens (via `HostLayoutContext`).
 *
 * Key invariants:
 * - `mount` is called once (or twice under React StrictMode; the renderer must
 *   handle this by calling `root.replaceChildren()` first).
 * - `update` is called only when `props` structurally differ (JSON.stringify) or
 *   `box.width/height` changed — never on `box.x/y` alone.
 * - The disposer returned from `mount` is called before `unmount`, and is
 *   idempotent.
 * - Unknown `render` id → the div stays empty and gets `data-host-missing`.
 * - Never throws.
 */
const HostMount = React.memo(function HostMount({
  render,
  box,
  part,
}: HostMountProps) {
  const registry = React.useContext(HostRegistryContext)
  const blockRegistry = useBlockRegistry()
  const layoutCtx = React.useContext(HostLayoutContext)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const disposerRef = React.useRef<(() => void) | void | null>(null)
  const rendererRef = React.useRef<HostRenderer | null>(null)
  const prevPropsJsonRef = React.useRef<string>('')
  const prevBoxSizeRef = React.useRef<string>('')
  const mountedRef = React.useRef<boolean>(false)

  const tokens = layoutCtx?.tokens
  const surface = layoutCtx?.surface
  const hostProps = layoutCtx?.props ?? {}
  const headless = layoutCtx?.headless ?? false

  // Build the HostRenderContext
  const ctx: HostRenderContext = React.useMemo(() => ({
    box,
    tokens: tokens as ResolvedTokens, // cast: if no context, mount won't be called
    surface: surface as SurfaceContext,
    props: hostProps,
    headless,
  }), [box, tokens, surface, hostProps, headless])

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    // Resolve renderer: first check HostRegistry, then BlockRegistry for kind: 'html' blocks.
    let renderer = registry?.get(render) ?? undefined
    if (!renderer && blockRegistry) {
      const blockDef = blockRegistry.get(render)
      if (blockDef && blockDef.kind === 'html' && blockDef.html?.template) {
        renderer = createHtmlBlockRenderer(blockDef)
      }
    }
    rendererRef.current = renderer ?? null

    if (!renderer || !tokens || !surface) {
      // Unknown renderer or no layout context — stays empty, gets data-host-missing
      root.replaceChildren()
      disposerRef.current = null
      mountedRef.current = false
      return
    }

    // Clear on mount (React StrictMode safety)
    root.replaceChildren()

    // Mount the host content
    disposerRef.current = renderer.mount(root, ctx) ?? null
    mountedRef.current = true

    return () => {
      // Call disposer first, then unmount
      if (disposerRef.current) {
        disposerRef.current()
        disposerRef.current = null
      }
      if (mountedRef.current && renderer) {
        renderer.unmount?.(root)
      }
      mountedRef.current = false
    }
  }, [render, registry, blockRegistry])

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    const renderer = rendererRef.current
    if (!root || !renderer || !tokens || !surface) return

    if (!renderer.update) return

    const propsJson = JSON.stringify(hostProps)
    const boxSize = `${box.width}x${box.height}`

    // Skip if nothing structurally changed
    if (
      prevPropsJsonRef.current === propsJson &&
      prevBoxSizeRef.current === boxSize
    ) {
      return
    }

    // If this is the very first run after mount (prevPropsJsonRef is empty),
    // skip — the mount effect above already called mount().
    if (prevPropsJsonRef.current === '') {
      prevPropsJsonRef.current = propsJson
      prevBoxSizeRef.current = boxSize
      return
    }

    prevPropsJsonRef.current = propsJson
    prevBoxSizeRef.current = boxSize

    renderer.update(root, ctx)
  }, [hostProps, box.width, box.height])

  const hasRenderer = (registry?.has(render) ?? false) || (() => {
    if (!blockRegistry) return false
    const def = blockRegistry.get(render)
    return !!(def && def.kind === 'html' && def.html?.template)
  })()

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        ...(tokens && surface ? hostCssVarStyle(tokens, surface) : {}),
      }}
      data-render={render}
      {...(hasRenderer ? {} : { 'data-host-missing': render })}
      {...(part ? { 'data-part': part } : {})}
    />
  )
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Node rendering                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Recursive function that maps a `LayoutNode` to React elements. */
export function renderNodeToDom(node: LayoutNode): React.ReactNode {
  const part = node.part
  const pos = posStyle(node.box)

  switch (node.k) {
    case 'group': {
      const groupStyle: React.CSSProperties = {
        ...pos,
        overflow: node.clip ? 'hidden' : undefined,
        opacity: node.opacity,
      }
      return (
        <div
          key={part ?? undefined}
          style={groupStyle}
          {...(part ? { 'data-part': part } : {})}
        >
          {node.children.map((child, i) => (
            // The key must include the index. `part` alone is not unique: a block is free to
            // emit two nodes with the same part name (a repeated `label`, one per column), and
            // React then warns "Encountered two children with the same key" and may duplicate or
            // omit one of them. Part names are a *motion* address (`data-part`, which stays on
            // the element below), not an identity — the layout tree is rebuilt wholesale on every
            // render, so position is the identity here.
            <React.Fragment key={`${child.part ?? 'n'}:${i}`}>
              {renderNodeToDom(child)}
            </React.Fragment>
          ))}
        </div>
      )
    }

    case 'rect': {
      const rectStyle: React.CSSProperties = {
        ...pos,
        ...(node.fill ? paintToCSS(node.fill) : {}),
        ...(node.stroke ? strokeToCSS(node.stroke) : {}),
        borderRadius: radiusToCSS(node.radius),
      }
      return (
        <div
          key={part ?? undefined}
          style={rectStyle}
          {...(part ? { 'data-part': part } : {})}
        />
      )
    }

    case 'path': {
      const pathStyle: React.CSSProperties = { ...pos }
      const fillCSS = node.fill
        ? (() => {
            const css = paintToCSS(node.fill)
            return css.backgroundColor ?? css.background ?? 'none'
          })()
        : 'none'

      return (
        <svg
          key={part ?? undefined}
          style={pathStyle}
          viewBox={`0 0 ${node.box.width} ${node.box.height}`}
          xmlns="http://www.w3.org/2000/svg"
          {...(part ? { 'data-part': part } : {})}
        >
          <path
            d={node.d}
            style={{
              fill: fillCSS as string,
              ...(node.stroke
                ? { stroke: node.stroke.color, strokeWidth: node.stroke.width }
                : {}),
            }}
          />
        </svg>
      )
    }

    case 'text': {
      // Text container uses position:relative as the positioning context for lines.
      // Lines use position:absolute with cumulative baselines (from A1's estimateMetrics).
      const textStyle: React.CSSProperties = {
        ...pos,
        position: 'absolute',
        left: `${node.box.x}px`,
        top: `${node.box.y}px`,
        width: `${node.box.width}px`,
        height: `${node.box.height}px`,
        fontFamily: node.style.family,
        fontSize: `${node.style.size}px`,
        lineHeight: node.style.lineHeight,
        letterSpacing: `${node.style.letterSpacing}em`,
        color: node.style.color,
      }

      return (
        <div
          key={part ?? undefined}
          style={textStyle}
          {...(part ? { 'data-part': part } : {})}
        >
          {node.lines.map((line: TextLine, i: number) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${line.baseline}px`,
                whiteSpace: 'pre',
              }}
            >
              {line.runs
                ? line.runs.map((run: TextRun, j: number) => (
                    <span
                      key={j}
                      style={{
                        fontWeight: run.bold ? 'bold' : undefined,
                        fontStyle: run.italic ? 'italic' : undefined,
                        color: run.color,
                        ...(run.size ? { fontSize: `${node.style.size * run.size}px` } : {}),
                      }}
                    >
                      {run.text}
                    </span>
                  ))
                : line.text}
            </div>
          ))}
        </div>
      )
    }

    case 'image': {
      const objectPosition = node.focal
        ? `${node.focal[0] * 100}% ${node.focal[1] * 100}%`
        : undefined
      // When url is provided, render <img> with the resolved asset URL.
      // When missing (asset not resolved), render a dashed frame with alt text.
      if (node.url) {
        const imgStyle: React.CSSProperties = {
          ...pos,
          objectFit: node.fit,
          objectPosition,
          borderRadius: node.radius ? `${node.radius}px` : undefined,
        }
        return (
          <img
            key={part ?? undefined}
            src={node.url}
            alt={node.alt}
            style={imgStyle}
            {...(part ? { 'data-part': part } : {})}
          />
        )
      }
      // Missing-asset fallback: dashed frame with alt text centred inside.
      const placeholderStyle: React.CSSProperties = {
        ...pos,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #999',
        borderRadius: node.radius ? `${node.radius}px` : undefined,
        color: '#999',
        fontSize: '14px',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        padding: '8px',
        boxSizing: 'border-box',
      }
      return (
        <div
          key={part ?? undefined}
          style={placeholderStyle}
          {...(part ? { 'data-part': part } : {})}
        >
          {node.alt}
        </div>
      )
    }

    case 'icon': {
      return (
        <svg
          key={part ?? undefined}
          style={pos}
          viewBox={`0 0 ${node.box.width} ${node.box.height}`}
          xmlns="http://www.w3.org/2000/svg"
          {...(part ? { 'data-part': part } : {})}
        >
          <path
            d={node.icon}
            style={{
              fill: node.fill,
              ...(node.strokeWidth
                ? { stroke: node.fill, strokeWidth: node.strokeWidth, fill: 'none' }
                : {}),
            }}
          />
        </svg>
      )
    }

    case 'line': {
      const markerDef = node.marker
        ? renderMarker(node.marker)
        : null

      return (
        <svg
          key={part ?? undefined}
          style={pos}
          viewBox={`0 0 ${node.box.width} ${node.box.height}`}
          xmlns="http://www.w3.org/2000/svg"
          {...(part ? { 'data-part': part } : {})}
        >
          {markerDef && <defs>{markerDef}</defs>}
          <line
            x1={node.from.x}
            y1={node.from.y}
            x2={node.to.x}
            y2={node.to.y}
            style={{
              stroke: node.stroke.color,
              strokeWidth: node.stroke.width,
            }}
            markerEnd={node.marker ? `url(#${renderMarkerId(node.marker)})` : undefined}
          />
        </svg>
      )
    }

    case 'host': {
      return (
        <HostMount
          key={part ?? undefined}
          render={node.render}
          box={node.box}
          part={node.part}
        />
      )
    }

    default: {
      // Exhaustive check at the type level — never actually reached
      return node as never
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* SVG marker helper                                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

function renderMarkerId(marker: MarkerSpec): string {
  return `marker-${marker.kind}-${marker.color.replace('#', '')}`
}

function renderMarker(marker: MarkerSpec): React.ReactElement | null {
  const id = renderMarkerId(marker)
  switch (marker.kind) {
    case 'arrow':
      return (
        <marker
          id={id}
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={marker.color} />
        </marker>
      )
    case 'circle':
      return (
        <marker
          id={id}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="6"
          markerHeight="6"
        >
          <circle cx="5" cy="5" r="5" fill={marker.color} />
        </marker>
      )
    default:
      return null
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* React component wrapper                                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface BlockRendererProps {
  /** The layout tree to render. */
  node: LayoutNode
  /** Optional CSS class on the root wrapper. */
  className?: string
  /** Optional inline style on the root wrapper (e.g. slide dimensions). */
  style?: React.CSSProperties
}

/**
 * React component that renders a `LayoutNode` tree as absolutely-positioned DOM
 * elements. No layout computation — only places what layout already resolved.
 */
export const BlockRenderer: React.FC<BlockRendererProps> = ({
  node,
  className,
  style,
}) => {
  return (
    <div
      className={className}
      style={style}
    >
      {renderNodeToDom(node)}
    </div>
  )
}
