/**
 * Schema and defaults for tls.t.bullets — bullet list.
 *
 * Consumes the existing list marker system from blocks/layout/lists.ts
 * (dot/dash/chevron/number markers, indent levels). Does NOT write a
 * second list layout — uses renderList() from the shared module.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  items: {
    // Each item is `{ text, level? }` (see `BulletItem` below), not a bare string — the JSON
    // Schema R7 generates must describe the shape the layout actually consumes.
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          text: { type: { kind: 'text' }, required: true, role: 'content', label: 'Item text' },
          level: { type: { kind: 'number' }, role: 'option', label: 'Indent level' },
        },
      },
      min: 1,
      max: 40,
    },
    role: 'content',
    label: 'List items',
    help: 'Bullet list items. Each item is a short phrase or sentence.',
    required: true,
    guidance: '2–8 items, each 2–8 words. Start each with a verb or noun, not a full sentence.',
  },
  marker: {
    type: { kind: 'enum', values: ['dot', 'dash', 'chevron', 'number', 'icon'] },
    role: 'option',
    label: 'Marker',
    help: 'Bullet style.',
  },
  indentLevels: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Indent levels',
    help: 'Enable per-item indent levels for nested lists.',
  },
  spacing: {
    type: { kind: 'enum', values: ['xs', 'sm', 'md', 'lg'] },
    role: 'option',
    label: 'Spacing',
    help: 'Vertical spacing between items.',
  },
  color: {
    type: { kind: 'color' },
    role: 'option',
    label: 'Color',
    help: 'Override the default text color role.',
  },
}

export interface BulletItem {
  text: string
  level?: number
}

export interface BulletsProps extends Record<string, unknown> {
  items: BulletItem[]
  marker?: string
  indentLevels?: boolean
  spacing?: string
  color?: string
}

export const defaults: BulletsProps = {
  items: [
    { text: 'Design tokens ensure consistency at scale' },
    { text: 'Pure layout functions enable headless rendering' },
    { text: 'Parity tests prove DOM and SVG agreement' },
    { text: 'Automated linting catches design regressions' },
  ],
  marker: 'dot',
  indentLevels: false,
  spacing: 'sm',
}
