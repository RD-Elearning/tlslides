/**
 * Schema and defaults for tls.g.flow — a flowchart of nodes and labelled edges.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const FLOW_MAX_NODES = 12
export const FLOW_MAX_EDGES = 16

export const schema: BlockSchema = {
  nodes: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          id: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Id', guidance: 'Short unique id such as "a" or "check"; edges refer to it.' },
          label: { type: { kind: 'text', maxChars: 40 }, required: true, role: 'content', label: 'Label' },
          kind: { type: { kind: 'enum', values: ['step', 'decision', 'start', 'end'] }, role: 'content', label: 'Kind', help: 'decision = diamond, start/end = pill.' },
        },
      },
      min: 2,
      max: FLOW_MAX_NODES,
    },
    role: 'content',
    label: 'Nodes',
    required: true,
  },
  edges: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          from: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'From', help: 'Id of the source node.' },
          to: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'To', help: 'Id of the target node.' },
          label: { type: { kind: 'text', maxChars: 20 }, role: 'content', label: 'Label', guidance: 'Yes / No on decision branches.' },
        },
      },
      min: 1,
      max: FLOW_MAX_EDGES,
    },
    role: 'content',
    label: 'Edges',
    required: true,
    guidance: 'Every from/to must be a node id.',
  },
  direction: enumSlot(['LR', 'TB'], 'Direction', 'LR = left to right, TB = top to bottom.'),
  routing: enumSlot(['elbow', 'straight'], 'Routing'),
}

export interface FlowNode {
  id: string
  label: string
  kind?: 'step' | 'decision' | 'start' | 'end'
}

export interface FlowEdge {
  from: string
  to: string
  label?: string
}

export interface FlowProps extends Record<string, unknown> {
  nodes: FlowNode[]
  edges: FlowEdge[]
  direction?: 'LR' | 'TB'
  routing?: 'elbow' | 'straight'
}

export const defaults: FlowProps = {
  nodes: [
    { id: 'start', label: 'Request', kind: 'start' },
    { id: 'check', label: 'Valid?', kind: 'decision' },
    { id: 'do', label: 'Process', kind: 'step' },
    { id: 'fix', label: 'Ask to fix', kind: 'step' },
    { id: 'end', label: 'Done', kind: 'end' },
  ],
  edges: [
    { from: 'start', to: 'check' },
    { from: 'check', to: 'do', label: 'Yes' },
    { from: 'check', to: 'fix', label: 'No' },
    { from: 'do', to: 'end' },
    { from: 'fix', to: 'start' },
  ],
  direction: 'LR',
  routing: 'elbow',
}
