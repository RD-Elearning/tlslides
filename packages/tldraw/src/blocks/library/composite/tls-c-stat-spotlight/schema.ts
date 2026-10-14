/**
 * tls.c.stat-spotlight — schema, defaults, the geometry shared by template and poster, and the
 * count-up number parser.
 */

import type { BlockSchema } from '../../../types'
import { safe, str } from '../_showcase'

export interface SpotStat {
  value: string
  label: string
}

export interface StatSpotlightProps extends Record<string, unknown> {
  value: string
  label: string
  context?: string
  progress?: number
  stats?: SpotStat[]
  /** AC2: `ring` (default) or `plain` — no ring, a bigger number. */
  visual?: 'ring' | 'plain'
  /** AC2: `below` (default) or `side` — the supporting stats in a column on the right. */
  statsPlacement?: 'below' | 'side'
}

export const schema: BlockSchema = {
  value: {
    type: { kind: 'text', maxChars: 12 },
    role: 'content',
    label: 'Value',
    required: true,
    guidance: 'The number as it reads, unit included: "92%", "1.250", "4,6/5".',
  },
  label: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Label', required: true },
  context: { type: { kind: 'text', maxChars: 100 }, role: 'content', label: 'Context' },
  progress: {
    type: { kind: 'number', min: 0, max: 100 },
    role: 'content',
    label: 'Ring fill %',
    guidance: 'How much of the ring fills, 0-100; for a percentage use the same number. Default 100.',
  },
  stats: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          value: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Value', required: true },
          label: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'Label', required: true },
        },
      },
      max: 3,
    },
    role: 'content',
    label: 'Supporting stats',
    guidance: '0-3 smaller numbers, each { value, label }.',
  },
  visual: {
    type: { kind: 'enum', values: ['ring', 'plain'] },
    role: 'option',
    label: 'Visual',
    guidance: '`plain`: no ring, a bigger number (not a share).',
  },
  statsPlacement: {
    type: { kind: 'enum', values: ['below', 'side'] },
    role: 'option',
    label: 'Stats placement',
    guidance: '`side`: stats in a right column.',
  },
}

export const defaults: StatSpotlightProps = {
  value: '92%',
  progress: 92,
  label: 'Sinh viên có việc làm',
  context: 'trong vòng 6 tháng sau khi tốt nghiệp, khóa 2025',
  stats: [
    { value: '1.250', label: 'Cựu sinh viên được khảo sát' },
    { value: '4,6/5', label: 'Mức hài lòng với chương trình' },
    { value: '+18%', label: 'So với khóa 2020' },
  ],
}

export function statsOf(props: StatSpotlightProps): SpotStat[] {
  const list = Array.isArray(props.stats) ? props.stats : []
  return list
    .filter((s): s is SpotStat => !!s && typeof s === 'object')
    .slice(0, 3)
    .map((s) => ({ value: str(s.value, 12), label: str(s.label, 32) }))
}

export function progressOf(props: StatSpotlightProps): number {
  const p = typeof props.progress === 'number' && Number.isFinite(props.progress) ? props.progress : 100
  return Math.min(1, Math.max(0, p / 100))
}

export interface SpotGeometry {
  /** Ring diameter, stroke width and top-left. */
  d: number
  sw: number
  ringX: number
  ringY: number
  /** AC2 `visual: plain`: no ring is painted (the number sits in the same square, bigger). */
  ring: boolean
  /** Value font size (fits the ring). */
  valueSize: number
  /** Right column. */
  colX: number
  colW: number
  /** Main band height (ring + column) and the stats band. */
  mainH: number
  statsY: number
  statsH: number
  /** One box per supporting stat (below: a row under the main band; side: a right column). */
  stats: Array<{ x: number; y: number; width: number; height: number }>
  /** AC8.6: the roomy tier (a box of at least `SPOT_ROOMY.minW` × `minH`): taller stat bands,
   *  so the poster can set the stats at title/lead and the label at title (see `SPOT_ROOMY`). */
  roomy: boolean
}

export const STATS_H = 150
/**
 * AC8.6 — the roomy tier. In a box at least `minW` × `minH` (a stat spotlight that fills a slide
 * region) the supporting stats get `statsH`-tall bands, and the poster sets their values at `title`
 * and labels at `lead` (else `heading` / `caption`, the compact tier) and the main label at `title`
 * when it fits in two lines (else `heading`). Below `minW` × `minH` nothing changes. AC8.5 judged the
 * compact tier thin on a 1728-wide region: a ring, one heading label and two small stats.
 */
