/** tls.c.homework — spro creative CR8 (the shared wave-1 suite). */
import { tlsCHomework, buildHomework } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCHomework, build: buildHomework, category: 'learning', scope: 'slide',
  overflow: { task: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 161) },
  variants: { slot: 'variant', values: ["card", "notebook"] },
  long: { task: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 158), criteria: ['One clear question asked', 'The data that answers it', 'One risk of a wrong answer', 'A first look at it'] }, parts: [],
})
