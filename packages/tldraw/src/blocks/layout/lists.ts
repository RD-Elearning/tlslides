/**
 * List rendering: produce RichText with markers, indent levels, and formatting.
 *
 * Supports markers: dot (•), dash (–), chevron (›), number (1. 2. 3.), and
 * icon (custom string). Indent levels (0, 1, 2…) apply proportional left padding
 * via non-breaking spaces in the marker prefix.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { RichText, TextRun } from '../types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Types                                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * List marker type.
 */
export type ListMarker = 'dot' | 'dash' | 'chevron' | 'number' | 'icon'

/**
 * Options for `renderList`.
 */
export interface ListOpts {
  /** Marker style. Defaults to `'dot'`. */
  marker?: ListMarker
  /** Indent level (0, 1, 2…). Defaults to 0. */
  indent?: number
  /** Custom icon string for `marker: 'icon'`. Defaults to `'→'`. */
  icon?: string
  /** Numbering start value for `marker: 'number'`. Defaults to 1. */
  start?: number
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Marker characters                                                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Marker characters per style. */
const MARKER_CHARS: Record<Exclude<ListMarker, 'icon' | 'number'>, string> = {
  dot: '\u2022',     // •
  dash: '\u2013',    // –
  chevron: '\u203A', // ›
}

/** Indent level → number of non-breaking spaces before the marker. */
const INDENT_NBSP = [0, 2, 4, 6, 8] // level 0 = 0 NBSPs, level 1 = 2, etc.

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Public API                                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Render a list as `RichText` with markers and indent levels.
 *
 * Each item becomes a line with the marker prefix followed by the item text.
 * Lines are separated by `\n` in the run text. Indent levels add proportional
 * non-breaking space padding before the marker.
 *
 * @param items  The list item texts.
 * @param opts   Marker style, indent level, icon, start number.
 * @returns      RichText with runs preserving formatting.
 */
export function renderList(items: string[], opts?: ListOpts): RichText {
  const marker: ListMarker = opts?.marker ?? 'dot'
  const indent = opts?.indent ?? 0
  const start = opts?.start ?? 1
  const icon = opts?.icon ?? '→'

  if (items.length === 0) {
    return { runs: [] }
  }

  const nbsp = '\u00A0'
  const padLevel = Math.min(indent, INDENT_NBSP.length - 1)
  const indentStr = nbsp.repeat(INDENT_NBSP[padLevel] ?? INDENT_NBSP[INDENT_NBSP.length - 1])

  const runs: TextRun[] = []

  for (let i = 0; i < items.length; i++) {
    const itemText = items[i]
    const markerText = formatMarker(marker, i, start, icon)

    // Run: indent padding + marker + space + item text
    const fullLine = indentStr + markerText + nbsp + itemText
    runs.push({ text: fullLine })

    // Add newline between items (not after the last one).
    if (i < items.length - 1) {
      runs.push({ text: '\n' })
    }
  }

  return { runs }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Marker formatting                                                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Format a single marker string for the given index.
 */
function formatMarker(
  marker: ListMarker,
  index: number,
  start: number,
  icon: string,
): string {
  switch (marker) {
    case 'dot':
      return MARKER_CHARS.dot
    case 'dash':
      return MARKER_CHARS.dash
    case 'chevron':
      return MARKER_CHARS.chevron
    case 'number':
      return `${start + index}.`
    case 'icon':
      return icon
  }
}
