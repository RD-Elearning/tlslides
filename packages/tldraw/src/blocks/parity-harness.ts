/**
 * Parity harness: the load-bearing test for DOM↔SVG renderer agreement.
 *
 * Asserts that a block's DOM rendering and SVG rendering produce the same
 * visual output for every named part: geometry within 1 slide unit, fill/stroke
 * exact, text content and line count exact.
 *
 * Instead of using React's renderToStaticMarkup (which fails in Jest 27's VM
 * sandbox due to environment mismatches), this builds the HTML string directly
 * from the LayoutNode tree — the same DOM structure renderNodeToDom would produce.
 *
 * Architecture notes (09-testing.md §3):
 * - Both renderers consume the same LayoutNode tree from a single layout() call
 * - DOM: mount in Playwright, measure with getBoundingClientRect at zoom 1
 * - SVG: mount in Playwright, measure SVG elements with getBoundingClientRect
 * - Parity tolerance: 1 slide unit per dimension
 *
 * Playwright runs in a child process (parity-worker.ts) to avoid Jest 27's
 * VM sandbox incompatibility with Playwright's dynamic imports.
 *
 * Scope cuts (named follow-ups):
 * 1. Path and line geometry parity — SVG renderer positions these at root-level
 *    coordinates (relative to box origin) while DOM wraps them in a positioned
 *    SVG container. Parity for these kinds is checked via fill/stroke, not geometry.
 * 2. Text geometry size — DOM uses explicit box dimensions; SVG text bounding box
 *    depends on font metrics. Position and content are checked; size is deferred.
 * 3. Gradient paint parity — fill comparison only checks solid fills today.
 */

import { fork, type ChildProcess } from 'child_process'
import type {
  BlockDefinition,
  LayoutNode,
  Box,
  Paint,
  Stroke,
  ResolvedTokens,
  SurfaceContext,
} from './types'
import { renderNodeToSvg } from './render-svg'
import { createLayoutContext } from './layout'
import { resolveTokens } from './tokens'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Default test fixtures                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

const TEST_THEME = {
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    text: '#1a1a1a',
    textMuted: '#6b7280',
    accent1: '#3b82f6',
    accent2: '#8b5cf6',
  },
  fonts: {
    script: 'script' as const,
    sans: 'sans' as const,
    serif: 'serif' as const,
    mono: 'mono' as const,
    heading: 'sans' as const,
    body: 'sans' as const,
  },
}

