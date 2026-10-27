/** tls.c.poster-cover — spro creative CR8 (the shared wave-1 suite). */
import { tlsCPosterCover, buildPosterCover } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCPosterCover, build: buildPosterCover, category: 'cover', scope: 'slide',
  overflow: { title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 81) },
  variants: { slot: 'variant', values: ["stacked", "offset", "overlap-motif", "outline-type"] },
  long: { title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 78), subtitle: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 118) }, parts: ["title"],
})
