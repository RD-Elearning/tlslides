/**
 * Schema and defaults for tls.g.connector — the compiled form of one `SlideSpec.connectors` entry
 * (CMP3). Engine-internal: the compiler fills `fromBox` / `toBox` (the endpoints' painted boxes in
 * the connector's own coordinates); the AI never writes this block (it is AI-hidden) — it writes
 * `SlideSpec.connectors`.
 */

import type { BlockSchema, Box, ConnectorEnd } from '../../../types'

const endFields = {
  block: { type: { kind: 'text' }, role: 'content', label: 'Block id' },
  side: { type: { kind: 'enum', values: ['auto', 'top', 'right', 'bottom', 'left'] }, role: 'option', label: 'Side' },
} as const

/** The authored connector fields. The compiler adds `fromBox` / `toBox` (the endpoints' painted
 *  boxes in the connector's coordinates) and `fromRound` / `toRound`; they are not schema slots
 *  (never authored, never validated). */
export const schema: BlockSchema = {
  from: { type: { kind: 'object', fields: endFields as any }, role: 'content', label: 'From' },
  to: { type: { kind: 'object', fields: endFields as any }, role: 'content', label: 'To' },
  route: { type: { kind: 'enum', values: ['straight', 'elbow', 'curved'] }, role: 'option', label: 'Route' },
  head: { type: { kind: 'enum', values: ['end', 'both', 'none'] }, role: 'option', label: 'Arrowheads' },
  tone: { type: { kind: 'enum', values: ['line', 'accent', 'text'] }, role: 'option', label: 'Colour' },
  weight: { type: { kind: 'enum', values: ['md', 'hairline', 'bold'] }, role: 'option', label: 'Weight' },
  dash: { type: { kind: 'boolean' }, role: 'option', label: 'Dashed' },
  label: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Label' },
}

export interface ConnectorProps extends Record<string, unknown> {
  from?: ConnectorEnd
  to?: ConnectorEnd
  fromBox?: Box
  toBox?: Box
  fromRound?: boolean
  toRound?: boolean
  route?: 'straight' | 'elbow' | 'curved'
  head?: 'end' | 'both' | 'none'
  tone?: 'line' | 'accent' | 'text'
  weight?: 'hairline' | 'md' | 'bold'
  dash?: boolean
  label?: string
}

/** A gallery preview: two (unpainted) boxes, a level arrow between them. */
export const defaults: ConnectorProps = {
  from: { block: 'a' },
  to: { block: 'b' },
  fromBox: { x: 0, y: 40, width: 60, height: 80 },
  toBox: { x: 360, y: 40, width: 60, height: 80 },
  route: 'straight',
  head: 'end',
  tone: 'accent',
  weight: 'md',
}
