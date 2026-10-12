/**
 * Schema and defaults for tls.g.graph — a data-structure diagram laid out by the engine: a binary
 * tree whose children keep their side (a missing left child shows), or a linked list; optionally
 * the visit order of a traversal numbered on the nodes and written out under the diagram.
 */

import type { BlockSchema, SlotSpec } from '../../../types'

export const GRAPH_MAX_NODES = 31
export const GRAPH_MAX_LEVELS = 5

const nodeFields: Record<string, SlotSpec> = {
  id: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Id', required: true },
  label: { type: { kind: 'text', maxChars: 8 }, role: 'content', label: 'Label', required: true },
  parent: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Parent id' },
  side: { type: { kind: 'enum', values: ['left', 'right'] }, role: 'content', label: 'Side' },
}

export const schema: BlockSchema = {
  kind: {
    type: { kind: 'enum', values: ['binary-tree', 'list'] },
    role: 'option',
    label: 'Kind',
    help: 'binary-tree: nodes with parent + side; list: nodes in order, joined by arrows.',
  },
  nodes: {
    type: { kind: 'list', of: { kind: 'object', fields: nodeFields }, min: 1, max: GRAPH_MAX_NODES },
    role: 'content',
    label: 'Nodes',
    required: true,
    guidance:
      'Short labels (a key or value, ≤ 8 chars). binary-tree: every node but the root has `parent` (an id) and `side` (left|right), at most 5 levels; list: in order, no parent.',
  },
  order: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 12 }, max: GRAPH_MAX_NODES },
    role: 'content',
    label: 'Visit order',
    guidance: 'Optional: node ids in the order a traversal visits them; numbered on the nodes and written out below.',
  },
  orderLabel: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Order label',
    guidance: 'Optional: names the order, e.g. "Pre-order (NLR)".',
  },
  highlight: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 12 }, max: GRAPH_MAX_NODES },
    role: 'content',
    label: 'Highlighted nodes',
    guidance: 'Optional: ids drawn in the accent (a search path, an inserted node).',
  },
  showNull: { type: { kind: 'boolean' }, role: 'option', label: 'Show NULL', help: 'list: a NULL after the last node.' },
}

export interface GraphNode {
  id: string
  label: string
  parent?: string
  side?: 'left' | 'right'
}

export interface GraphProps extends Record<string, unknown> {
  kind?: 'binary-tree' | 'list'
  nodes: GraphNode[]
  order?: string[]
  orderLabel?: string
  highlight?: string[]
  showNull?: boolean
}

export const defaults: GraphProps = {
  kind: 'binary-tree',
  nodes: [
    { id: 'a', label: '50' },
    { id: 'b', label: '30', parent: 'a', side: 'left' },
    { id: 'c', label: '70', parent: 'a', side: 'right' },
    { id: 'd', label: '20', parent: 'b', side: 'left' },
    { id: 'e', label: '40', parent: 'b', side: 'right' },
    { id: 'f', label: '80', parent: 'c', side: 'right' },
  ],
  order: ['d', 'b', 'e', 'a', 'c', 'f'],
  orderLabel: 'In-order (LNR)',
  showNull: true,
}
