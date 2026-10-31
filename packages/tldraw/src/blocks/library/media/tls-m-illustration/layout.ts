/**
 * tls.m.illustration layout — the scene's SVG with its colour slots filled from the palette (lines
 * `text`, patches `accent`, paper `surface`), as an `image` node with a `data:` URL, fitted in the
 * box at the scene's own 4:3 ratio, centred.
 */

import type { LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { ILLUSTRATIONS } from '../../../icons/illustrations'
import type { IllustrationProps } from './schema'

const norm = (s: string) => s.trim().toLowerCase().normalize('NFC').replace(/[\s_]+/g, '-')

/** The scene drawn for a name or a word: the scene of that name, else the first tagged with it. */
export function sceneName(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined
  const n = norm(v)
  if (ILLUSTRATIONS[n]) return n
  const word = v.trim().toLowerCase()
  return Object.keys(ILLUSTRATIONS).find((k) => ILLUSTRATIONS[k][2].some((t) => t === word || word.includes(t)))
}

function ratio(vb: string): number {
  const [, , w, h] = vb.split(/\s+/).map(Number)
  return w > 0 && h > 0 ? w / h : 4 / 3
}

export function layout(props: IllustrationProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width || 480)
  const H = Math.max(1, ctx.box.height || 360)
  const name = sceneName(props.scene) ?? 'reading'
  const [vb, body] = ILLUSTRATIONS[name] ?? Object.values(ILLUSTRATIONS)[0]
  const r = ratio(vb)
  const w = Math.min(W, H * r)
  const h = w / r
  const ink = ctx.resolveColor('text').color
  const accent = ctx.resolveColor(props.accent ?? 'accent').color
  const paper = ctx.resolveColor('surface').color
  const [, , vw] = vb.split(/\s+/).map(Number)
  const inner = body.replaceAll('{ink}', ink).replaceAll('{accent}', accent).replaceAll('{paper}', paper)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${props.flip ? `<g transform="translate(${vw} 0) scale(-1 1)">${inner}</g>` : inner}</svg>`
  return {
    k: 'group',
    part: 'root',
    box: { x: 0, y: 0, width: W, height: H },
    children: [{ k: 'image', part: 'scene', box: { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h }, assetId: `illustration:${name}`, alt: `${name.replace(/-/g, ' ')} illustration`, fit: 'contain', url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` }],
  }
}

export function lint(props: IllustrationProps): LintFinding[] {
  if (sceneName(props.scene)) return []
  return [{ level: 'warning', rule: 'illustration/unknown', message: `Unknown scene "${String(props.scene)}" (scenes: ${Object.keys(ILLUSTRATIONS).join(', ')}).` }]
}
