/** tls.c.takeaway-poster — spro creative CR8 (the shared wave-1 suite). */
import { tlsCTakeawayPoster, buildTakeawayPoster } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCTakeawayPoster, build: buildTakeawayPoster, category: 'closing', scope: 'slide',
  overflow: { items: ['a', 'b', 'c', 'd'] },
  variants: { slot: 'variant', values: ["row", "stack", "numerals-off"] },
  long: { items: ['Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 88), 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 80), 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 70)] }, parts: ["item"],
})
