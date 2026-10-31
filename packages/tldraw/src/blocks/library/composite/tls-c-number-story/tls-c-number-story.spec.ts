/** tls.c.number-story — spro creative CR13 (the shared wave suite). */
import { tlsCNumberStory, buildNumberStory } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCNumberStory, build: buildNumberStory, category: 'metric', scope: 'slide',
  overflow: { steps: [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: 'x' })) },
  variants: { slot: 'variant', values: ["arrow-row", "staircase", "zoom"] },
  long: { steps: [{ value: '1,200,000', label: 'Lorem ipsum dolor sit amet consectetur adipisc', note: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor i' }, { value: '4 h', label: 'Lorem ipsum dolor sit amet con' }, { value: '1 in 5', label: 'leave' }] }, parts: ["step[0]", "step[1]"],
})
