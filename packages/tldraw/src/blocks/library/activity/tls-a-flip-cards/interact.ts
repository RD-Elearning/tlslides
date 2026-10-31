/** Behaviour of tls.a.flip-cards (viewer only): a card flips on click (aria-pressed); "Lật hết" / "Úp hết". */

import type { ActivityRuntime, ActivityState } from '../../../types'
import type { FlipProps } from './index'

export function interact(root: HTMLElement, rt: ActivityRuntime, _props: FlipProps): () => void {
  const cards = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-act="flip"]'))
  const all = root.querySelector<HTMLButtonElement>('[data-act="flipall"]')
  const none = root.querySelector<HTMLButtonElement>('[data-act="unflipall"]')
  const fb = root.querySelector<HTMLElement>('[data-part="feedback"]')
  if (all) all.textContent = rt.labels.flipAll
  if (none) none.textContent = rt.labels.unflipAll
  let state: ActivityState = rt.getState() ?? { picked: [] }
  const save = () => rt.setState({ ...state, picked: [...(state.picked ?? [])] })
  const render = () => {
    const flipped = new Set(state.picked ?? [])
    cards.forEach((c, i) => c.setAttribute('aria-pressed', String(flipped.has(i))))
    const n = flipped.size
    if (all) all.hidden = n === cards.length
    if (none) none.hidden = n !== cards.length
    if (fb) fb.textContent = `${n} ${rt.labels.of} ${cards.length}`
  }
  const set = (picked: number[]) => {
    state = { ...state, picked }
    save()
    render()
  }
  const onClick = (e: Event) => {
    const t = e.target as HTMLElement
    const card = t.closest<HTMLButtonElement>('[data-act="flip"]')
    if (card) {
      const i = Number(card.dataset.i)
      const cur = state.picked ?? []
      set(cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i])
      return
    }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act
    if (act === 'flipall') set(cards.map((_, i) => i))
    else if (act === 'unflipall') set([])
  }
  root.addEventListener('click', onClick)
  render()
  return () => root.removeEventListener('click', onClick)
}
