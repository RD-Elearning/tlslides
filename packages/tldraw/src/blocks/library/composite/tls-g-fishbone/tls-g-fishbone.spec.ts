/** tls.g.fishbone — spro creative CR13 (the shared wave suite). */
import { tlsGFishbone, buildFishbone } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsGFishbone, build: buildFishbone, category: 'relationship', scope: 'slide',
  overflow: { effect: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed d' },
  variants: { slot: 'variant', values: ["classic", "minimal"] },
  long: { effect: 'Lorem ipsum dolor sit amet consectetur', branches: [{ label: 'Lorem ipsum dolor sit ', causes: ['Lorem ipsum dolor sit amet consectetur', 'Lorem ipsum dolor sit amet con'] }, { label: 'Process', causes: ['Lorem ipsum dolor sit amet consectet'] }, { label: 'Beds', causes: ['Late', 'Early'] }, { label: 'Tools', causes: ['Lorem ipsum dolor si'] }] }, parts: ["effect", "branch[0]"],
})
