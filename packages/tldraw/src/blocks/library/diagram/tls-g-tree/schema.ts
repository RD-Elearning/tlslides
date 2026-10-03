/**
 * Schema and defaults for tls.g.tree — a hierarchy of boxes linked from one root.
 *
 * The slot type system has no recursion, so the tree is declared as three explicit levels
 * (root, children, grandchildren). The layout reads one level deeper if a payload has it (the
 * tidy-tree cap is 4 levels incl. the root) and stops at 15 nodes / 6 children per node.
 */

import type { BlockSchema, SlotSpec } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const TREE_MAX_NODES = 15
export const TREE_MAX_CHILDREN = 6

const labelField: SlotSpec = { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Label' }
const subField: SlotSpec = { type: { kind: 'text', maxChars: 30 }, role: 'content', label: 'Sub-label', help: 'Role, count or one-word note.' }

const level3: SlotSpec = {
  type: { kind: 'list', of: { kind: 'object', fields: { label: labelField, sub: subField } }, max: TREE_MAX_CHILDREN },
  role: 'content',
  label: 'Grandchildren',
}

const level2: SlotSpec = {
  type: {
    kind: 'list',
    of: { kind: 'object', fields: { label: labelField, sub: subField, children: level3 } },
    max: TREE_MAX_CHILDREN,
  },
  role: 'content',
  label: 'Children',
}

export const schema: BlockSchema = {
  root: {
    type: { kind: 'object', fields: { label: labelField, sub: subField, children: level2 } },
    role: 'content',
    label: 'Root',
    required: true,
    guidance:
      'Nested {label, sub?, children?: [{label, sub?, children?: [{label, sub?}]}]}. Max 3 levels, 15 nodes in all, 6 children per node. Labels 1-3 words.',
  },
  direction: enumSlot(['TB', 'LR'], 'Direction', 'TB = top-down, LR = left to right (fits more leaves).'),
  nodeStyle: enumSlot(['card', 'pill', 'avatar'], 'Node style', 'avatar adds a round monogram (initials) to each card.'),
  compact: { type: { kind: 'boolean' }, role: 'option', label: 'Compact', help: 'Labels only, tighter boxes: fits more nodes.' },
}

export interface TreeNodeProps {
  label: string
  sub?: string
  children?: TreeNodeProps[]
}

export interface TreeProps extends Record<string, unknown> {
  root: TreeNodeProps
  direction?: 'TB' | 'LR'
  nodeStyle?: 'card' | 'pill' | 'avatar'
  compact?: boolean
}

export const defaults: TreeProps = {
  root: {
    label: 'CEO',
    sub: 'Strategy',
    children: [
      { label: 'Product', sub: 'VP', children: [{ label: 'Design' }, { label: 'Research' }] },
      { label: 'Engineering', sub: 'VP', children: [{ label: 'Platform' }, { label: 'Apps' }] },
      { label: 'Growth', sub: 'VP', children: [{ label: 'Marketing' }, { label: 'Sales' }] },
    ],
  },
  direction: 'TB',
  nodeStyle: 'card',
  compact: false,
}
