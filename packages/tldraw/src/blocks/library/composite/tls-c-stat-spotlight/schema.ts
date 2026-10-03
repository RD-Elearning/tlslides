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
  /** Value font size (fits the ring). */
  valueSize: number
  /** Right column. */
  colX: number
  colW: number
  /** Main band height (ring + column) and the stats band. */
  mainH: number
  statsY: number
  statsH: number
}

export const STATS_H = 150
const STATS_GAP = 56

export function geometry(width: number, height: number, props: StatSpotlightProps): SpotGeometry {
  const W = safe(width)
  const H = safe(height)
  const hasStats = statsOf(props).length > 0
  const mainH = hasStats ? Math.max(0, H - STATS_H - STATS_GAP) : H
  const d = Math.max(0, Math.min(mainH, W * 0.42, 620))
  const sw = Math.max(2, d * 0.07)
  const len = Math.max(2, str(props.value, 12).length)
  const valueSize = Math.max(8, Math.min(d * 0.3, (d - sw * 2) * 0.82 / (len * 0.56)))
  const colX = d + Math.min(80, W * 0.05)
  return {
    d,
    sw,
    ringX: 0,
    ringY: (mainH - d) / 2,
    valueSize,
    colX,
    colW: Math.max(1, W - colX),
    mainH,
    statsY: hasStats ? mainH + STATS_GAP : H,
    statsH: hasStats ? STATS_H : 0,
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
