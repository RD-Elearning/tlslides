/** tls.c.full-bleed-type — spro creative CR13 (the shared wave suite). */
import { tlsCFullBleedType, buildFullBleedType } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCFullBleedType, build: buildFullBleedType, category: 'cover', scope: 'slide',
  overflow: { word: 'Lorem ipsum dolor sit amet consectetur a' },
  variants: { slot: 'variant', values: ["solid", "outline", "image-fill"] },
  long: { word: 'Lorem ipsum dolo', line: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore ', kicker: 'Lorem ipsum dolor sit amet consectetur' }, parts: ["word"],
})
