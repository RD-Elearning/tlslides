/**
 * Schema and defaults for tls.g.pros-cons — advantages and disadvantages of one option.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const PROS_CONS_MAX = 6

const listSlot = (label: string, guidance: string) =>
  ({
    type: { kind: 'list', of: { kind: 'text', maxChars: 90 }, min: 1, max: PROS_CONS_MAX },
    role: 'content',
    label,
    required: true,
    guidance,
  }) as BlockSchema[string]

export const schema: BlockSchema = {
  prosTitle: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Pros heading', help: 'Defaults to "Pros".' },
  consTitle: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Cons heading', help: 'Defaults to "Cons".' },
  pros: listSlot('Pros', 'Advantages, short phrases.'),
  cons: listSlot('Cons', 'Disadvantages, short phrases.'),
  verdict: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Verdict', guidance: 'One-sentence conclusion.' },
  style: enumSlot(['columns', 'cards'], 'Style'),
  balance: enumSlot(['equal', 'auto'], 'Balance', 'auto = the longer column gets more width.'),
  showVerdict: { type: { kind: 'boolean' }, role: 'option', label: 'Show verdict', toggles: 'verdict' },
}

export interface ProsConsProps extends Record<string, unknown> {
  prosTitle?: string
  consTitle?: string
  pros: string[]
  cons: string[]
  verdict?: string
  style?: 'columns' | 'cards'
  balance?: 'equal' | 'auto'
  showVerdict?: boolean
}

export const defaults: ProsConsProps = {
  prosTitle: 'Pros',
  consTitle: 'Cons',
  pros: ['Faster to launch', 'Lower running cost', 'Easy to scale'],
  cons: ['Less control', 'Vendor lock-in'],
  verdict: 'Worth it if speed matters more than control.',
  style: 'columns',
  balance: 'equal',
}
