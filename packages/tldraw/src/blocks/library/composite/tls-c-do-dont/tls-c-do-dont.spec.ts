/** tls.c.do-dont — spro creative CR13 (the shared wave suite). */
import { tlsCDoDont, buildDoDont } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCDoDont, build: buildDoDont, category: 'comparison', scope: 'slide',
  overflow: { do: ['a', 'b', 'c', 'd', 'e', 'f'] },
  variants: { slot: 'variant', values: ["columns", "cards", "stamped"] },
  long: { do: ['Lorem ipsum dolor sit amet consectetur adipiscing elit sed', 'Lorem ipsum dolor sit amet consectetur a', 'Ask'], dont: ['Lorem ipsum dolor sit amet consectetur adipiscing ', 'Guess'] }, parts: ["side[0]", "side[1]"],
})
