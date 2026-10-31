/**
 * Schema, defaults and motion of the dot family (`tls.d.lollipop`, `tls.d.dot-plot`; spro creative CR13).
 */
import type { BlockSchema, MotionRecipe } from '../../../types'
import { boolSlot, enumSlot, formatSlot } from './schema-kit'
import { DOT_MAX_ITEMS, type DotProps } from './dot-family'
import { ROW_STAGGER } from './motion'

export const dotSchema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 40 }, required: true, role: 'content', label: 'Name' },
          value: { type: { kind: 'number' }, required: true, role: 'content', label: 'Value' },
        },
      },
      min: 3,
      max: DOT_MAX_ITEMS,
    },
    role: 'content',
    label: 'Entries',
    required: true,
    guidance: 'One value each, from the source; the rows keep their order unless sorted.',
  },
  highlight: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Highlight', guidance: 'The name of the one row that is the point (default: the largest).' },
  labels: enumSlot(['end', 'none'], 'Value labels'),
  sorted: boolSlot('Sorted by value'),
  format: formatSlot(),
}

export const dotDefaults: DotProps = {
  items: [
    { label: 'Hà Nội', value: 82 },
    { label: 'Đà Nẵng', value: 64 },
    { label: 'Huế', value: 51 },
    { label: 'Cần Thơ', value: 47 },
    { label: 'Hải Phòng', value: 39 },
  ],
  highlight: '',
  labels: 'end',
  sorted: true,
}

export const dotMotion = (mark: 'dot' | 'stem'): MotionRecipe => ({
  parts: ['row[*].label', mark === 'stem' ? 'row[*].stem' : 'row[*].track', 'row[*].dot', 'row[*].value'],
  preset: 'stagger-lines',
  partMotion: {
    'row[*].label': { preset: 'sweep-nodes', delay: 0, stagger: ROW_STAGGER },
    [mark === 'stem' ? 'row[*].stem' : 'row[*].track']: { preset: mark === 'stem' ? 'grow-bars-x' : 'field-in', delay: 40, stagger: ROW_STAGGER },
    'row[*].dot': { preset: 'pop-points', delay: 100, stagger: ROW_STAGGER },
    'row[*].value': { preset: 'count-up', delay: 120, stagger: ROW_STAGGER },
  },
})