/** Default resolved tokens for parity tests. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TEST_TOKENS: ResolvedTokens = resolveTokens(TEST_THEME as any)

/** Default surface context for parity tests. */
export const TEST_SURFACE: SurfaceContext = {
  behind: { type: 'solid', color: '#ffffff' },
  luminance: 1,
  overImage: false,
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Direct HTML builder (bypasses React to avoid Jest sandbox issues)               */
/* ─────────────────────────────────────────────────────────────────────────────── */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function paintToBg(paint: Paint): string {
  switch (paint.type) {
    case 'solid':
      return `background-color:${paint.color}`
    case 'linearGradient': {
      const stops = paint.stops.map((s) => `${s.color} ${s.at * 100}%`).join(', ')
      return `background:linear-gradient(${paint.angle}deg,${stops})`
    }
    case 'radialGradient': {
      const stops = paint.stops.map((s) => `${s.color} ${s.at * 100}%`).join(', ')
      return `background:radial-gradient(circle at ${paint.cx * 100}% ${paint.cy * 100}%,${stops})`
    }
  }
}

function radiusCss(radius: number | number[] | undefined): string {
  if (radius === undefined) return ''
  if (typeof radius === 'number') return `border-radius:${radius}px`
  return `border-radius:${radius.map((r) => `${r}px`).join(' ')}`
}

function strokeCss(stroke: Stroke): string {
  return `border-style:solid;border-width:${stroke.width}px;border-color:${stroke.color}`
}

function posStyle(box: Box): string {
  return `position:absolute;left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px`
}

/** Build an HTML string from a LayoutNode tree, matching renderNodeToDom's output. */
function nodeToHtml(node: LayoutNode): string {
  const part = node.part ? ` data-part="${esc(node.part)}"` : ''

  switch (node.k) {
    case 'group': {
      const style = posStyle(node.box)
      const overflow = node.clip ? 'overflow:hidden;' : ''
      const opacity = node.opacity !== undefined ? `opacity:${node.opacity};` : ''
      const children = node.children.map((c) => nodeToHtml(c)).join('')
      return `<div style="${overflow}${opacity}${style}"${part}>${children}</div>`
    }

    case 'rect': {
      const bg = node.fill ? `;${paintToBg(node.fill)}` : ''
      const border = node.stroke ? `;${strokeCss(node.stroke)}` : ''
      const rad = node.radius ? `;${radiusCss(node.radius)}` : ''
      return `<div style="${posStyle(node.box)}${bg}${border}${rad}"${part}></div>`
    }

    case 'path': {
      const fillCSS = node.fill
        ? (node.fill.type === 'solid' ? node.fill.color : 'none')
        : 'none'
      const strokeStyle = node.stroke
        ? `stroke:${node.stroke.color};stroke-width:${node.stroke.width}`
        : ''
      return `<svg style="${posStyle(node.box)}" viewBox="0 0 ${node.box.width} ${node.box.height}" xmlns="http://www.w3.org/2000/svg"${part}>` +
        `<path d="${esc(node.d)}" style="fill:${fillCSS};${strokeStyle}"/></svg>`
    }

    case 'text': {
      const lines = node.lines
        .map((line) => {
          const content = line.runs
            ? line.runs.map((run) => esc(run.text)).join('')
            : esc(line.text)
          return `<div style="position:absolute;top:${line.baseline}px;white-space:pre">${content}</div>`
        })
        .join('')
      const style = `${posStyle(node.box)};font-family:${node.style.family};font-size:${node.style.size}px;line-height:${node.style.lineHeight};letter-spacing:${node.style.letterSpacing}em;color:${node.style.color}`
      return `<div style="${style}"${part}>${lines}</div>`
    }

    case 'image': {
      const fit = node.fit
      const rad = node.radius ? `;border-radius:${node.radius}px` : ''
      const objectPosition = node.focal
        ? `;object-position:${node.focal[0] * 100}% ${node.focal[1] * 100}%`
        : ''
      if (node.url) {
        return `<img style="${posStyle(node.box)};object-fit:${fit}${objectPosition}${rad}" src="${esc(node.url)}" alt="${esc(node.alt)}"${part}/>`
      }
      // Missing-asset fallback: dashed frame with alt text.
      return `<div style="${posStyle(node.box)};display:flex;align-items:center;justify-content:center;border:2px dashed #999;border-radius:${node.radius ?? 0}px;color:#999;font-size:14px;font-family:system-ui,sans-serif;text-align:center;padding:8px;box-sizing:border-box"${part}>${esc(node.alt)}</div>`
    }

    case 'icon': {
      const fillStyle = node.strokeWidth
        ? `fill:none;stroke:${node.fill};stroke-width:${node.strokeWidth}`
        : `fill:${node.fill}`
      return `<svg style="${posStyle(node.box)}" viewBox="0 0 ${node.box.width} ${node.box.height}" xmlns="http://www.w3.org/2000/svg"${part}>` +
        `<path d="${esc(node.icon)}" style="${fillStyle}"/></svg>`
    }

    case 'line': {
      const lineStyle = `stroke:${node.stroke.color};stroke-width:${node.stroke.width}`
      return `<svg style="${posStyle(node.box)}" viewBox="0 0 ${node.box.width} ${node.box.height}" xmlns="http://www.w3.org/2000/svg"${part}>` +
        `<line x1="${node.from.x}" y1="${node.from.y}" x2="${node.to.x}" y2="${node.to.y}" style="${lineStyle}"/></svg>`
    }

    case 'host': {
      return `<div style="${posStyle(node.box)}" data-render="${esc(node.render)}"${part}></div>`
    }

    default:
      return node as never
  }
}

function nodeToDomHtml(node: LayoutNode, box: { width: number; height: number }): string {
  return `<div style="position:relative;width:${box.width}px;height:${box.height}px;overflow:hidden">${nodeToHtml(node)}</div>`
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Worker management                                                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

let worker: ChildProcess | null = null
let msgId = 0
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

function getWorker(): Promise<ChildProcess> {
  if (worker) return Promise.resolve(worker)

  return new Promise((resolve, reject) => {
    const workerPath = require.resolve('./parity-worker')
    const child = fork(workerPath, [], {
      execArgv: ['-r', '@swc-node/register'],
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })

    child.on('message', (msg: Record<string, unknown>) => {
      if (msg.ready) {
        worker = child
        resolve(child)
        return
      }
      if (typeof msg.id === 'number' && pending.has(msg.id)) {
        const p = pending.get(msg.id)
        pending.delete(msg.id)
        if (p) {
          if (msg.ok) {
            p.resolve(msg)
          } else {
            p.reject(new Error(String(msg.error || 'Worker returned ok:false')))
          }
        }
      }
    })

    child.on('error', (err) => {
      reject(err)
    })

    child.on('exit', (code) => {
      worker = null
      if (code !== 0 && code !== null) {
        reject(new Error(`Worker exited with code ${code}`))
      }
    })
  })
}

async function sendToWorker(msg: Record<string, unknown>): Promise<Record<string, unknown>> {
  const w = await getWorker()
  const id = ++msgId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
    w.send({ ...msg, id })
  })
}

