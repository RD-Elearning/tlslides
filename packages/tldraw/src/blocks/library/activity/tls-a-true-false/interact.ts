/**
 * Behaviour of tls.a.true-false (viewer only): choose ✓ or ✗ for each statement; "Kiểm tra" is enabled once
 * every statement has an answer; the rows then show correct / wrong marks, "Hiện đáp án" fills the
 * right verdicts, "Làm lại" starts over. State: `extra.verdicts` = per statement 1 / 0 / null.
 */

import type { ActivityRuntime, ActivityState } from '../../../types'
import { footerParts } from '../../../activity/live-kit'
import type { TrueFalseProps } from './index'

export function interact(root: HTMLElement, rt: ActivityRuntime, props: TrueFalseProps): () => void {
  const st = Array.isArray(props.statements) ? props.statements : []
  const L = rt.labels
  const P = footerParts(root, L)
  const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-row]'))
  const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-act="statement"]'))
  const canRetry = props.retry !== false
  const canShow = props.showAnswer !== false
  let state: ActivityState = rt.getState() ?? { done: false, extra: { verdicts: st.map(() => null) } }
  const verdicts = (): Array<number | null> => ((state.extra?.verdicts as Array<number | null>) ?? st.map(() => null))
  const save = () => rt.setState({ ...state })
  const truth = (i: number) => (st[i]?.answer ? 1 : 0)

  const render = () => {
    const v = verdicts()
    const done = !!state.done
    const shown = state.done === 'shown'
    let right = 0
    rows.forEach((row, i) => {
      const buttons = btns.filter((b) => Number(b.dataset.i) === i)
      buttons.forEach((b) => {
        b.setAttribute('aria-pressed', String(shown ? Number(b.dataset.v) === truth(i) : v[i] !== null && Number(b.dataset.v) === v[i]))
        b.disabled = done
      })
      const ok = v[i] === truth(i)
      if (ok) right++
      row.dataset.state = !done ? 'idle' : shown ? 'missed' : ok ? 'correct' : 'wrong'
    })
    const all = v.every((x) => x !== null)
    const allRight = right === st.length
    if (P.check) {
      P.check.hidden = done
      P.check.disabled = !all
    }
    if (P.fb) {
      P.fb.textContent = done && !shown ? (allRight ? L.correct : `${right} ${L.of} ${st.length}`) : ''
      P.fb.dataset.ok = done && !shown ? String(allRight) : ''
    }
    if (P.show) P.show.hidden = !(done && state.done === true && !allRight && canShow)
    if (P.retry) P.retry.hidden = !(done && canRetry)
    if (P.expl) P.expl.hidden = !(done && (allRight || shown))
  }

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement
    const b = t.closest<HTMLButtonElement>('[data-act="statement"]')
    if (b && !state.done) {
      const v = [...verdicts()]
      v[Number(b.dataset.i)] = Number(b.dataset.v)
      state = { ...state, extra: { ...state.extra, verdicts: v } }
      save()
      render()
      return
    }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act
    if (act === 'check' && !state.done && verdicts().every((x) => x !== null)) {
      state = { ...state, done: true }
      save()
      rt.emit?.({ type: 'answered', kind: 'true-false', correct: verdicts().every((x, i) => x === truth(i)) })
      render()
    } else if (act === 'show') {
      state = { ...state, done: 'shown' }
      save()
      rt.emit?.({ type: 'revealed', kind: 'true-false' })
      render()
    } else if (act === 'retry') {
      state = { done: false, extra: { verdicts: st.map(() => null) } }
      save()
      rt.emit?.({ type: 'retried', kind: 'true-false' })
      render()
    }
  }
  root.addEventListener('click', onClick)
  render()
  return () => root.removeEventListener('click', onClick)
}
