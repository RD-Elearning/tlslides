/** tls.c.storyboard — spro creative CR13 (the shared wave suite). */
import { tlsCStoryboard, buildStoryboard } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCStoryboard, build: buildStoryboard, category: 'people', scope: 'slide',
  overflow: { panels: [1, 2, 3, 4, 5].map((n) => ({ caption: String(n) })) },
  variants: { slot: 'variant', values: ["strip", "grid"] },
  long: { panels: [{ visual: 'user', caption: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed', bubble: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod ' }, { caption: 'Lorem ipsum dolor sit amet consectetur a' }, { caption: 'Bed' }] }, parts: ["panel[0]", "panel[1]"],
})
