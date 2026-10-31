/** L03 — the pure rules of a choice activity (what `tls.a.choice` checks and how it scores). */

export interface ChoiceProps {
  options: string[]
  answer: number[]
  multiple?: boolean
}

/** The answer set is exactly the picked set. */
export function isCorrect(answer: readonly number[], picked: readonly number[]): boolean {
  const a = new Set(answer)
  const p = new Set(picked)
  return a.size === p.size && [...a].every((i) => p.has(i))
}

/** Per-option mark after evaluating: `correct` (picked and right), `wrong` (picked, not an answer),
 *  `missed` (an answer that was not picked), `idle`. */
export function marks(answer: readonly number[], picked: readonly number[], n: number): Array<'correct' | 'wrong' | 'missed' | 'idle'> {
  const a = new Set(answer)
  const p = new Set(picked)
  return Array.from({ length: n }, (_, i) => (p.has(i) ? (a.has(i) ? 'correct' : 'wrong') : a.has(i) ? 'missed' : 'idle'))
}

/** Does picking `i` evaluate at once? Only a single-answer choice in `instant` mode. */
export function evaluatesOnPick(multiple: boolean, submit: 'instant' | 'confirm'): boolean {
  return !multiple && submit === 'instant'
}
