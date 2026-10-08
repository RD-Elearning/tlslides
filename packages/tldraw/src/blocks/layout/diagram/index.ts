/**
 * Diagram helpers (P0.8): connectors, radial placement, layered DAG, tidy tree, shape paths.
 * Pure functions only; used by the P3 diagram blocks.
 */
export { connector, connectorRoute, anchor, autoSides } from './connector'
export type { ConnectorOpts, Side } from './connector'
export { radial, ringBoxes } from './radial'
export { layeredDag, MAX_DAG_NODES, MAX_DAG_EDGES } from './layered-dag'
export type { DagNode, DagEdge, DagResult } from './layered-dag'
export { tidyTree, MAX_TREE_LEVELS } from './tidy-tree'
export type { TreeNode, TidyTreeResult } from './tidy-tree'
export { chevronPath, trapezoidPath } from './shape-paths'
