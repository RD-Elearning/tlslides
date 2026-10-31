/** tls.g.bridge — spro creative CR13 (the shared wave suite). */
import { tlsGBridge, buildBridge } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsGBridge, build: buildBridge, category: 'process', scope: 'slide',
  overflow: { planks: ['a', 'b', 'c', 'd', 'e', 'f'] },
  variants: { slot: 'variant', values: ["arch", "flat"] },
  long: { from: { title: 'Lorem ipsum dolor sit ', text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor i' }, to: { title: 'Target', text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed d' }, planks: ['Lorem ipsum dolor sit amet con', 'Lorem ipsum dolor si', 'Night shift'] }, parts: ["bridge"],
})
