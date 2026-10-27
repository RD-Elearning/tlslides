/**
 * tls.g.decision-tree — spro creative CR13 (PLAN Appendix C.3): Questions branching to outcomes, each edge labelled (yes/no).
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 * Built on `tls.g.tree`: the edge label is the node's sub line; outcomes are highlighted (cards) or pills (badges).
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface DecisionTreeProps extends Record<string, unknown> {
  root: string
  nodes: Array<{ id: string; parent?: string; edge?: string; text: string; outcome?: boolean }>
  variant?: 'top-down' | 'left-right'
  outcomes?: 'cards' | 'badges'
}
const VARIANTS = ['top-down', 'left-right'] as const

export const schema: BlockSchema = {
  root: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Question', required: true },
  nodes: { type: { kind: 'list', of: { kind: 'object', fields: {
    id: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Id', required: true },
    parent: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Parent id (none = the root)' },
    edge: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Edge (yes/no)' },
    text: { type: { kind: 'text', maxChars: 48 }, role: 'content', label: 'Text', required: true },
    outcome: { type: { kind: 'boolean' }, role: 'content', label: 'Outcome' },
  } }, min: 3, max: 9 }, role: 'content', label: 'Nodes', required: true },
  variant: enumSlot([...VARIANTS], 'Direction'),
  outcomes: enumSlot(['cards', 'badges'], 'Outcomes'),
}

export const defaults: DecisionTreeProps = { root: 'Is the patient stable?', nodes: [{ id: 'a', edge: 'Yes', text: 'Routine ward' }, { id: 'b', edge: 'No', text: 'Needs oxygen?' }, { id: 'c', parent: 'b', edge: 'Yes', text: 'ICU', outcome: true }, { id: 'd', parent: 'b', edge: 'No', text: 'Observation', outcome: true }], variant: 'top-down', outcomes: 'cards' }

type TreeNode = { label: string; sub?: string; children?: TreeNode[] }

function cells(props: DecisionTreeProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'top-down')
  const nodes = objects<{ id?: unknown; parent?: unknown; edge?: unknown; text?: unknown; outcome?: unknown }>(props.nodes, 9)
  const ids = new Set(nodes.map((n) => str(n.id, 12)))
  const kids = (parent: string, depth: number): TreeNode[] =>
    depth > 2 ? [] : nodes
      .filter((n) => (str(n.parent, 12) || '') === parent || (!parent && !ids.has(str(n.parent, 12))))
      .filter((n) => str(n.text, 48))
      .map((n) => {
        const id = str(n.id, 12)
        const below = id && id !== parent ? kids(id, depth + 1) : []
        return { label: str(n.text, 30), ...(str(n.edge, 12) ? { sub: str(n.edge, 12) } : {}), ...(below.length ? { children: below } : {}) }
      })
  const root: TreeNode = { label: str(props.root, 30) || '?', children: kids('', 1) }
  const outcomes = nodes.filter((n) => n.outcome === true).map((n) => str(n.text, 30))
  const tree = { id: 'tree', type: 'tls.g.tree', props: { root, direction: v === 'left-right' ? 'LR' : 'TB', nodeStyle: props.outcomes === 'badges' ? 'pill' : 'card', highlight: outcomes } }
  return { main: [{ spec: tree as BlockSpec, grow: true }], opts: {} }
}

export function buildDecisionTree(props: DecisionTreeProps): BlockSpec {
  const c = cells(props)
  return posterBuild('decision_tree', c.main, c.opts.side)
}

export function layoutDecisionTree(props: DecisionTreeProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<DecisionTreeProps>({
  type: 'tls.g.decision-tree',
  name: "Decision tree",
  family: 'composite',
  tier: 'A',
  summary: "Questions branching to outcomes, each edge labelled (yes/no).",
  keywords: ["decision", "tree", "branch", "if", "choose", "question", "outcome"],
  category: 'hierarchy',
  scope: 'slide',
  shortDescription: "Question branching to labelled outcomes",
  related: ["tls.g.tree", "tls.g.flow", "tls.g.mindmap"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: "A choice made by answering questions in turn, each answer leading on.",
    avoid: "A plain hierarchy with no questions: tls.g.tree.",
    example: {"id": "b_decision", "type": "tls.g.decision-tree", "props": {"root": "Is the patient stable?", "nodes": [{"id": "a", "edge": "Yes", "text": "Routine ward"}, {"id": "b", "edge": "No", "text": "Needs oxygen?"}, {"id": "c", "parent": "b", "edge": "Yes", "text": "ICU", "outcome": true}, {"id": "d", "parent": "b", "edge": "No", "text": "Observation", "outcome": true}]}},
  },
  motion: {
    parts: ["tree"],
    preset: 'fade-up',
    partMotion: {
      'tree': { preset: 'fade-up', delay: 0, stagger: 60 },
    },
  },
  build: buildDecisionTree,
})

export const tlsGDecisionTree: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: DecisionTreeProps, ctx: LayoutContext): LayoutNode => layoutDecisionTree(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: DecisionTreeProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
