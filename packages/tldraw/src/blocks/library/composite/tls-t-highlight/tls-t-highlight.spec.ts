/** tls.t.highlight — spro creative CR8 (the shared wave-1 suite). */
import { tlsTHighlight, buildHighlight } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsTHighlight, build: buildHighlight, category: 'emphasis', scope: 'slide',
  overflow: { text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 141) },
  variants: { slot: 'variant', values: ["marker", "underline", "circle"] },
  long: { text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 138), notes: ['A short margin note here', 'Another note', 'A third'] }, parts: ["text"],
})
