/**
 * spro creative PLAN §6.3 (CR7b) — look axes: how a block is *drawn* (its strokes, fills, corners,
 * depth, emphasis, connectors, icon and frame treatment), set per deck, slide or block and merged
 * in that order over the style's own treatment (`StyleSurface.render`). Paint only: the layout and
 * the oracle never read a look, so a look never moves or resizes anything.
 *
 * - `resolveLook` merges style → deck → slide → block (a nested block draws with its parent's).
 * - `lookTreatment` turns the resolved axes into the treatment `paint-treatment.ts` paints.
 * - `lookProblems` (validator, `look/unknown-value`) and `lookRangeProblems` (`/check` with a
 *   range, `look/out-of-range`) keep the values honest; spro owns the ranges per family.
 *
 * Pure and DOM-free.
 */
import type { LookAxes, StyleSurface } from './types'

export const LOOK_VALUES: { [K in keyof Required<LookAxes>]: ReadonlyArray<NonNullable<LookAxes[K]>> } = {
  stroke: ['crisp', 'rough', 'ink', 'chalk', 'marker'],
  fill: ['flat', 'none', 'hachure', 'crosshatch', 'paper', 'gradient', 'glass'],
  corner: ['square', 'round', 'pill', 'wobbly', 'cut'],
  depth: ['flat', 'soft', 'hard', 'extrude', 'clay', 'stack'],
  icon: ['outline', 'thin', 'duotone', 'filled', 'hand', 'blob', 'sticker', 'tile', 'emoji'],
  emphasis: ['bold', 'color', 'highlighter', 'underline', 'circle', 'box'],
  connector: ['straight', 'curved', 'hand', 'dotted'],
  frame: ['none', 'card', 'tape', 'polaroid', 'torn', 'circle', 'blob'],
}

export type LookAxis = keyof typeof LOOK_VALUES
export const LOOK_AXES = Object.keys(LOOK_VALUES) as LookAxis[]

/**
 * Values the painter draws today. The others validate and round-trip (a deck may ask for them) but
 * paint as the style's default until their renderer lands (frames, paper, glass,
 * curved and hand connectors: Phase R) — `/capabilities` lists them as such.
 */
export const LOOK_PAINTED: Record<LookAxis, readonly string[]> = {
  stroke: ['crisp', 'rough', 'ink', 'chalk', 'marker'],
  fill: ['flat', 'hachure', 'crosshatch', 'gradient'],
  corner: ['square', 'round', 'pill', 'wobbly', 'cut'],
  depth: ['flat', 'soft', 'hard', 'extrude', 'clay', 'stack'],
  icon: ['outline', 'thin', 'duotone', 'filled', 'hand', 'blob', 'sticker', 'tile', 'emoji'],
  emphasis: ['bold', 'color', 'highlighter', 'underline', 'circle', 'box'],
  connector: ['straight', 'dotted'],
  frame: [],
}

/** What the painter reads: the resolved axes plus the style's fine-tuning. */
export interface Treatment extends LookAxes {
  /** Rough.js roughness of the style (1 = the default wobble). */
  roughness?: number
  /** Highlighter colour (`#rrggbb`) of the style. */
  highlight?: string
}

/** The style's render treatment as look axes (back-compat: a deck that sets no look draws as before). */
export function styleLook(render: StyleSurface['render'] | undefined): Treatment {
  if (!render) return {}
  const out: Treatment = {}
  if (render.stroke) out.stroke = render.stroke
  if (render.fill) out.fill = render.fill
  if (render.emphasis) out.emphasis = render.emphasis
  if (render.roughness !== undefined) out.roughness = render.roughness
  if (render.highlight) out.highlight = render.highlight
  return out
}

const clean = (look: LookAxes | undefined): LookAxes => {
  const out: LookAxes = {}
  if (!look || typeof look !== 'object') return out
  for (const ax of LOOK_AXES) {
    const v = (look as Record<string, unknown>)[ax]
    if (typeof v === 'string' && (LOOK_VALUES[ax] as readonly string[]).includes(v)) (out as Record<string, string>)[ax] = v
  }
  return out
}

/** The merged look: style → deck → slide → block (unknown values are skipped; the validator reports them). */
export function resolveLook(render: StyleSurface['render'] | undefined, ...layers: Array<LookAxes | undefined>): Treatment {
  let out: Treatment = styleLook(render)
  for (const l of layers) out = { ...out, ...clean(l) }
  return out
}

/** True when a treatment asks the painter for anything (a crisp, flat, default look paints nothing). */
export function paintsAnything(t: Treatment | undefined): boolean {
  if (!t) return false
  return (
    (!!t.stroke && t.stroke !== 'crisp') ||
    (!!t.fill && t.fill !== 'flat') ||
    !!t.corner ||
    !!t.depth ||
    (!!t.emphasis && t.emphasis !== 'bold') ||
    t.connector === 'dotted' ||
    (!!t.icon && t.icon !== 'outline')
  )
}

/** `look/unknown-value` findings for a look object at `path`. */
export function lookProblems(look: unknown, path: string, owner: string): Array<{ rule: string; path: string; message: string }> {
  if (look === undefined) return []
  if (!look || typeof look !== 'object' || Array.isArray(look)) {
    return [{ rule: 'look/unknown-value', path, message: `${owner} has a look that is not an object of axes (${LOOK_AXES.join(', ')}).` }]
  }
  const out: Array<{ rule: string; path: string; message: string }> = []
  for (const [k, v] of Object.entries(look as Record<string, unknown>)) {
    if (!(LOOK_AXES as string[]).includes(k)) {
      out.push({ rule: 'look/unknown-value', path: `${path}.${k}`, message: `${owner}: \`${k}\` is not a look axis (${LOOK_AXES.join(', ')}).` })
    } else if (typeof v !== 'string' || !(LOOK_VALUES[k as LookAxis] as readonly string[]).includes(v)) {
      out.push({ rule: 'look/unknown-value', path: `${path}.${k}`, message: `${owner}: look ${k} \`${String(v)}\` is not one of ${LOOK_VALUES[k as LookAxis].join(', ')}.` })
    }
  }
  return out
}

/** `look/out-of-range`: an axis value outside the deck's range (spro's family range, passed to `/check`). */
export function lookRangeProblems(look: LookAxes | undefined, range: Partial<Record<LookAxis, string[]>> | undefined, where: string): Array<{ code: string; message: string }> {
  if (!look || !range) return []
  const out: Array<{ code: string; message: string }> = []
  for (const ax of LOOK_AXES) {
    const v = look[ax]
    const allowed = range[ax]
    if (v && allowed && allowed.length && !allowed.includes(v)) {
      out.push({ code: 'look/out-of-range', message: `${where}: look ${ax} \`${v}\` is outside the deck's range (${allowed.join(', ')}).` })
    }
  }
  return out
}

/** The treatment of a compiled block: the style's, then its page's merged look (`$block.lookBase`,
 *  stamped by `deckSpecToDocument`), then its own (`$block.look`). */
export function blockTreatment(render: StyleSurface['render'] | undefined, meta: unknown): Treatment | undefined {
  const m = meta && typeof meta === 'object' ? (meta as { look?: LookAxes; lookBase?: LookAxes }) : undefined
  if (!m?.look && !m?.lookBase) return render
  return resolveLook(render, m.lookBase, m.look)
}