export const SPOT_ROOMY = { minW: 1200, minH: 600, statsH: 210, labelLines: 2 } as const
const STATS_GAP = 56
/** AC2 `statsPlacement: side`: the column's width (share of the box, capped) and narrowest. */
const SIDE_SHARE = 0.28
const SIDE_MAX = 440
const SIDE_MIN = 240

export function geometry(width: number, height: number, props: StatSpotlightProps): SpotGeometry {
  const W = safe(width)
  const H = safe(height)
  const n = statsOf(props).length
  const hasStats = n > 0
  // AC8.6: the roomy tier's taller stat bands (only when the side column still fits them).
  const roomyBox = W >= SPOT_ROOMY.minW && H >= SPOT_ROOMY.minH
  const sideHAt = (bandH: number) => n * bandH + Math.max(0, n - 1) * SPOT.statGap
  const roomy = roomyBox && (props.statsPlacement !== 'side' || sideHAt(SPOT_ROOMY.statsH) <= H)
  const bandH = roomy ? SPOT_ROOMY.statsH : STATS_H
  // AC2: `side` stacks the stats in a right column when the box has the height and width for it,
  // else they stay below (the knob never makes a box overflow).
  const sideW = Math.min(SIDE_MAX, W * SIDE_SHARE)
  const sideH = sideHAt(bandH)
  const side = hasStats && props.statsPlacement === 'side' && sideW >= SIDE_MIN && sideH <= H
  const mainW = side ? W - sideW - STATS_GAP : W
  const mainH = hasStats && !side ? Math.max(0, H - bandH - STATS_GAP) : H
  const d = Math.max(0, Math.min(mainH, mainW * 0.42, 620))
  const sw = Math.max(2, d * 0.07)
  const len = Math.max(2, str(props.value, 12).length)
  const ring = props.visual !== 'plain'
  const valueSize = ring
    ? Math.max(8, Math.min(d * 0.3, (d - sw * 2) * 0.82 / (len * 0.56)))
    : Math.max(8, Math.min(d * 0.42, (d * 0.95) / (len * 0.56)))
  const colX = d + Math.min(80, W * 0.05)
  const statsY = hasStats && !side ? mainH + STATS_GAP : H
  const statsH = hasStats && !side ? bandH : 0
  let stats: SpotGeometry['stats'] = []
  if (side) {
    const top = (H - sideH) / 2
    stats = Array.from({ length: n }, (_, i) => ({ x: W - sideW, y: top + i * (bandH + SPOT.statGap), width: sideW, height: bandH }))
  } else if (hasStats) {
    const w = Math.max(1, (W - SPOT.statGap * (n - 1)) / n)
    stats = Array.from({ length: n }, (_, i) => ({ x: i * (w + SPOT.statGap), y: statsY, width: w, height: statsH }))
  }
  return {
    d,
    sw,
    ringX: 0,
    ringY: (mainH - d) / 2,
    ring,
    valueSize,
    colX,
    colW: Math.max(1, mainW - colX),
    mainH,
    statsY,
    statsH,
    stats,
    roomy,
  }
}

/** A number inside a label ("1.250", "4,6/5", "+18%") split for a count-up. */
export interface CountParts {
  prefix: string
  value: number
  suffix: string
  format(v: number): string
}

export function parseCount(text: string): CountParts | undefined {
  const m = /^(.*?)(\d[\d.,]*)(.*)$/.exec(text)
  if (!m) return undefined
  const [, prefix, raw, suffix] = m
  const grouped = /^\d{1,3}([.,]\d{3})+$/.exec(raw)
  if (grouped) {
    const sep = grouped[1][0]
    const value = Number(raw.split(sep).join(''))
    return {
      prefix,
      value,
      suffix,
      format: (v) => prefix + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep) + suffix,
    }
  }
  const dec = /[.,]/.exec(raw)?.[0]
  const decimals = dec ? raw.length - raw.indexOf(dec) - 1 : 0
  const value = Number(dec ? raw.replace(dec, '.') : raw)
  if (!Number.isFinite(value)) return undefined
  return {
    prefix,
    value,
    suffix,
    format: (v) => prefix + (decimals > 0 ? v.toFixed(decimals).replace('.', dec ?? '.') : Math.round(v).toString()) + suffix,
  }
}

/** The text metrics and gaps of the template - the poster lays out with the same numbers (LO7). */
export const SPOT = {
  valueLH: 1,
  valueTracking: -0.04,
  labelLH: 1.15,
  contextGap: 20,
  contextLH: 1.35,
  statGap: 32,
  statBorder: 6,
  statPadTop: 18,
  statPadLeft: 28,
  statValueLH: 1.05,
  statLabelGap: 8,
  statLabelLH: 1.4,
} as const