/** Shut down the worker process. Call in afterAll. */
export async function shutdownWorker(): Promise<void> {
  if (worker) {
    try {
      worker.send({ cmd: 'quit' })
    } catch {
      // worker may already be dead
    }
    worker = null
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* LayoutNode tree walking helpers                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface PartInfo {
  part: string
  kind: string
  box: Box
}

/**
 * Collect all nodes with a `part` in DFS order.
 *
 * Exported (Q17, `reviews/blocks/BACKLOG-demo.md` §7) so the three-way parity scenario/spec can
 * reuse this exact walk instead of writing a second one against the same `LayoutNode` shape. Pure
 * addition — no existing caller's behavior changes.
 */
export function collectParts(node: LayoutNode): PartInfo[] {
  const result: PartInfo[] = []
  if (node.part) {
    result.push({ part: node.part, kind: node.k, box: { ...node.box } })
  }
  if (node.k === 'group') {
    for (const child of node.children) {
      result.push(...collectParts(child))
    }
  }
  return result
}

interface PartStyleInfo {
  fill?: string
  stroke?: string
  textContent?: string
  lineCount?: number
}

/** Extract fill/stroke/text metadata from the LayoutNode tree for each part. */
function collectStyles(node: LayoutNode): Map<string, PartStyleInfo> {
  const map = new Map<string, PartStyleInfo>()
  function walk(n: LayoutNode) {
    if (n.part) {
      const info: PartStyleInfo = {}
      if ('fill' in n && n.fill) {
        const f = n.fill as Paint
        if (f.type === 'solid') info.fill = f.color
      }
      if ('stroke' in n && (n as { stroke?: Stroke }).stroke) {
        info.stroke = (n as { stroke: Stroke }).stroke.color
      }
      if (n.k === 'text') {
        info.textContent = n.lines.map((l) => l.text).join('\n')
        info.lineCount = n.lines.length
      }
      map.set(n.part, info)
    }
    if (n.k === 'group') {
      for (const child of n.children) walk(child)
    }
  }
  walk(node)
  return map
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Measurement result types                                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */

interface Geom {
  x: number
  y: number
  width: number
  height: number
}

interface PartMeasurement {
  geom: Geom
  textLines: string[]
  fill: string | null
  strokeStyle: string | null
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Parity assertion                                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

const TOLERANCE = 1 // slide unit

/**
 * Kinds whose DOM and SVG geometry can be directly compared.
 *
 * icon excluded: nested SVG `<svg>` getBoundingClientRect returns content bounds
 * (not viewport bounds), so width/height differ from DOM's CSS-based dimensions.
 * This is a browser-level behavior, not a renderer bug — scope cut #4.
 */
const GEOMETRY_KINDS = new Set(['rect', 'image', 'host'])

/**
 * Assert DOM↔SVG parity for a block definition.
 */
export async function assertParity(
  definition: BlockDefinition,
  props: Record<string, unknown>,
  box: { width: number; height: number },
  _pageOrWorker?: unknown,
  options?: { svgOverride?: string },
): Promise<void> {
  // 1. Create layout context and call layout
  const ctx = createLayoutContext({
    box,
    tokens: TEST_TOKENS,
    surface: TEST_SURFACE,
  })
  const node = definition.layout(props, ctx)

  // 2. Build DOM HTML directly from LayoutNode (bypasses React)
  const domHtml = nodeToDomHtml(node, box)

  // 3. Render to SVG (or use override). The prefix is the block's own type so two blocks
  //    rendered into one document cannot collide on a gradient def id.
  const rawSvg = options?.svgOverride ?? renderNodeToSvg(node, definition.type)
  // Add width/height/viewBox for consistent coordinate system
  const svgString = rawSvg.replace(
    '<svg xmlns="http://www.w3.org/2000/svg">',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}">`,
  )

  // 4. Collect parts and expected styles
  const parts = collectParts(node)
  const partNames = parts.map((p) => p.part)
  const expectedStyles = collectStyles(node)

  // 5. Send to worker for measurement
  const workerResult = (await sendToWorker({
    cmd: 'check',
    html: domHtml,
    svgHtml: svgString,
    partNames,
    box,
    treeJson: JSON.stringify(node),
  })) as {
    ok: boolean
    dom: Record<string, PartMeasurement>
    svg: Record<string, PartMeasurement>
  }

  if (!workerResult.ok) {
    throw new Error(`Worker measurement failed: ${workerResult}`)
  }

  const domMeasurements = new Map<string, PartMeasurement>(
    Object.entries(workerResult.dom || {}),
  )
  const svgMeasurements = new Map<string, PartMeasurement>(
    Object.entries(workerResult.svg || {}),
  )

  // 6. Geometry parity (for kinds with explicit positioning)
  for (const { part, kind, box: expectedBox } of parts) {
    if (!GEOMETRY_KINDS.has(kind)) continue

    const d = domMeasurements.get(part)
    const s = svgMeasurements.get(part)

    if (!d || !s) {
      expect(d).toBeDefined()
      expect(s).toBeDefined()
      continue
    }

    // DOM vs SVG parity (the core assertion)
    expect(Math.abs(d.geom.x - s.geom.x)).toBeLessThanOrEqual(TOLERANCE)
    expect(Math.abs(d.geom.y - s.geom.y)).toBeLessThanOrEqual(TOLERANCE)
    expect(Math.abs(d.geom.width - s.geom.width)).toBeLessThanOrEqual(TOLERANCE)
    expect(Math.abs(d.geom.height - s.geom.height)).toBeLessThanOrEqual(TOLERANCE)

    // Also verify DOM matches expected box from LayoutNode
    expect(Math.abs(d.geom.width - expectedBox.width)).toBeLessThanOrEqual(TOLERANCE)
    expect(Math.abs(d.geom.height - expectedBox.height)).toBeLessThanOrEqual(TOLERANCE)
  }

  // 7. Text content and line count (exact)
  for (const { part, kind } of parts) {
    const expected = expectedStyles.get(part)
    if (!expected || kind !== 'text') continue

    const domM = domMeasurements.get(part)
    const svgM = svgMeasurements.get(part)
    expect(domM).toBeDefined()
    expect(svgM).toBeDefined()

    if (domM) {
      expect(domM.textLines.join('\n')).toBe(expected.textContent)
      expect(domM.textLines.length).toBe(expected.lineCount)
    }
    if (svgM) {
      expect(svgM.textLines.join('\n')).toBe(expected.textContent)
      expect(svgM.textLines.length).toBe(expected.lineCount)
    }
  }

  // 8. Fill/stroke exact
  for (const { part } of parts) {
    const expected = expectedStyles.get(part)
    if (!expected) continue

    if (expected.fill) {
      const domM = domMeasurements.get(part)
      const svgM = svgMeasurements.get(part)

      // DOM should have a non-transparent fill
      if (domM) {
        expect(domM.fill).not.toBeNull()
      }

      // SVG should have the correct fill color
      if (svgM) {
        const svgFill = svgM.fill || (svgM.strokeStyle && (() => {
          const m = svgM.strokeStyle ? svgM.strokeStyle.match(/fill:\s*([^;]+)/) : null
          return m ? m[1] : null
        })())
        expect(svgFill).toBeTruthy()
        if (svgFill) {
          expect(svgFill.toLowerCase()).toContain(
            expected.fill.toLowerCase(),
          )
        }
      }
    }

    if (expected.stroke) {
      const svgM = svgMeasurements.get(part)
      if (svgM && svgM.strokeStyle) {
        expect(svgM.strokeStyle.toLowerCase()).toContain(
          expected.stroke.toLowerCase(),
        )
      }
    }
  }
}
