/**
 * tls.g.graph — data-structure diagrams laid out by the engine: binary trees (children keep their
 * side) and linked lists, with a traversal's visit order (spro compose PLAN.md B3).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsGGraph: BlockDefinition = {
  type: 'tls.g.graph',
  name: 'Data structure',
  family: 'diagram',
  tier: 'A',
  summary: 'A binary tree (left/right children kept) or a linked list, laid out by the engine, with a numbered visit order.',
  keywords: ['binary tree', 'bst', 'linked list', 'traversal', 'data structure', 'nodes', 'graph'],
  category: 'hierarchy',
  scope: 'group',
  shortDescription: 'Binary tree or linked list of nodes, with a numbered traversal order',
  related: ['tls.g.tree', 'tls.g.flow'],
  describe: {
    when: 'Data structures in a lecture: a binary (search) tree, a traversal order, a linked list, an insertion.',
    avoid: 'Org charts and taxonomies with word labels (use tls.g.tree); processes with decisions (use tls.g.flow).',
    example: {
      id: 'b_graph',
      type: 'tls.g.graph',
      props: {
        kind: 'binary-tree',
        nodes: [
          { id: 'n1', label: 'A' },
          { id: 'n2', label: 'B', parent: 'n1', side: 'left' },
          { id: 'n3', label: 'C', parent: 'n1', side: 'right' },
          { id: 'n4', label: 'D', parent: 'n2', side: 'right' },
        ],
        order: ['n1', 'n2', 'n4', 'n3'],
        orderLabel: 'Pre-order (NLR)',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 640], min: [600, 400] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
