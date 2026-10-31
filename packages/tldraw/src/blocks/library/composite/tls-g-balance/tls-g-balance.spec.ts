/** tls.g.balance — spro creative CR13 (the shared wave suite). */
import { tlsGBalance, buildBalance } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsGBalance, build: buildBalance, category: 'comparison', scope: 'slide',
  overflow: { left: { title: 'Lorem ipsum dolor sit amet consectetur a', items: [] } },
  variants: { slot: 'variant', values: ["scale", "seesaw"] },
  long: { left: { title: 'Lorem ipsum dolor sit ', items: ['Lorem ipsum dolor sit amet consectetur', 'Lorem ipsum dolor sit amet con'] }, right: { title: 'Buy', items: ['Lorem ipsum dolor sit amet consectet'] }, tilt: 'left' }, parts: ["beam", "pan[0]", "pan[1]"],
})
