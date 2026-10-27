/** tls.c.chapter-divider — spro creative CR8 (the shared wave-1 suite). */
import { tlsCChapterDivider, buildChapterDivider } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCChapterDivider, build: buildChapterDivider, category: 'divider', scope: 'slide',
  overflow: { title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 61) },
  variants: { slot: 'variant', values: ["numeral", "question", "progress"] },
  long: { title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 58), question: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 98) }, parts: ["title"],
})
