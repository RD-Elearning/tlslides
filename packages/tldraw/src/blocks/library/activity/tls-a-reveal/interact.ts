/** Behaviour of tls.a.reveal (viewer only): "Gợi ý" shows hints one by one, "Hiện đáp án" shows the answer, "Làm lại" hides all. State: `extra.hints` = hints shown. */

import type { ActivityRuntime, ActivityState } from '../../../types'
import type { RevealProps } from './index'

export function interact(root: HTMLElement, rt: ActivityRuntime, props: RevealProps): () => void {
  const n = Array.isArray(props.hints) ? Math.min(props.hints.length, 3) : 0
  const L = rt.labels
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)
  const hintBtn = q<HTMLButtonElement>('[data-act="hint"]')
  const showBtn = q<HTMLButtonElement>('[data-act="show"]')
  const retryBtn = q<HTMLButtonElement>('[data-act="retry"]')
  const area = q<HTMLElement>('[data-part="answer"]')
  const hints = Array.from(root.querySelectorAll<HTMLElement>('[data-hint]'))
  if (hintBtn) hintBtn.textContent = L.hint
  if (showBtn) showBtn.textContent = L.showAnswer
  if (retryBtn) retryBtn.textContent = L.retry
  let state: ActivityState = rt.getState() ?? { done: false, extra: { hints: 0 } }
  const shownHints = () => Number(state.extra?.hints ?? 0)
  const save = () => rt.setState({ ...state })
  const render = () => {
    const h = shownHints()
    const shown = state.done === 'shown'
    hints.forEach((el, i) => (el.hidden = i >= h))
    if (area) area.dataset.shown = String(shown)
    if (hintBtn) hintBtn.hidden = shown || h >= n
    if (showBtn) showBtn.hidden = shown
    if (retryBtn) retryBtn.hidden = !shown && h === 0
  }
  const onClick = (e: Event) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act
    if (act === 'hint' && shownHints() < n) {
      state = { ...state, extra: { ...state.extra, hints: shownHints() + 1 } }
    } else if (act === 'show') {
      state = { ...state, done: 'shown', extra: { ...state.extra, hints: n } }
      rt.emit?.({ type: 'revealed', kind: 'reveal' })
    } else if (act === 'retry') {
      state = { done: false, extra: { hints: 0 } }
      rt.emit?.({ type: 'retried', kind: 'reveal' })
    } else return
    save()
    render()
  }
  root.addEventListener('click', onClick)
  render()
  return () => root.removeEventListener('click', onClick)
}
