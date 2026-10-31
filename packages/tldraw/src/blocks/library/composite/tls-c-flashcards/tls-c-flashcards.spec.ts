/** tls.c.flashcards — spro creative CR8 (the shared wave-1 suite). */
import { tlsCFlashcards, buildFlashcards } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCFlashcards, build: buildFlashcards, category: 'learning', scope: 'slide',
  overflow: { cards: Array.from({ length: 7 }, (_, i) => ({ term: `T${i}` })) },
  variants: { slot: 'variant', values: ["grid", "fan"] },
  long: { cards: Array.from({ length: 6 }, (_, i) => ({ term: `Term number ${i}`, back: 'A meaning written in one full line of text here' })) }, parts: ["card"],
})
