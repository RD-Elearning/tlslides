/** tls.c.hook-cover — spro creative CR8 (the shared wave-1 suite). */
import { tlsCHookCover, buildHookCover } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCHookCover, build: buildHookCover, category: 'cover', scope: 'slide',
  overflow: { hook: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 91) },
  variants: { slot: 'variant', values: ["question", "number"] },
  long: { hook: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 88), title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 78) }, parts: ["hook", "title"],
})
