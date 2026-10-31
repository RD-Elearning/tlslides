/** Behaviour of tls.a.timer (viewer only): start / stop a countdown; at zero the clock turns "Hết giờ". Not scored; state is not kept across a re-mount (a running clock is not resumable). */

import type { ActivityRuntime } from '../../../types'
import { clock } from './index'
import type { TimerProps } from './index'

export function interact(root: HTMLElement, rt: ActivityRuntime, props: TimerProps): () => void {
  const total = Math.max(0, Math.round(Number(props.seconds) || 0))
  const L = rt.labels
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)
  const face = q('[data-part="clock"]')
  const fb = q('[data-part="feedback"]')
  const start = q<HTMLButtonElement>('[data-act="start"]')
  const stop = q<HTMLButtonElement>('[data-act="stop"]')
  const retry = q<HTMLButtonElement>('[data-act="retry"]')
  if (start) start.textContent = L.start
  if (stop) stop.textContent = L.stop
  if (retry) retry.textContent = L.retry
  let left = total
  let handle: ReturnType<typeof setInterval> | null = null
  const paint = () => {
    if (face) {
      face.textContent = clock(left)
      face.dataset.state = left === 0 ? 'up' : 'idle'
    }
    if (fb) fb.textContent = left === 0 ? L.timeUp : ''
    const running = handle !== null
    if (start) start.hidden = running || left === 0
    if (stop) stop.hidden = !running
    if (retry) retry.hidden = running || left === total
  }
  const halt = () => {
    if (handle !== null) clearInterval(handle)
    handle = null
  }
  const tick = () => {
    left = Math.max(0, left - 1)
    if (left === 0) halt()
    paint()
  }
  const onClick = (e: Event) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act
    if (act === 'start' && handle === null && left > 0) handle = setInterval(tick, 1000)
    else if (act === 'stop') halt()
    else if (act === 'retry') {
      halt()
      left = total
    } else return
    paint()
  }
  root.addEventListener('click', onClick)
  paint()
  return () => {
    halt()
    root.removeEventListener('click', onClick)
  }
}
