/**
 * L04 — does a slide hold an activity? True when any block on it, at any depth (container children,
 * `free[]` layers), has a definition with `activity`. Pure: it walks the block specs' JSON.
 */

import type { BlockRegistry } from '../registry'

export function blockTreeHasActivity(value: unknown, registry: BlockRegistry, depth = 0): boolean {
  if (depth > 12 || value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((v) => blockTreeHasActivity(v, registry, depth + 1))
  const o = value as Record<string, unknown>
  if (typeof o.type === 'string' && registry.get(o.type)?.activity) return true
  return Object.values(o).some((v) => blockTreeHasActivity(v, registry, depth + 1))
}

/** The slide's block specs: `regions` (each a list of blocks) and `free`. */
export function isActivitySlide(slide: { regions?: unknown; free?: unknown } | undefined, registry: BlockRegistry): boolean {
  if (!slide) return false
  return blockTreeHasActivity(slide.regions, registry) || blockTreeHasActivity(slide.free, registry)
}
