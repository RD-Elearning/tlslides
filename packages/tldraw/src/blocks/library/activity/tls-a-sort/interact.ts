/**
 * Behaviour of tls.a.sort (viewer only): click an item, then a bin; the item shows the bin's number.
 * Clicking an assigned item unassigns it. "Kiểm tra" once every item has a bin.
 * State: `extra.bins` = bin index per item index, or null.
 */

import type { ActivityRuntime, ActivityState } from '../../../types'
import { footerParts } from '../../../activity/live-kit'
import type { SortProps } from './index'

export function interact(root: HTMLElement, rt: ActivityRuntime, props: SortProps): () => void {
  const items = Array.isArray(props.items) ? props.items.slice(0, 9) : []
  const L = rt.labels
  const P = footerParts(root, L)
  const cells = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-act="item"]'))
  const canRetry = props.retry !== false
  const canShow = props.showAnswer !== false
  let selected = -1
  const empty = () => items.map(() => null as number | null)
  let state: ActivityState = rt.getState() ?? { done: false, extra: { bins: empty() } }
  const assigned = (): Array<number | null> => ((state.extra?.bins as Array<number | null>) ?? empty())
  const save = () => rt.setState({ ...state })

  const render = () => {
    const done = !!state.done
    const shown = state.done === 'shown'
    const a = shown ? items.map((x) => x.bin) : assigned()
    let right = 0
    cells.forEach((el) => {
      const i = Number(el.dataset.i)
      const ok = a[i] === items[i].bin
      if (ok) right++
      const badge = el.querySelector<HTMLElement>('.tlsa-badge')!
      badge.hidden = a[i] === null
      badge.textContent = a[i] === null ? '' : String((a[i] as number) + 1)
      el.setAttribute('aria-pressed', String(!done && selected === i))
      el.disabled = done
      el.dataset.state = !done ? 'idle' : shown ? 'missed' : ok ? 'correct' : 'wrong'
    })
    root.querySelectorAll<HTMLButtonElement>('[data-act="bin"]').forEach((b) => (b.disabled = done))
    const all = a.every((x) => x !== null)
    const allRight = right === items.length
    if (P.check) {
      P.check.hidden = done
      P.check.disabled = !all
    }
    if (P.fb) {
      P.fb.textContent = done && !shown ? (allRight ? L.correct : `${right} ${L.of} ${items.length}`) : ''
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
      const a = [...assigned()]
      if (a[i] !== null) {
        a[i] = null
        state = { ...state, extra: { ...state.extra, bins: a } }
        save()
      } else selected = selected === i ? -1 : i
      render()
    } else if (act === 'bin' && !state.done && selected >= 0) {
      const a = [...assigned()]
      a[selected] = Number(el.dataset.b)
      selected = -1
      state = { ...state, extra: { ...state.extra, bins: a } }
      save()
      render()
    } else if (act === 'check' && !state.done && assigned().every((x) => x !== null)) {
      state = { ...state, done: true }
      save()
      rt.emit?.({ type: 'answered', kind: 'sort', correct: assigned().every((x, i) => x === items[i].bin) })
      render()
    } else if (act === 'show') {
      state = { ...state, done: 'shown' }
      save()
      rt.emit?.({ type: 'revealed', kind: 'sort' })
      render()
    } else if (act === 'retry') {
      selected = -1
      state = { done: false, extra: { bins: empty() } }
      save()
      rt.emit?.({ type: 'retried', kind: 'sort' })
      render()
    }
  }
  root.addEventListener('click', onClick)
  render()
  return () => root.removeEventListener('click', onClick)
}
