/**
 * Behaviour of tls.a.choice (viewer only; `HostMount` calls it when the viewer renders interactively).
 *
 * idle → pick → (instant single: evaluated at once | confirm / multi: "Kiểm tra") → evaluated.
 * Evaluated shows correct (✓) and wrong (✗) marks with colour roles, the feedback line in a polite
 * live region, the explanation after a correct answer or "Hiện đáp án", "Làm lại" to start over.
 * State lives in the runtime (`getState/setState`) so leaving and coming back to the slide keeps it.
 * Options are real buttons: Enter/Space on a focused option picks it (the browser's own click).
 */

import type { ActivityRuntime, ActivityState } from '../../../types'
import { evaluatesOnPick, isCorrect } from '../../../activity/choice-logic'
import type { ChoiceBlockProps } from './index'

export function interact(root: HTMLElement, rt: ActivityRuntime, props: ChoiceBlockProps): () => void {
  const options = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-act="option"]'))
  const check = root.querySelector<HTMLButtonElement>('[data-act="check"]')
  const show = root.querySelector<HTMLButtonElement>('[data-act="show"]')
  const retry = root.querySelector<HTMLButtonElement>('[data-act="retry"]')
  const fb = root.querySelector<HTMLElement>('[data-part="feedback"]')
  const expl = root.querySelector<HTMLElement>('[data-part="explanation"]')
  const answer = (Array.isArray(props.answer) ? props.answer : []).filter((i) => Number.isInteger(i))
  const multiple = !!props.multiple
  const submit = props.submit === 'confirm' || props.submit === 'instant' ? props.submit : rt.submit
  const instant = evaluatesOnPick(multiple, submit)
  const L = rt.labels
  const canRetry = props.retry !== false
  const canShow = props.showAnswer !== false
  if (check) check.textContent = L.check
  if (show) show.textContent = L.showAnswer
  if (retry) retry.textContent = L.retry

  let state: ActivityState = rt.getState() ?? { picked: [], done: false }
  const save = () => rt.setState({ ...state, picked: [...(state.picked ?? [])] })

  const render = () => {
    const picked = state.picked ?? []
    const done = !!state.done
    options.forEach((b, i) => {
      b.setAttribute('aria-pressed', String(picked.includes(i)))
      b.disabled = done
      // marks: what was picked is judged; the answers a learner missed show only after "Hiện đáp án"
      b.dataset.state = !done ? 'idle' : picked.includes(i) ? (answer.includes(i) ? 'correct' : 'wrong') : state.done === 'shown' && answer.includes(i) ? 'missed' : 'idle'
    })
    const ok = done && isCorrect(answer, picked)
    const confirmNeeded = !instant && !done
    if (check) {
      check.hidden = !confirmNeeded
      check.disabled = picked.length === 0
    }
    if (fb) {
      fb.textContent = done ? (state.done === 'shown' ? '' : ok ? L.correct : L.wrong) : ''
      fb.dataset.ok = done && state.done !== 'shown' ? String(ok) : ''
    }
    if (show) show.hidden = !(done && state.done === true && !ok && canShow)
    if (retry) retry.hidden = !(done && canRetry)
    if (expl) expl.hidden = !(done && (ok || state.done === 'shown'))
    // the why of the picked option (live block only)
    if (fb && done && state.done === true && Array.isArray(props.why) && picked.length === 1 && props.why[picked[0]]) {
      fb.textContent = `${fb.textContent} — ${props.why[picked[0]]}`
    }
  }

  const evaluate = () => {
    state = { ...state, done: true }
    save()
    rt.emit?.({ type: 'answered', kind: 'choice', correct: isCorrect(answer, state.picked ?? []) })
    render()
  }

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement
    const opt = t.closest<HTMLButtonElement>('[data-act="option"]')
    if (opt && !state.done) {
      const i = Number(opt.dataset.i)
      const cur = state.picked ?? []
      state = { ...state, picked: multiple ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i] }
      save()
      if (instant) evaluate()
      else render()
      return
    }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act
    if (act === 'check' && !state.done && (state.picked?.length ?? 0) > 0) evaluate()
    else if (act === 'show') {
      state = { ...state, done: 'shown' }
      save()
      rt.emit?.({ type: 'revealed', kind: 'choice' })
      render()
    } else if (act === 'retry') {
      state = { picked: [], done: false }
      save()
      rt.emit?.({ type: 'retried', kind: 'choice' })
      render()
    }
  }

  root.addEventListener('click', onClick)
  render()
  return () => root.removeEventListener('click', onClick)
}
