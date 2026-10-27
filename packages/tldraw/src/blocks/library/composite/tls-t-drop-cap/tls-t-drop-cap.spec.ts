/** tls.t.drop-cap — spro creative CR13 (the shared wave suite). */
import { tlsTDropCap, buildDropCap } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsTDropCap, build: buildDropCap, category: 'text', scope: 'element',
  overflow: { text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliquaLorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliquaLorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliquaLorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliquaLorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua' },
  variants: { slot: 'variant', values: ["raised", "sunk", "boxed"] },
  long: { text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ' }, parts: ["initial", "text"],
})
