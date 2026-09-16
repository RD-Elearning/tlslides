/**
 * SVG renderer for the block system. Maps a `LayoutNode` tree to an SVG string.
 * No DOM, no React — pure string output suitable for Node.js and headless export.
 *
 * Paint is set via inline `style`, never the `fill` attribute (Phase 11).
 * Paint on inner nodes, never the outer container (Phase 8a).
 * Gradients use `<defs>` with `<linearGradient>` / `<radialGradient>`.
 */

import type { LayoutNode, Paint, MarkerSpec } from './types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Gradient-def collection state                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

interface DefCollector {
  defs: string[]
  nextId: number
}

function makeId(collector: DefCollector, prefix: string): string {
  return `${prefix}${collector.nextId++}`
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Paint → SVG fill value                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Convert a `Paint` to an SVG fill value (color string or `url(#id)` reference).
 *  Gradient defs are pushed to the collector's defs array. */
function resolvePaintToFill(
  paint: Paint,
  collector: DefCollector,
  prefix: string,
): string {
  switch (paint.type) {
    case 'solid':
      return paint.color

    case 'linearGradient': {
      const id = makeId(collector, `${prefix}lg`)
      // CSS angle convention: 0° = bottom-to-top, measured clockwise from up.
      // SVG objectBoundingBox coords: (0,0) top-left, (1,1) bottom-right.
      const angleRad = (paint.angle * Math.PI) / 180
      const dx = Math.sin(angleRad)
      const dy = -Math.cos(angleRad)
      const x1 = 0.5 - 0.5 * dx
      const y1 = 0.5 - 0.5 * dy
      const x2 = 0.5 + 0.5 * dx
      const y2 = 0.5 + 0.5 * dy
      const stops = paint.stops
        .map(s => `<stop offset="${s.at * 100}%" stop-color="${s.color}"/>`)
        .join('')
      collector.defs.push(
        `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`,
      )
      return `url(#${id})`
    }

    case 'radialGradient': {
      const id = makeId(collector, `${prefix}rg`)
      const stops = paint.stops
        .map(s => `<stop offset="${s.at * 100}%" stop-color="${s.color}"/>`)
        .join('')
      collector.defs.push(
        `<radialGradient id="${id}" cx="${paint.cx * 100}%" cy="${paint.cy * 100}%">${stops}</radialGradient>`,
      )
      return `url(#${id})`
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Collect gradient defs from a tree (for renderSvgDefs)                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

function collectGradientDefs(
  node: LayoutNode,
  collector: DefCollector,
  prefix: string,
): void {
  if (node.fill && node.fill.type !== 'solid') {
    resolvePaintToFill(node.fill, collector, prefix)
  }
  if (node.k === 'group') {
    for (const child of node.children) {
      collectGradientDefs(child, collector, prefix)
    }
  }
}

/** Extract all gradient definitions from a layout tree as a `<defs>` string. */
export function renderSvgDefs(node: LayoutNode): string {
  const collector: DefCollector = { defs: [], nextId: 0 }
  collectGradientDefs(node, collector, 'svg')
  if (collector.defs.length === 0) return ''
  return `<defs>${collector.defs.join('')}</defs>`
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* XML escaping                                                                   */
/* ─────────────────────────────────────────────────────────────────────────────── */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Build a style="" attribute value, escaping quotes for valid XML. */
function styleAttr(css: string): string {
  return `style="${css.replace(/"/g, '&quot;')}"`
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* SVG marker helpers                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

function markerId(marker: MarkerSpec, prefix: string): string {
  return `${prefix}m-${marker.kind}-${marker.color.replace('#', '')}`
}

function renderMarkerDef(marker: MarkerSpec, prefix: string): string {
  const id = markerId(marker, prefix)
  switch (marker.kind) {
    case 'arrow':
      return (
        `<marker id="${id}" viewBox="0 0 10 10" refX="10" refY="5" ` +
        `markerWidth="6" markerHeight="6" orient="auto-start-reverse">` +
        `<path d="M 0 0 L 10 5 L 0 10 z" ${styleAttr(`fill:${marker.color}`)}/>` +
        `</marker>`
      )
    case 'circle':
      return (
        `<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" ` +
        `markerWidth="6" markerHeight="6">` +
        `<circle cx="5" cy="5" r="5" ${styleAttr(`fill:${marker.color}`)}/>` +
        `</marker>`
      )
    default:
      return ''
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Recursive node rendering                                                       */
/* ─────────────────────────────────────────────────────────────────────────────── */

function renderNodeInner(
  node: LayoutNode,
  collector: DefCollector,
  prefix: string,
): string {
  switch (node.k) {
    /* ── group ─────────────────────────────────────────────────────────────── */
    case 'group': {
      const attrs: string[] = []
      if (node.name) attrs.push(`id="${node.name}"`)
      if (node.opacity !== undefined) attrs.push(`opacity="${node.opacity}"`)
      if (node.clip) {
        const clipId = makeId(collector, `${prefix}cp`)
        collector.defs.push(
          `<clipPath id="${clipId}"><rect x="${node.box.x}" y="${node.box.y}" width="${node.box.width}" height="${node.box.height}"/></clipPath>`,
        )
        attrs.push(`clip-path="url(#${clipId})"`)
      }
      const children = node.children
        .map(c => renderNodeInner(c, collector, prefix))
        .join('')
      return `<g${attrs.length ? ' ' + attrs.join(' ') : ''}>${children}</g>`
    }

    /* ── rect ──────────────────────────────────────────────────────────────── */
    case 'rect': {
      const elAttrs: string[] = [
        `x="${node.box.x}"`,
        `y="${node.box.y}"`,
        `width="${node.box.width}"`,
        `height="${node.box.height}"`,
      ]
      if (typeof node.radius === 'number') {
        elAttrs.push(`rx="${node.radius}"`)
        elAttrs.push(`ry="${node.radius}"`)
      } else if (Array.isArray(node.radius)) {
        elAttrs.push(`rx="${node.radius[0]}"`)
        elAttrs.push(`ry="${node.radius[0]}"`)
      }
      const styles: string[] = []
      if (node.fill) {
        styles.push(
          `fill:${resolvePaintToFill(node.fill, collector, prefix)}`,
        )
      }
      if (node.stroke) {
        styles.push(`stroke:${node.stroke.color}`)
        styles.push(`stroke-width:${node.stroke.width}`)
      }
      if (styles.length > 0) {
        elAttrs.push(styleAttr(styles.join(';')))
      }
      return `<rect ${elAttrs.join(' ')}/>`
    }

    /* ── path ──────────────────────────────────────────────────────────────── */
    case 'path': {
      const styles: string[] = []
      if (node.fill) {
        styles.push(
          `fill:${resolvePaintToFill(node.fill, collector, prefix)}`,
        )
      } else {
        styles.push('fill:none')
      }
      if (node.stroke) {
        styles.push(`stroke:${node.stroke.color}`)
        styles.push(`stroke-width:${node.stroke.width}`)
      }
      return `<path d="${node.d}" ${styleAttr(styles.join(';'))}/>`
    }

    /* ── text ──────────────────────────────────────────────────────────────── */
    case 'text': {
      const textStyles = [
        `font-family:${node.style.family}`,
        `font-size:${node.style.size}px`,
        `line-height:${node.style.lineHeight}`,
        `letter-spacing:${node.style.letterSpacing}em`,
        `fill:${node.style.color}`,
      ].join(';')

      const tspans = node.lines
        .map(line => {
          let content: string
          if (line.runs && line.runs.length > 0) {
            content = line.runs
              .map(run => {
                const runStyles: string[] = []
                if (run.bold) runStyles.push('font-weight:bold')
                if (run.italic) runStyles.push('font-style:italic')
                if (run.color) runStyles.push(`fill:${run.color}`)
                if (run.size)
                  runStyles.push(
                    `font-size:${node.style.size * run.size}px`,
                  )
                if (runStyles.length > 0) {
                  return `<tspan ${styleAttr(runStyles.join(';'))}>${escapeXml(run.text)}</tspan>`
                }
                return escapeXml(run.text)
              })
              .join('')
          } else {
            content = escapeXml(line.text)
          }
          return `<tspan x="${node.box.x}" y="${node.box.y + line.baseline}">${content}</tspan>`
        })
        .join('')

      return `<text ${styleAttr(textStyles)}>${tspans}</text>`
    }

    /* ── image ─────────────────────────────────────────────────────────────── */
    case 'image': {
      const preserveAspectRatio =
        node.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'
      return (
        `<image x="${node.box.x}" y="${node.box.y}" ` +
        `width="${node.box.width}" height="${node.box.height}" ` +
        `href="${node.assetId}" preserveAspectRatio="${preserveAspectRatio}"/>`
      )
    }

    /* ── icon ──────────────────────────────────────────────────────────────── */
    case 'icon': {
      const styles: string[] = []
      if (node.strokeWidth) {
        styles.push('fill:none')
        styles.push(`stroke:${node.fill}`)
        styles.push(`stroke-width:${node.strokeWidth}`)
      } else {
        styles.push(`fill:${node.fill}`)
      }
      return (
        `<svg x="${node.box.x}" y="${node.box.y}" ` +
        `width="${node.box.width}" height="${node.box.height}" ` +
        `viewBox="0 0 ${node.box.width} ${node.box.height}">` +
        `<path d="${node.icon}" ${styleAttr(styles.join(';'))}/>` +
        `</svg>`
      )
    }

    /* ── line ──────────────────────────────────────────────────────────────── */
    case 'line': {
      const lineStyles = `stroke:${node.stroke.color};stroke-width:${node.stroke.width}`
      let markerAttrs = ''
      if (node.marker) {
        const id = markerId(node.marker, prefix)
        const def = renderMarkerDef(node.marker, prefix)
        if (def) collector.defs.push(def)
        markerAttrs = ` marker-end="url(#${id})"`
      }
      return (
        `<line x1="${node.from.x}" y1="${node.from.y}" ` +
        `x2="${node.to.x}" y2="${node.to.y}" ` +
        `${styleAttr(lineStyles)}${markerAttrs}/>`
      )
    }

    /* ── host ──────────────────────────────────────────────────────────────── */
    case 'host': {
      return (
        `<rect x="${node.box.x}" y="${node.box.y}" ` +
        `width="${node.box.width}" height="${node.box.height}" ` +
        `${styleAttr('fill:none;stroke:#999;stroke-width:1;stroke-dasharray:4 2')}/>`
      )
    }

    default: {
      // Exhaustive check at the type level — never actually reached
      return node as never
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Root export                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Render a `LayoutNode` tree to an SVG string.
 *  Pure string output — no DOM, no React, no `document`.
 *  All paint is set via inline `style`, never the `fill` attribute.
 *  Gradient defs are collected and emitted in a root `<defs>` block. */
export function renderNodeToSvg(
  node: LayoutNode,
  idPrefix = '',
): string {
  const collector: DefCollector = { defs: [], nextId: 0 }
  const prefix = idPrefix || 'svg'
  const content = renderNodeInner(node, collector, prefix)
  const defs =
    collector.defs.length > 0
      ? `<defs>${collector.defs.join('')}</defs>`
      : ''
  return `<svg xmlns="http://www.w3.org/2000/svg">${defs}${content}</svg>`
}
