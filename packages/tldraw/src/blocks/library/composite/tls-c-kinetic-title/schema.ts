/**
 * tls.c.kinetic-title — schema, defaults and the shared text rules (template + poster).
 */

import type { BlockSchema, ResolvedTokens } from '../../../types'
import { str } from '../_showcase'

export interface KineticTitleProps extends Record<string, unknown> {
  kicker?: string
  title: string
  highlight?: string
  subtitle?: string
  align?: 'start' | 'center'
  decoration?: 'orbs' | 'none'
  /** AC2: `plain` (default, on the slide) or `accent` (the title on an accent panel, every text,
   *  the rule and the orbs in the on-accent colour). */
  tone?: 'plain' | 'accent'
}

export const schema: BlockSchema = {
  kicker: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Kicker',
    guidance: 'Small label above the title: course, event or section, e.g. "BÀI GIẢNG 1".',
  },
  title: {
    type: { kind: 'text', maxChars: 80 },
    role: 'content',
    label: 'Title',
    required: true,
    guidance: 'The talk or section title, 2-8 words, no full stop.',
  },
  highlight: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Highlight',
    guidance: 'Words of the title to colour with the accent; must appear in the title.',
  },
  subtitle: {
    type: { kind: 'text', maxChars: 120 },
    role: 'content',
    label: 'Subtitle',
  },
  align: { type: { kind: 'enum', values: ['start', 'center'] }, role: 'option', label: 'Align' },
  decoration: { type: { kind: 'enum', values: ['orbs', 'none'] }, role: 'option', label: 'Decoration' },
  tone: { type: { kind: 'enum', values: ['plain', 'accent'] }, role: 'option', label: 'Tone', guidance: '`accent`: on an accent panel.' },
}

export const defaults: KineticTitleProps = {
  kicker: 'BÀI GIẢNG MỞ ĐẦU',
  title: 'Học máy cho người mới bắt đầu',
  highlight: 'Học máy',
  subtitle: 'Khoa Công nghệ Thông tin · Học kỳ I',
  align: 'center',
  decoration: 'orbs',
}

/** Title size by length, so a long title steps down instead of wrapping to four lines. */
export function titleSize(title: string, tokens: ResolvedTokens | undefined): number {
  const display = tokens?.type?.display?.size ?? 152
  const n = title.length
  if (n <= 26) return display
  if (n <= 48) return Math.round(display * 0.78)
  return Math.round(display * 0.62)
}

/** Split the title into words and flag those inside the first occurrence of `highlight`. */
export function titleWords(props: KineticTitleProps): Array<{ text: string; accent: boolean }> {
  const words = str(props.title, 80).split(/\s+/).filter(Boolean)
  const hi = str(props.highlight, 40).split(/\s+/).filter(Boolean)
  const flags = words.map(() => false)
  if (hi.length > 0) {
    for (let i = 0; i + hi.length <= words.length; i++) {
      if (hi.every((w, j) => words[i + j] === w)) {
        for (let j = 0; j < hi.length; j++) flags[i + j] = true
        break
      }
    }
  }
  return words.map((text, i) => ({ text, accent: flags[i] }))
}

/** AC2 `tone: accent`: the panel's inner padding (each side of the text column). */
export const PANEL_PAD = 96

/** The orbs a block paints: on a start-aligned accent panel the bottom-left disc would sit under
 *  the text, so it is left out (template and poster). */
export function orbsFor(props: KineticTitleProps, width: number, height: number): ReturnType<typeof orbs> {
  const all = orbs(width, height)
  return props.tone === 'accent' && props.align === 'start' ? all.filter((o) => o.kind !== 'disc') : all
}

/** Decorative orbs, in fractions of the box (kept fully inside it). */
export function orbs(width: number, height: number): Array<{ cx: number; cy: number; r: number; kind: 'ring' | 'disc' | 'dot' }> {
  const s = Math.max(0, Math.min(width, height))
  const ring = s * 0.26
  const disc = s * 0.17
  const dot = s * 0.045
  return [
    { cx: width - ring - 8, cy: ring + 8, r: ring, kind: 'ring' },
    { cx: disc + 8, cy: height - disc - 8, r: disc, kind: 'disc' },
    { cx: width * 0.86, cy: height - dot * 3, r: dot, kind: 'dot' },
  ]
}
