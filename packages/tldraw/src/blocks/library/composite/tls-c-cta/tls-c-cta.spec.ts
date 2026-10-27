/** tls.c.cta — spro creative CR8 (the shared wave-1 suite). */
import { tlsCCta, buildCta } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCCta, build: buildCta, category: 'closing', scope: 'slide',
  overflow: { action: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 81) },
  variants: { slot: 'variant', values: ["button", "ticket", "hand-arrow"] },
  long: { action: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 78), detail: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 138) }, parts: ["action"],
})
