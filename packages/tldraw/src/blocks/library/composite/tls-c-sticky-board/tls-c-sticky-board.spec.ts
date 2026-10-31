/** tls.c.sticky-board — spro creative CR8 (the shared wave-1 suite). */
import { tlsCStickyBoard, buildStickyBoard } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCStickyBoard, build: buildStickyBoard, category: 'list', scope: 'slide',
  overflow: { notes: Array.from({ length: 9 }, (_, i) => ({ text: `Note ${i}` })) },
  variants: { slot: 'variant', values: ["grid", "scattered", "columns"] },
  long: { notes: Array.from({ length: 8 }, (_, i) => ({ text: `Note ${i}: ` + 'a short voice from the ward' })) }, parts: ["note"],
})
