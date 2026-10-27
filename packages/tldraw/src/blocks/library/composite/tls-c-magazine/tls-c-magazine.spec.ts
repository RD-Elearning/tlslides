/** tls.c.magazine — spro creative CR13 (the shared wave suite). */
import { tlsCMagazine, buildMagazine } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCMagazine, build: buildMagazine, category: 'text', scope: 'slide',
  overflow: { body: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliquaLorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliquaLorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliquaLorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliquaLorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliquaLorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua' },
  variants: { slot: 'variant', values: ["two-column", "figure-left", "figure-right"] },
  long: { kicker: 'Lorem ipsum dolor sit amet consectetur', body: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ', pull: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et' }, parts: ["body", "pull"],
})
