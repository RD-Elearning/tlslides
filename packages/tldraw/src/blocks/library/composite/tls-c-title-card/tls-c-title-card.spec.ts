/** tls.c.title-card — spro creative CR13 (the shared wave suite). */
import { tlsCTitleCard, buildTitleCard } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCTitleCard, build: buildTitleCard, category: 'cover', scope: 'slide',
  overflow: { title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut' },
  variants: { slot: 'variant', values: ["double-rule", "corner-ornament", "arch"] },
  long: { kicker: 'Lorem ipsum dolor sit amet consectetur', title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed', line: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore ' }, parts: ["title"],
})
