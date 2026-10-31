/** tls.c.split-cover — spro creative CR8 (the shared wave-1 suite). */
import { tlsCSplitCover, buildSplitCover } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCSplitCover, build: buildSplitCover, category: 'cover', scope: 'slide',
  overflow: { title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 81) },
  variants: { slot: 'side', values: ["left", "right", "diagonal"] },
  long: { title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 78), subtitle: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 118) }, parts: ["title", "field"],
})
