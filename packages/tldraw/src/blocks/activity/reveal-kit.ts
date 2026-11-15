/**
 * spro sprint 2026-11b S10 — DOM helpers for the reveal blocks' `reveal()` hooks (tabs, accordion,
 * step-through, hotspots). The block's static layout is already rendered (every part a `data-part`
 * element, absolutely placed in slide units); a hook only changes what is shown through one scoped
 * `<style>` it owns, and turns parts into keyboard-operable controls. No global state: the state lives
 * in the hook's closure and is gone when the slide is left.
 */
import type { ActivityRuntime } from '../types'

let seq = 0

export interface RevealScope {
  /** `[data-rv="n"]`, the prefix every rule of this block starts with. */
  sel: string
  /** Replace the block's rules. */
  css(rules: string): void
  /** The element of one part (`item[2].text`), if rendered (the first piece of a flattened part). */
  part(name: string): HTMLElement | null
  /** Every element of one part: `name` itself and its flattened pieces `name[k]` (a marker's disc and digit). */
  group(name: string): HTMLElement[]
  /** Every element whose part starts with `prefix`. */
  parts(prefix: string): HTMLElement[]
  dispose(): void
}

export function revealScope(root: HTMLElement, rt: ActivityRuntime): RevealScope {
  const id = String(++seq)
  root.setAttribute('data-rv', id)
  const style = document.createElement('style')
  style.setAttribute('data-rv-style', id)
  root.appendChild(style)
  const sel = `[data-rv="${id}"]`
  // matched in code, not by a selector: a `^=` value holding brackets is not parsed alike everywhere
  const group = (name: string) => Array.from(root.querySelectorAll<HTMLElement>('[data-part]')).filter((e) => e.dataset.part === name || (e.dataset.part ?? '').startsWith(`${name}[`))
  const ease = rt.reducedMotion ? '' : `${sel} [data-part]{transition:opacity .25s ease,transform .3s ease,visibility .25s}`
  return {
    sel,
    css(rules) {
      // the viewer's entrance motion leaves an inline `opacity: 1` on every part: a dim / hide must outrank it
      style.textContent = ease + rules.replace(/opacity:\s*([\d.]+)(?=[;}])/g, 'opacity:$1!important')
    },
    part: (name) => group(name)[0] ?? null,
    group,
    parts: (prefix) => Array.from(root.querySelectorAll<HTMLElement>('[data-part]')).filter((e) => (e.dataset.part ?? '').startsWith(prefix)),
    dispose() {
      style.remove()
      root.removeAttribute('data-rv')
    },
  }
}

/** `[data-part="…"]` under the block, and its flattened pieces `…[k]` (CSS selector list). */
export const P = (sel: string, part: string) => `${sel} [data-part="${part}"],${sel} [data-part^="${part}["]`
/** Every part of item `i` (`item[i].…`). */
export const ITEM = (sel: string, i: number, prefix = 'item') => `${sel} [data-part^="${prefix}[${i}]."]`

/**
 * Make `el` a control: focusable, a `role`, Enter / Space and a click activate it (the click does not
 * reach the slide). Returns the remover.
 */
export function control(target: HTMLElement | null | HTMLElement[], role: string, label: string, onActivate: () => void): () => void {
  const all = (Array.isArray(target) ? target : [target]).filter((e): e is HTMLElement => !!e)
  if (!all.length) return () => undefined
  // the first piece is the focusable control; every piece takes the click
  const rest = all.slice(1).map((e) => {
    e.style.cursor = 'pointer'
    e.style.pointerEvents = 'auto'
    const click = (ev: Event) => {
      ev.stopPropagation()
      onActivate()
    }
    e.addEventListener('click', click)
    return () => e.removeEventListener('click', click)
  })
  const el = all[0]
  el.setAttribute('role', role)
  el.setAttribute('tabindex', '0')
  if (label) el.setAttribute('aria-label', label)
  el.style.cursor = 'pointer'
  el.style.pointerEvents = 'auto'
  const click = (e: Event) => {
    e.stopPropagation()
    onActivate()
  }
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onActivate()
    }
  }
  el.addEventListener('click', click)
  el.addEventListener('keydown', key)
  return () => {
    rest.forEach((f) => f())
    el.removeEventListener('click', click)
    el.removeEventListener('keydown', key)
    for (const a of ['role', 'tabindex', 'aria-label', 'aria-selected', 'aria-expanded', 'aria-pressed', 'aria-current']) el.removeAttribute(a)
  }
}

/** The text of a part element (its label for assistive tech). */
export const textOf = (el: HTMLElement | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

/** The focus ring every control shows (keyboard focus only). */
export const focusRing = (sel: string, color: string) => `${sel} [tabindex="0"]:focus-visible{outline:4px solid ${color};outline-offset:6px;border-radius:12px}`

/** A part's top and height in slide units, read from its inline style (the layout's own numbers). */
export function boxOf(el: HTMLElement | null): { top: number; height: number } | null {
  if (!el) return null
  const top = parseFloat(el.style.top)
  const height = parseFloat(el.style.height)
  return Number.isFinite(top) && Number.isFinite(height) ? { top, height } : null
}
