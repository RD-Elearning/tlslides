/** tls.c.question-wall — spro creative CR8 (the shared wave-1 suite). */
import { tlsCQuestionWall, buildQuestionWall } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCQuestionWall, build: buildQuestionWall, category: 'closing', scope: 'slide',
  overflow: { questions: Array.from({ length: 9 }, (_, i) => `Q${i}?`) },
  variants: { slot: 'variant', values: ["grid", "scattered"] },
  long: { questions: Array.from({ length: 8 }, (_, i) => `Question ${i}: will it work on the night shift too?`) }, parts: ["question"],
})
