/** tls.c.section-brief — spro sprint 2026-11b S07-c (the shared wave-1 suite + a teaching check). */
import { tlsCSectionBrief, buildSectionBrief } from './index'
import { wave1Suite } from '../wave1-test'

const L = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip'

wave1Suite({
  def: tlsCSectionBrief, build: buildSectionBrief, category: 'divider', scope: 'slide',
  overflow: { title: L.slice(0, 71) },
  variants: { slot: 'variant', values: ['left-rail', 'split', 'numbered'] },
  long: { title: L.slice(0, 68), question: L.slice(0, 138), points: [L.slice(0, 88), L.slice(1, 89), L.slice(2, 90), L.slice(3, 91)] },
  parts: ['title'],
})
