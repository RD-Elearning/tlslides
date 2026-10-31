/** tls.t.pull-quote — spro creative CR13 (the shared wave suite). */
import { tlsTPullQuote, buildPullQuote } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsTPullQuote, build: buildPullQuote, category: 'emphasis', scope: 'element',
  overflow: { text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliquaLorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua' },
  variants: { slot: 'variant', values: ["rules", "marks", "side"] },
  long: { text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua', source: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed' }, parts: ["quote"],
})
