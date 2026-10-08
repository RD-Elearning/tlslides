/**
 * Schema and defaults for tls.t.definition — a term with its definition.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  term: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Term',
    required: true,
    guidance: 'The word or phrase being defined, 1–3 words.',
  },
  pronunciation: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Pronunciation',
    guidance: 'Optional, e.g. "/hyoo-RIS-tik/".',
  },
  partOfSpeech: {
    type: { kind: 'text', maxChars: 20 },
    role: 'content',
    label: 'Part of speech',
    guidance: 'Optional, e.g. "noun".',
  },
  definition: {
    type: { kind: 'richText', maxChars: 260 },
    role: 'content',
    label: 'Definition',
    required: true,
    guidance: 'One or two sentences. **Bold** works.',
  },
  example: {
    type: { kind: 'text', maxChars: 160 },
    role: 'content',
    label: 'Example',
    guidance: 'Optional usage example.',
  },
  layout: {
    type: { kind: 'enum', values: ['stacked', 'inline'] },
    role: 'option',
    label: 'Layout',
    help: 'inline puts the term beside the definition.',
  },
  termTone: {
    type: { kind: 'enum', values: ['accent', 'text'] },
    role: 'option',
    label: 'Term colour',
  },
  showPronunciation: { type: { kind: 'boolean' }, role: 'option', label: 'Show pronunciation', toggles: 'pronunciation' },
  showExample: { type: { kind: 'boolean' }, role: 'option', label: 'Show example', toggles: 'example' },
}

export interface DefinitionProps extends Record<string, unknown> {
  term: string
  pronunciation?: string
  partOfSpeech?: string
  definition: string
  example?: string
  layout?: 'stacked' | 'inline'
  termTone?: 'accent' | 'text'
  showPronunciation?: boolean
  showExample?: boolean
}

export const defaults: DefinitionProps = {
  term: 'Heuristic',
  pronunciation: '/hyoo-RIS-tik/',
  partOfSpeech: 'noun',
  definition: 'A **practical rule of thumb** that finds a good-enough answer quickly, without guaranteeing the best one.',
  example: 'Picking the shortest checkout line is a heuristic.',
  layout: 'stacked',
  termTone: 'accent',
  showPronunciation: true,
  showExample: true,
}
