/**
 * Schema and defaults for tls.g.arrow — one standalone arrow with an optional label.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const schema: BlockSchema = {
  label: { type: { kind: 'text', maxChars: 30 }, role: 'content', label: 'Label', guidance: 'Optional, 1-4 words, e.g. "then" or "+12%".' },
  kind: enumSlot(['straight', 'curved', 'elbow'], 'Kind'),
  direction: enumSlot(['right', 'left', 'up', 'down'], 'Direction'),
  heads: enumSlot(['end', 'both', 'none'], 'Heads'),
  weight: enumSlot(['md', 'sm', 'lg'], 'Weight'),
  tone: enumSlot(['accent', 'text', 'muted'], 'Tone'),
}

export interface ArrowProps extends Record<string, unknown> {
  label?: string
  kind?: 'straight' | 'curved' | 'elbow'
  direction?: 'right' | 'left' | 'up' | 'down'
  heads?: 'end' | 'both' | 'none'
  weight?: 'md' | 'sm' | 'lg'
  tone?: 'accent' | 'text' | 'muted'
}

export const defaults: ArrowProps = {
  label: 'Next',
  kind: 'straight',
  direction: 'right',
  heads: 'end',
  weight: 'md',
  tone: 'accent',
}
