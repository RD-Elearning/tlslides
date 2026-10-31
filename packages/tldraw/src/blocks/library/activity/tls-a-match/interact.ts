/**
 * Behaviour of tls.a.match (viewer only): click a left item, then a right item to pair them (both show
 * the same number); clicking a paired item unpairs it. "Kiểm tra" is enabled once every left is paired.
 * State: `extra.links` = right pair-index per left index, or null.
 */

import type { ActivityRuntime, ActivityState } from '../../../types'
import { footerParts } from '../../../activity/live-kit'
import type { MatchProps } from './index'

export function interact(root: HTMLElement, rt: ActivityRuntime, props: MatchProps): () => void {
  const n = Array.isArray(props.pairs) ? Math.min(props.pairs.length, 6) : 0
  const L = rt.labels
  const P = footerParts(root, L)
  const lefts = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-act="left"]'))
  const rights = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-act="right"]'))
  const canRetry = props.retry !== false
  const canShow = props.showAnswer !== false
  let selected = -1
  const empty = () => Array.from({ length: n }, () => null as number | null)
  let state: ActivityState = rt.getState() ?? { done: false, extra: { links: empty() } }
  const links = (): Array<number | null> => ((state.extra?.links as Array<number | null>) ?? empty())
  const save = () => rt.setState({ ...state })
  const setLinks = (l: Array<number | null>) => {
    state = { ...state, extra: { ...state.extra, links: l } }
    save()
  }

  const render = () => {
    const l = state.done === 'shown' ? Array.from({ length: n }, (_, i) => i) : links()
    const done = !!state.done
    const shown = state.done === 'shown'
    let right = 0
    lefts.forEach((el) => {
      const i = Number(el.dataset.i)
      const linked = l[i] !== null
      const ok = l[i] === i
      if (ok) right++
      el.setAttribute('aria-pressed', String(!done && selected === i))
      el.disabled = done
      el.toggleAttribute('data-linked', linked)
      const badge = el.querySelector<HTMLElement>('.tlsa-badge')!
      badge.hidden = !linked
      badge.textContent = linked ? String(i + 1) : ''
      el.dataset.state = !done ? 'idle' : shown ? 'missed' : ok ? 'correct' : 'wrong'
    })
    rights.forEach((el) => {
      const r = Number(el.dataset.i)
      const from = l.findIndex((x) => x === r)
      el.toggleAttribute('data-linked', from >= 0)
      el.disabled = done
      const badge = el.querySelector<HTMLElement>('.tlsa-badge')!
      badge.hidden = from < 0
      badge.textContent = from >= 0 ? String(from + 1) : ''
      el.dataset.state = !done ? 'idle' : shown ? 'missed' : from >= 0 && l[from] === from ? 'correct' : 'wrong'
    })
    const all = l.every((x) => x !== null)
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
    if (!state.done && (act === 'left' || act === 'right')) {
      const i = Number(el.dataset.i)
      const l = [...links()]
      if (act === 'left') {
        if (l[i] !== null) {
          l[i] = null
          setLinks(l)
        } else selected = selected === i ? -1 : i
      } else {
        const from = l.findIndex((x) => x === i)
        if (from >= 0) {
          l[from] = null
          setLinks(l)
        } else if (selected >= 0) {
          l[selected] = i
          selected = -1
          setLinks(l)
        }
      }
      render()
    } else if (act === 'check' && !state.done && links().every((x) => x !== null)) {
      state = { ...state, done: true }
      save()
      rt.emit?.({ type: 'answered', kind: 'match', correct: links().every((x, i) => x === i) })
      render()
    } else if (act === 'show') {
      state = { ...state, done: 'shown' }
      save()
      rt.emit?.({ type: 'revealed', kind: 'match' })
      render()
    } else if (act === 'retry') {
      selected = -1
      state = { done: false, extra: { links: empty() } }
      save()
      rt.emit?.({ type: 'retried', kind: 'match' })
      render()
    }
  }
  root.addEventListener('click', onClick)
  render()
  return () => root.removeEventListener('click', onClick)
}
