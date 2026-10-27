/** tls.g.puzzle — spro creative CR13 (the shared wave suite). */
import { tlsGPuzzle, buildPuzzle } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsGPuzzle, build: buildPuzzle, category: 'relationship', scope: 'slide',
  overflow: { whole: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed d' },
  variants: { slot: 'variant', values: ["row", "grid", "ring"] },
  long: { whole: 'Lorem ipsum dolor sit amet con', pieces: [{ label: 'Lorem ipsum dolor sit ', text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed' }, { label: 'Features', text: 'Lorem ipsum dolor sit amet consectetur a' }, { label: 'Eval' }] }, parts: ["whole", "piece[0]"],
})
