/**
 * Behaviour of tls.a.order (viewer only): click the items in the order you think (they get 1..n);
 * clicking a numbered item removes it and the later ones renumber. "Kiểm tra" once all are numbered.
 * State: `picked` = correct-order indices in the order they were clicked.
 */

import type { ActivityRuntime, ActivityState } from '../../../types'
import { footerParts } from '../../../activity/live-kit'
import type { OrderProps } from './index'

export function interact(root: HTMLElement, rt: ActivityRuntime, props: OrderProps): () => void {
  const n = Array.isArray(props.items) ? Math.min(props.items.length, 7) : 0
  const L = rt.labels
  const P = footerParts(root, L)
  const items = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-act="item"]'))
  const canRetry = props.retry !== false
  const canShow = props.showAnswer !== false
  let state: ActivityState = rt.getState() ?? { picked: [], done: false }
  const picked = () => state.picked ?? []
  const save = () => rt.setState({ ...state, picked: [...picked()] })

  const render = () => {
    const done = !!state.done
    const shown = state.done === 'shown'
    const seq = shown ? Array.from({ length: n }, (_, i) => i) : picked()
    let right = 0
    items.forEach((el) => {
      const i = Number(el.dataset.i)
      const pos = seq.indexOf(i)
      if (pos === i) right++
      const badge = el.querySelector<HTMLElement>('.tlsa-badge')!
      badge.hidden = pos < 0
      badge.textContent = pos >= 0 ? String(pos + 1) : ''
      el.setAttribute('aria-pressed', String(pos >= 0))
      el.disabled = done
      el.dataset.state = !done ? 'idle' : shown ? 'missed' : pos === i ? 'correct' : 'wrong'
    })
    const all = picked().length === n
    const allRight = right === n
    if (P.check) {
      P.check.hidden = done
      P.check.disabled = !all
    }
    if (P.fb) {
      P.fb.textContent = done && !shown ? (allRight ? L.correct : `${right} ${L.of} ${n}`) : ''
      P.fb.dataset.ok = done && !shown ? String(allRight) : ''
    }
    if (P.show) P.show.hidden = !(done && state.done === true && !allRight && canShow)
    if (P.retry) P.retry.hidden = !(done && canRetry)
    if (P.expl) P.expl.hidden = !(done && (allRight || shown))
  }

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement
    const el = t.closest<HTMLButtonElement>('[data-act]')
    const act = el?.dataset.act
    if (!el || !act) return
    if (act === 'item' && !state.done) {
      const i = Number(el.dataset.i)
      const cur = picked()
      state = { ...state, picked: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] }
      save()
      render()
    } else if (act === 'check' && !state.done && picked().length === n) {
      state = { ...state, done: true }
      save()
      rt.emit?.({ type: 'answered', kind: 'order', correct: picked().every((x, k) => x === k) })
      render()
    } else if (act === 'show') {
      state = { ...state, done: 'shown' }
      save()
      rt.emit?.({ type: 'revealed', kind: 'order' })
      render()
    } else if (act === 'retry') {
      state = { picked: [], done: false }
      save()
      rt.emit?.({ type: 'retried', kind: 'order' })
      render()
    }
  }
  root.addEventListener('click', onClick)
  render()
  return () => root.removeEventListener('click', onClick)
}
