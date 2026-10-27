/** tls.g.annotated — spro creative CR8 (the shared wave-1 suite). */
import { tlsGAnnotated, buildAnnotated } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsGAnnotated, build: buildAnnotated, category: 'media', scope: 'slide',
  overflow: { callouts: Array.from({ length: 7 }, (_, i) => ({ label: `P${i}` })) },
  variants: { slot: 'variant', values: ["numbers", "labels"] },
  long: { callouts: Array.from({ length: 6 }, (_, i) => ({ label: `Part ${i}`, note: 'What this part does, in one line' })) }, parts: ["target", "legend"],
})
