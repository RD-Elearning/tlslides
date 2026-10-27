/** tls.c.callback — spro creative CR8 (the shared wave-1 suite). */
import { tlsCCallback, buildCallback } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCCallback, build: buildCallback, category: 'closing', scope: 'slide',
  overflow: { answer: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 141) },
  variants: { slot: 'variant', values: ["mirror", "answered"] },
  long: { echo: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 78), answer: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 138) }, parts: ["echo", "answer"],
})
