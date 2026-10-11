/**
 * CMP4 — shared tracks for peer cards (a CSS-subgrid-like rule for authored compositions).
 *
 * In a row or a grid row of authored cards (or content-sized stacks) with the same structure (the
 * same child types in the same order), every card's i-th child gets the tallest i-th child's
 * height. A two-line heading in one card then pushes every body in the row down with it, so the
 * bodies start on one line: the "misaligned peers" a reviewer sees first on a card row
 * (`layout/misaligned`, CMP2). The container computes the tracks once and passes them to each
 * peer (`layoutChild(…, { tracks })`); the card hands them to its inner stack, which packs its
 * children at `max(own height, track)`.
 *
 * Pure and DOM-free.
 */

import type { BlockSpec, LayoutContext, SpaceToken } from '../types'

/** Peer containers whose children can share tracks. */
const TRACKED = new Set(['tls.l.card', 'tls.l.stack'])

const kidsOf = (spec: BlockSpec): BlockSpec[] => {
  const kids = (spec?.props as { children?: unknown } | undefined)?.children
  return Array.isArray(kids) ? (kids as BlockSpec[]) : []
}

/** The width a peer's children get: a card's content box (its padding prop, default `md`). */
function innerWidth(spec: BlockSpec, width: number, ctx: LayoutContext): number {
  if (spec.type !== 'tls.l.card') return width
  const token = ((spec.props as { padding?: SpaceToken } | undefined)?.padding ?? 'md') as SpaceToken
  const pad = ctx.tokens.space[token] ?? ctx.tokens.space.md
  return Math.max(1, width - 2 * pad)
}

/**
 * Tracks for a group of peers laid side by side at `widths`, or `undefined` when they are not
 * peers of one structure (or a context cannot measure). `tracks[i]` is the tallest i-th child.
 */
export function peerTracks(peers: readonly BlockSpec[], widths: readonly number[], ctx: LayoutContext, height: number): number[] | undefined {
  if (peers.length < 2 || !ctx.withBox) return undefined
  const type = peers[0]?.type
  if (!type || !TRACKED.has(type) || peers.some((p) => p?.type !== type)) return undefined
  if (type === 'tls.l.stack' && peers.some((p) => (p.props as { sizing?: string } | undefined)?.sizing !== 'content')) return undefined
  const shape = kidsOf(peers[0]).map((k) => k?.type)
  if (shape.length < 2) return undefined
  for (const p of peers) {
    const kids = kidsOf(p)
    if (kids.length !== shape.length || kids.some((k, i) => k?.type !== shape[i])) return undefined
  }
  const tracks = shape.map(() => 0)
  peers.forEach((p, n) => {
    const m = ctx.withBox!({ width: innerWidth(p, widths[n] ?? 0, ctx), height })
    if (!m.measureIntrinsicSize) return
    kidsOf(p).forEach((k, i) => {
      tracks[i] = Math.max(tracks[i], m.measureIntrinsicSize!(k).height)
    })
  })
  return tracks.some((t) => t > 0) ? tracks : undefined
}
