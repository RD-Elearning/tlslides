/**
 * Behaviour of tls.a.fill-blank (viewer only): a bank chip fills the selected blank (else the first
 * empty one); a filled blank is cleared by clicking it. "Kiểm tra" is enabled once every blank is
 * filled. State: `extra.filled` = bank word per blank or null.
 */

import type { ActivityRuntime, ActivityState } from '../../../types'
import { footerParts } from '../../../activity/live-kit'
import { answersOf } from './index'
import type { FillBlankProps } from './index'

export function interact(root: HTMLElement, rt: ActivityRuntime, props: FillBlankProps): () => void {
  const ans = answersOf(props.text)
  const L = rt.labels
  const P = footerParts(root, L)
  const blanks = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-act="blank"]'))
  const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-act="chip"]'))
  const canRetry = props.retry !== false
  const canShow = props.showAnswer !== false
  let selected = -1
  let state: ActivityState = rt.getState() ?? { done: false, extra: { filled: ans.map(() => null) } }
  const filled = (): Array<string | null> => ((state.extra?.filled as Array<string | null>) ?? ans.map(() => null))
  const norm = (s: string | null) => (s ?? '').trim().toLowerCase()
  const save = () => rt.setState({ ...state })

  const render = () => {
    const f = filled()
    const done = !!state.done
    const shown = state.done === 'shown'
    let right = 0
    blanks.forEach((b, i) => {
      const word = shown ? ans[i] : f[i]
      b.textContent = word ?? ''
      b.dataset.sel = String(!done && selected === i)
      b.disabled = done
      const ok = norm(f[i]) === norm(ans[i])
      if (ok) right++
      b.dataset.state = !done ? 'idle' : shown ? 'missed' : ok ? 'correct' : 'wrong'
    })
    const used = new Set(f.filter((x): x is string => !!x).map(norm))
    chips.forEach((c) => (c.disabled = done || used.has(norm(c.dataset.w ?? ''))))
    const all = f.every((x) => x !== null)
    const allRight = right === ans.length
    if (P.check) {
      P.check.hidden = done
      P.check.disabled = !all
    }
    if (P.fb) {
      P.fb.textContent = done && !shown ? (allRight ? L.correct : `${right} ${L.of} ${ans.length}`) : ''
      P.fb.dataset.ok = done && !shown ? String(allRight) : ''
    }
    if (P.show) P.show.hidden = !(done && state.done === true && !allRight && canShow)
    if (P.retry) P.retry.hidden = !(done && canRetry)
    if (P.expl) P.expl.hidden = !(done && (allRight || shown))
  }

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement
    const chip = t.closest<HTMLButtonElement>('[data-act="chip"]')
    const blank = t.closest<HTMLButtonElement>('[data-act="blank"]')
    if (chip && !state.done) {
      const f = [...filled()]
      const at = selected >= 0 ? selected : f.findIndex((x) => x === null)
      if (at < 0) return
      f[at] = chip.dataset.w ?? null
      selected = -1
      state = { ...state, extra: { ...state.extra, filled: f } }
      save()
      render()
    } else if (blank && !state.done) {
      const i = Number(blank.dataset.i)
      const f = [...filled()]
      if (f[i] !== null) {
        f[i] = null
        state = { ...state, extra: { ...state.extra, filled: f } }
        save()
      } else selected = selected === i ? -1 : i
      render()
    } else {
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act
      if (act === 'check' && !state.done && filled().every((x) => x !== null)) {
        state = { ...state, done: true }
        save()
        rt.emit?.({ type: 'answered', kind: 'fill-blank', correct: filled().every((x, i) => norm(x) === norm(ans[i])) })
        render()
      } else if (act === 'show') {
        state = { ...state, done: 'shown' }
        save()
        rt.emit?.({ type: 'revealed', kind: 'fill-blank' })
        render()
      } else if (act === 'retry') {
        selected = -1
        state = { done: false, extra: { filled: ans.map(() => null) } }
        save()
        rt.emit?.({ type: 'retried', kind: 'fill-blank' })
        render()
      }
    }
  }
  root.addEventListener('click', onClick)
  render()
  return () => root.removeEventListener('click', onClick)
}
