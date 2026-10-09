/**
 * AC3 — the font-metrics registry: every family the layout oracle measures with real widths.
 * Replaces `tableFaceKey`'s name sniffing (F5: "Crimson Pro" was measured as Inter): a CSS
 * `font-family` stack resolves to the first family in it that has a table; Inter keeps its LO5
 * table (`inter-metrics.ts`). Pure and DOM-free.
 */

import type { FaceMetrics } from './types'
import { INTER_BOLD_FACTOR, INTER_EM, INTER_FALLBACK_EM } from '../inter-metrics'
import { ARCHIVO_METRICS } from './archivo'
import { BE_VIETNAM_PRO_METRICS } from './be-vietnam-pro'
import { BRICOLAGE_GROTESQUE_METRICS } from './bricolage-grotesque'
import { CRIMSON_PRO_METRICS } from './crimson-pro'
import { FRAUNCES_METRICS } from './fraunces'
import { NUNITO_METRICS } from './nunito'
import { PATRICK_HAND_METRICS } from './patrick-hand'
import { PLAYFAIR_DISPLAY_METRICS } from './playfair-display'
import { PLUS_JAKARTA_SANS_METRICS } from './plus-jakarta-sans'
import { SOURCE_CODE_PRO_METRICS } from './source-code-pro'
import { SOURCE_SERIF_4_METRICS } from './source-serif-4'
import { INTER_KERN } from './inter-kern'

export type { FaceMetrics } from './types'

/** Inter as a face: the LO5 table, bold = regular × `INTER_BOLD_FACTOR` (how it was measured). */
export const INTER_METRICS: FaceMetrics = {
  key: 'inter',
  families: ['Inter', 'Inter Variable'],
  generic: 'sans-serif',
  fallback: INTER_FALLBACK_EM,
  regular: INTER_EM,
  bold: {},
  kern: INTER_KERN,
}

export const FONT_FACES: readonly FaceMetrics[] = [
  INTER_METRICS,
  ARCHIVO_METRICS,
  BE_VIETNAM_PRO_METRICS,
  BRICOLAGE_GROTESQUE_METRICS,
  CRIMSON_PRO_METRICS,
  FRAUNCES_METRICS,
  NUNITO_METRICS,
  PATRICK_HAND_METRICS,
  PLAYFAIR_DISPLAY_METRICS,
  PLUS_JAKARTA_SANS_METRICS,
  SOURCE_CODE_PRO_METRICS,
  SOURCE_SERIF_4_METRICS,
]

const BY_KEY = new Map(FONT_FACES.map((f) => [f.key, f]))
const BY_FAMILY = new Map(FONT_FACES.flatMap((f) => f.families.map((name) => [name.toLowerCase(), f] as const)))

/** The face for a metrics key (`FontRef.metricsKey`). */
export function faceByKey(key: string): FaceMetrics | undefined {
  return BY_KEY.get(key)
}

/** The families of a CSS `font-family` stack, unquoted, in order. */
export function familyStack(family: string): string[] {
  return family
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, '').trim())
    .filter(Boolean)
}

/** The first family of a CSS stack that has a table, or `undefined`. */
export function faceForFamily(family: string): FaceMetrics | undefined {
  for (const name of familyStack(family)) {
    const face = BY_FAMILY.get(name.toLowerCase())
    if (face) return face
  }
  return undefined
}

/** Advance of one character in em (no letter-spacing). Accented letters fall back to their NFD
 *  base letter, then the face's fallback. Bold reads the 700 table (Inter: × its bold factor). */
export function faceCharEm(face: FaceMetrics, ch: string, bold = false): number {
  if (face === INTER_METRICS) {
    const em = INTER_EM[ch] ?? INTER_EM[ch.normalize('NFD')[0]] ?? INTER_FALLBACK_EM
    return bold ? em * INTER_BOLD_FACTOR : em
  }
  const table = bold ? face.bold : face.regular
  return table[ch] ?? table[ch.normalize('NFD')[0]] ?? face.regular[ch] ?? face.regular[ch.normalize('NFD')[0]] ?? face.fallback
}

const KERN_MAPS = new WeakMap<FaceMetrics, Map<string, number>>()

function kernMap(face: FaceMetrics): Map<string, number> {
  let map = KERN_MAPS.get(face)
  if (!map) {
    map = new Map()
    for (const [em, pairs] of Object.entries(face.kern ?? {})) {
      const v = Number(em)
      for (let i = 0; i + 1 < pairs.length; i += 2) map.set(pairs.slice(i, i + 2), v)
    }
    KERN_MAPS.set(face, map)
  }
  return map
}

/** AC3: kerning between `prev` and `ch` in em (0 when the face has no such pair). Accented
 *  letters kern as their NFD base letters. The browser applies these pairs (CSS `font-kerning:
 *  auto`); a sum of advances alone ran up to ~10% wide on figures ("8.1", "3.1%"). */
export function faceKernEm(face: FaceMetrics, prev: string | undefined, ch: string): number {
  if (!prev || !face.kern) return 0
  const map = kernMap(face)
  if (map.size === 0) return 0
  return map.get(prev + ch) ?? map.get(prev.normalize('NFD')[0] + ch.normalize('NFD')[0]) ?? 0
}

/** The sample text `textWidthRatio` compares on: a pangram in sentence case. */
const WIDTH_SAMPLE = 'The quick brown fox jumps over the lazy dog 2026'

/** AC3: how wide a face sets running text against Inter (e.g. 1.08 = 8% wider, fewer characters
 *  per line). Used by the style card (§3.4 `textWidth`). 1 for an unknown key. */
export function textWidthRatio(key: string): number {
  const face = faceByKey(key)
  if (!face) return 1
  let a = 0
  let b = 0
  let prev: string | undefined
  for (const ch of WIDTH_SAMPLE) {
    a += faceCharEm(face, ch) + faceKernEm(face, prev, ch)
    b += faceCharEm(INTER_METRICS, ch) + faceKernEm(INTER_METRICS, prev, ch)
    prev = ch
  }
  return Math.round((a / b) * 100) / 100
}
