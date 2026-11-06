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

/** spro sprint 2026-11b S10-b — a block that takes the slide's clicks in the viewer: an activity or an
 *  interactive reveal block (`reveal`). */
export function blockTreeIsInteractive(value: unknown, registry: BlockRegistry, depth = 0): boolean {
  if (depth > 12 || value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((v) => blockTreeIsInteractive(v, registry, depth + 1))
  const o = value as Record<string, unknown>
  if (typeof o.type === 'string') {
    const def = registry.get(o.type)
    if (def?.activity || def?.reveal) return true
  }
  return Object.values(o).some((v) => blockTreeIsInteractive(v, registry, depth + 1))
}

/** S10-b: the slide follows the activity click rule (a click does not advance; keys do). */
export function isInteractiveSlide(slide: { regions?: unknown; free?: unknown } | undefined, registry: BlockRegistry): boolean {
  if (!slide) return false
  return blockTreeIsInteractive(slide.regions, registry) || blockTreeIsInteractive(slide.free, registry)
}
