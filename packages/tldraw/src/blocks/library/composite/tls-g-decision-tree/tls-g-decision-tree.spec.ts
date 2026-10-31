/** tls.g.decision-tree — spro creative CR13 (the shared wave suite). */
import { tlsGDecisionTree, buildDecisionTree } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsGDecisionTree, build: buildDecisionTree, category: 'hierarchy', scope: 'slide',
  overflow: { root: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor inc' },
  variants: { slot: 'variant', values: ["top-down", "left-right"] },
  long: { root: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed', nodes: [{ id: 'a', edge: 'Yes', text: 'Lorem ipsum dolor sit amet consectetur adipisc' }, { id: 'b', edge: 'No', text: 'Lorem ipsum dolor sit amet consectetur a' }, { id: 'c', parent: 'b', edge: 'Yes', text: 'ICU', outcome: true }, { id: 'd', parent: 'b', edge: 'No', text: 'Observation', outcome: true }] }, parts: ["tree"],
})
