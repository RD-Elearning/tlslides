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
} from './types'

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
      const imgStyle: React.CSSProperties = {
        ...pos,
        objectFit: node.fit,
        borderRadius: node.radius ? `${node.radius}px` : undefined,
      }
      return (
        <img
          key={part ?? undefined}
          data-src={node.assetId}
          alt=""
          style={imgStyle}
          {...(part ? { 'data-part': part } : {})}
        />
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
        <div
          key={part ?? undefined}
          style={pos}
          data-render={node.render}
          {...(part ? { 'data-part': part } : {})}
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
