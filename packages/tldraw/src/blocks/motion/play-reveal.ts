/**
 * `playBlockReveal` — one function, three callers (DeckViewer, PresentationRuntime,
 * R12 inspector Preview). Resolves a block's motion recipe (block-level + part-level)
 * and drives the reveal through a `MotionDriver`.
 *
 * **No React import.** This module is pure DOM + driver — it can be consumed by any
 * caller that has a mounted `HTMLElement` for the block and a `MotionDriver`.
 *
 * ## Ordering invariant (R5)
 *
 * 1. `driver.set(part, hiddenState)` for **every** part synchronously — parts are set
 *    up while the whole block is still at `opacity: 0`.
 * 2. `driver.play(block)` — the block-level entrance animation starts.
 * 3. `driver.play(part, ...)` with staggered delays — each part's own choreography.
 *
 * Because parts are children of the block container, the block's opacity/translate
 * composes with each part's own animation. A block-level `FadeIn` that fades the
 * container from 0 → 1 while parts stagger-fade from 0 → 1 produces a natural
 * compound effect.
 *
 * ## Count-up (textContent tween)
 *
 * Parts with a `count-up` preset get an `onUpdate(progress)` callback that writes
 * the interpolated number to `textContent`. This runs through the driver's progress
 * callback so it obeys `cancelAll()` and reduced motion. The target value is read
 * from the element's existing textContent before the tween starts.
 *
 * @module motion/play-reveal
 */

import type { AnimationEffect } from '~types'
import type { MotionDriver, MotionKeyframes, MotionState } from './driver'
import { resolveBlockMotion, resolvePartMotion } from './resolve-motion'
import type { ResolvedPartMotion } from './resolve-motion'
import { MOTION_PRESETS } from './presets'
import type { BlockSpec, BlockDefinition } from '../types'

// --- Types -------------------------------------------------------------------

/**
 * Runtime context passed by the caller. Contains everything the reveal function
 * needs from the host environment — no React, no store, no app.
 */
export interface PlayBlockRevealContext {
  /** The motion driver to play animations through. */
  driver: MotionDriver
  /** When true, skip all animations — set visible state immediately. */
  reducedMotion: boolean
}

// --- Helpers -----------------------------------------------------------------

/**
 * Extract the "from" state (first value of each keyframe array) so a part can be
 * set to its hidden position before its animation plays.
 */
function hiddenStateFromKeyframes(keyframes: MotionKeyframes): MotionState {
  const state: MotionState = {}
  if (keyframes.opacity !== undefined) state.opacity = keyframes.opacity[0]
  if (keyframes.translate !== undefined) state.translate = keyframes.translate[0]
  if (keyframes.scale !== undefined) state.scale = keyframes.scale[0]
  if (keyframes.scaleX !== undefined) state.scaleX = keyframes.scaleX[0]
  if (keyframes.scaleY !== undefined) state.scaleY = keyframes.scaleY[0]
  if (keyframes.clipPath !== undefined) state.clipPath = keyframes.clipPath[0]
  if (keyframes.filter !== undefined) state.filter = keyframes.filter[0]
  if (keyframes.strokeDashoffset !== undefined) state.strokeDashoffset = keyframes.strokeDashoffset[0]
  return state
}

/**
 * The settled, fully-revealed state — the "to" target for the block-level entrance.
 */
function blockVisibleState(effect?: AnimationEffect): MotionState {
  if (effect === 'wipe' as AnimationEffect) {
    return { opacity: 1, translate: '0px 0px', scale: 1, clipPath: 'inset(0% 0% 0% 0%)' }
  }
  return { opacity: 1, translate: '0px 0px', scale: 1 }
}

/**
 * Hidden state for the block container — matches the block-level effect.
 * Uses the same mapping as `DeckViewer/motion-helpers.ts` but without importing it,
 * keeping this module dependency-light and import-graph clean.
 */
function blockHiddenState(effect: AnimationEffect): MotionState {
  switch (effect) {
    case 'slideIn' as AnimationEffect:
      return { opacity: 0, translate: '0px 32px', scale: 1 }
    case 'zoomIn' as AnimationEffect:
      return { opacity: 0, translate: '0px 0px', scale: 0.7 }
    case 'wipe' as AnimationEffect:
      // Four explicit `%` terms on both ends (S16): see `clip-path.ts`.
      return { opacity: 1, translate: '0px 0px', scale: 1, clipPath: 'inset(0% 100% 0% 0%)' }
    case 'fadeIn' as AnimationEffect:
    default:
      return { opacity: 0, translate: '0px 0px', scale: 1 }
  }
}

/**
 * Build block-level `MotionKeyframes` from the resolved effect — the same four
 * effects the existing `entranceKeyframes` helper builds, but expressed here to
 * keep this module self-contained (no import from `DeckViewer/`).
 */
function blockEntranceKeyframes(effect: AnimationEffect): MotionKeyframes {
  const from = blockHiddenState(effect)
  const to = blockVisibleState(effect)
  const kf: MotionKeyframes = {}
  if (from.opacity !== to.opacity) kf.opacity = [from.opacity ?? 1, to.opacity ?? 1]
  if (from.translate !== to.translate) kf.translate = [from.translate ?? '0px 0px', to.translate ?? '0px 0px']
  if (from.scale !== to.scale) kf.scale = [from.scale ?? 1, to.scale ?? 1]
  if (from.clipPath !== undefined && to.clipPath !== undefined && from.clipPath !== to.clipPath) {
    kf.clipPath = [from.clipPath, to.clipPath]
  }
  return kf
}

/**
 * The DOM elements one recipe part addresses, and whether they came from an indexed match.
 *
 * 1. Exact `data-part="<name>"` matches (the pre-P7 behaviour, unchanged).
 * 2. Otherwise (P7) the part's indexed elements: `bar` matches `bar/0`, `bar/1`…; a glob such
 *    as `item[*].text` matches `item[0].text`, `item[1].text`…. Layouts emit indexed parts while
 *    recipes name the family, so without this most part choreography never found an element.
 */
export function partElements(el: HTMLElement, partName: string): { els: HTMLElement[]; indexed: boolean } {
  const exact = Array.from(el.querySelectorAll<HTMLElement>(`[data-part="${cssEscapeAttr(partName)}"]`))
  if (exact.length > 0) return { els: exact, indexed: false }
  const all = Array.from(el.querySelectorAll<HTMLElement>('[data-part]'))
  let match: (p: string) => boolean
  if (partName.includes('[*]')) {
    const re = new RegExp('^' + partName.split('[*]').map(escapeRegExp).join('\\[\\d+\\]') + '$')
    match = (p) => re.test(p)
  } else {
    match = (p) => p.startsWith(partName + '/') || (p.startsWith(partName) && /^\[\d+\]/.test(p.slice(partName.length)))
  }
  return { els: all.filter((n) => match(n.getAttribute('data-part') ?? '')), indexed: true }
}

/** The element whose text a count-up may rewrite: follow single-child chains down to a leaf
 *  that holds a digit; `undefined` for anything else (no number, or several children). */
function countTarget(el: HTMLElement): HTMLElement | undefined {
  let target: Element = el
  while (target.children.length === 1) target = target.children[0]
  if (target.children.length > 0) return undefined
  return /\d/.test(target.textContent ?? '') ? (target as HTMLElement) : undefined
}

/**
 * M3 — the text a count-up shows at `progress` (0–1) of its target, in the target's own format:
 * the same prefix/suffix, thousands separator and number of decimals ("1,250" counts
 * "0" … "625" … "1,250", "$4.25M" counts "$0.00M" … "$4.25M"), so the number never changes
 * shape on its last frame. A text with no number counts nothing (returns it unchanged).
 */
export function countFormat(text: string): (progress: number) => string {
  const m = /^(.*?)(\d[\d.,]*)(.*)$/.exec(text)
  if (!m) return () => text
  const [, prefix, raw, suffix] = m
  const grouped = /^\d{1,3}([.,]\d{3})+$/.exec(raw)
  if (grouped) {
    const sep = grouped[1][0]
    const value = Number(raw.split(sep).join(''))
    return (p) => prefix + Math.round(value * p).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep) + suffix
  }
  const dec = /[.,]/.exec(raw)?.[0]
  const decimals = dec ? raw.length - raw.indexOf(dec) - 1 : 0
  const value = Number(dec ? raw.replace(dec, '.') : raw)
  if (!Number.isFinite(value)) return () => text
  return (p) =>
    prefix + (decimals > 0 ? (value * p).toFixed(decimals).replace('.', dec ?? '.') : Math.round(value * p).toString()) + suffix
}

/** One tween a part element plays: on itself, or (a draw-on) on a stroked path inside it. */
interface PartPlay {
  target: Element
  keyframes: MotionKeyframes
  origin?: string
  /** A radial sweep (M1b): the target's clip-path is a sector about this centre, written each
   *  frame from 12 o'clock clockwise by a proxy tween's progress. */
  sweep?: { cx: number; cy: number; rect: { left: number; top: number; width: number; height: number }; start: number; turn: number }
  /** CMP3: a dashed stroke drawn on by growing its dash pattern (a proxy tween writes
   *  `stroke-dasharray` each frame; the last frame restores the authored pattern). */
  dashed?: { dash: number[]; len: number }
}

/**
 * A pie-sector clip-path about (cx, cy) (client px) covering `progress` of a sweep that starts
 * `startDeg` clockwise from 12 o'clock and turns `turnDeg` (M6: a 180° dial starts at -90 and
 * turns 180), in `%` of the element's client rect. The end of the sweep → `''` (no clip).
 */
export function sectorClip(
  cx: number,
  cy: number,
  rect: { left: number; top: number; width: number; height: number },
  progress: number,
  startDeg = 0,
  turnDeg = 360
): string {
  if (progress >= 1) return ''
  const R = 2 * Math.hypot(rect.width, rect.height) + Math.hypot(cx - rect.left, cy - rect.top)
  const pt = (a: number) =>
    `${(((cx + R * Math.sin(a) - rect.left) / rect.width) * 100).toFixed(3)}% ${(((cy - R * Math.cos(a) - rect.top) / rect.height) * 100).toFixed(3)}%`
  const a0 = (startDeg * Math.PI) / 180
  const theta = Math.max(0, progress) * ((turnDeg * Math.PI) / 180)
  const pts = [
    `${(((cx - rect.left) / rect.width) * 100).toFixed(3)}% ${(((cy - rect.top) / rect.height) * 100).toFixed(3)}%`,
    pt(a0),
  ]
  for (let a = Math.PI / 4; a < theta; a += Math.PI / 4) pts.push(pt(a0 + a))
  pts.push(pt(a0 + theta))
  return `polygon(${pts.join(', ')})`
}

/** Running sweep proxies per element, so a replay cancels the previous one. */
const sweepHandles = new WeakMap<Element, { cancel(): void }>()

/** The client-rect union of the geometry the elements paint (their SVG shapes, else themselves). */
function paintedUnion(els: Element[]): { left: number; top: number; right: number; bottom: number } | undefined {
  let u: { left: number; top: number; right: number; bottom: number } | undefined
  for (const e of els) {
    const shapes = Array.from(e.querySelectorAll('path, circle, ellipse, polygon, rect'))
    for (const n of shapes.length ? shapes : [e]) {
      const r = n.getBoundingClientRect()
      if (!(r.width > 0 && r.height > 0)) continue
      u = u
        ? { left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) }
        : { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    }
  }
  return u
}

/** Layout box of `node` relative to `root` (offset chain: transforms do not move it). */
function layoutBox(node: HTMLElement, root: Element): { x: number; y: number; w: number; h: number } | undefined {
  if (typeof node.offsetTop !== 'number') return undefined
  let x = 0
  let y = 0
  let n: HTMLElement | null = node
  while (n && n !== root) {
    x += n.offsetLeft
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
    if (n && !root.contains(n) && n !== root) return undefined
  }
  return { x, y, w: node.offsetWidth, h: node.offsetHeight }
}

/** Most common value (1 px buckets). */
function mode(values: number[]): number | undefined {
  const count = new Map<number, number>()
  for (const v of values) count.set(Math.round(v), (count.get(Math.round(v)) ?? 0) + 1)
  let best: number | undefined
  let n = 0
  for (const [v, c] of count) if (c > n) [best, n] = [v, c]
  return best
}

/**
 * Per-element origins for a one-axis grow on its preset's default origin (M1b): bars below the
 * zero line grow down from it. The zero line is the edge most bars of the family share (bottom
 * for columns, left for bars); a bar whose opposite edge sits on it hangs below / left of zero
 * and grows from that edge instead. M3: the axis follows the family's geometry, floating
 * (waterfall) bars grow from the level of the bar before them, and stacked segments grow about
 * the zero line column by column.
 */
function zeroLineOrigins(els: HTMLElement[], pm: ResolvedPartMotion, root: Element): GrowPlan {
  const preset = MOTION_PRESETS[pm.presetId ?? '']
  let vertical = !!pm.keyframes.scaleY
  let horizontal = !!pm.keyframes.scaleX
  const keep: GrowPlan = { origins: els.map(() => pm.origin) }
  if (els.length < 2 || (!vertical && !horizontal) || !preset || pm.origin !== preset.origin) return keep
  const boxes = els.map((e) => layoutBox(e, root))
  if (boxes.some((b) => !b || !(b.w > 0 && b.h > 0))) return keep
  const bs = boxes as { x: number; y: number; w: number; h: number }[]
  // M3: the axis follows the family's geometry. Columns share one width and differ in height,
  // bars of a horizontal chart share one height and differ in width; a chart with an
  // `orientation` option names its bars the same either way, so the recipe cannot know.
  const same = (vs: number[]) => vs.every((v) => Math.abs(v - vs[0]) <= 1)
  let keyframes: MotionKeyframes | undefined
  if (vertical && same(bs.map((b) => b.h)) === false && same(bs.map((b) => b.w)) === false) {
    // neither a column family nor a bar family: leave it as authored
  } else if (vertical && same(bs.map((b) => b.h)) && !same(bs.map((b) => b.w))) {
    vertical = false
    horizontal = true
    keyframes = swapAxis(pm.keyframes, 'x')
  } else if (horizontal && same(bs.map((b) => b.w)) && !same(bs.map((b) => b.h))) {
    vertical = true
    horizontal = false
    keyframes = swapAxis(pm.keyframes, 'y')
  }
  const near = (a: number, b: number) => Math.abs(a - b) <= 1.5
  // Stacked segments (`grow-segments`) scale about the family's zero line, so the segments of one
  // stack grow together as one column (no gaps open between them), and the stacks stagger in
  // column order: every segment of a stack shares its column's slot.
  if (pm.presetId === 'grow-segments') {
    const pct = (v: number) => `${Math.round(v * 100) / 100}%`
    const rank = (vs: number[]) => {
      const keys: number[] = []
      for (const v of [...vs].sort((a, b) => a - b)) if (!keys.some((k) => near(k, v))) keys.push(v)
      return vs.map((v) => keys.findIndex((k) => near(k, v)))
    }
    if (vertical) {
      const zero = mode(bs.map((b) => b.y + b.h))
      if (zero === undefined) return keep
      return { origins: bs.map((b) => `50% ${pct(((zero - b.y) / b.h) * 100)}`), slots: rank(bs.map((b) => b.x)), ...(keyframes ? { keyframes } : {}) }
    }
    const zero = mode(bs.map((b) => b.x))
    if (zero === undefined) return keep
    return { origins: bs.map((b) => `${pct(((zero - b.x) / b.w) * 100)} 50%`), slots: rank(bs.map((b) => b.y)), ...(keyframes ? { keyframes } : {}) }
  }
  // Floating bars (a waterfall step) sit on neither side of the zero line: one that hangs from
  // the level of the bar before it (its top on that bar's top or bottom edge) grows down from
  // there; any other grows from its bottom.
  if (vertical) {
    const zero = mode(bs.map((b) => b.y + b.h))
    const origins = bs.map((b, i) => {
      if (zero === undefined) return '50% 100%'
      if (near(b.y + b.h, zero)) return '50% 100%'
      if (near(b.y, zero) && b.y + b.h > zero + 1) return '50% 0%'
      const prev = i > 0 ? bs[i - 1] : undefined
      if (prev && (near(b.y, prev.y) || near(b.y, prev.y + prev.h)) && !near(b.y + b.h, prev.y)) return '50% 0%'
      return '50% 100%'
    })
    return { origins, ...(keyframes ? { keyframes } : {}) }
  }
  const zero = mode(bs.map((b) => b.x))
  const origins = bs.map((b, i) => {
    if (zero === undefined) return '0% 50%'
    if (near(b.x, zero)) return '0% 50%'
    if (near(b.x + b.w, zero) && b.x < zero - 1) return '100% 50%'
    const prev = i > 0 ? bs[i - 1] : undefined
    if (prev && (near(b.x + b.w, prev.x + prev.w) || near(b.x + b.w, prev.x)) && !near(b.x, prev.x + prev.w)) return '100% 50%'
    return '0% 50%'
  })
  return { origins, ...(keyframes ? { keyframes } : {}) }
}

/** Per-element grow origins, and the family's keyframes when its axis was switched (M3). */
interface GrowPlan {
  origins: (string | undefined)[]
  keyframes?: MotionKeyframes
  /** Stagger slot per element (default: its index); stacked segments share their column's. */
  slots?: number[]
}

/** The same one-axis grow along the other axis (`scaleY` ↔ `scaleX`). */
function swapAxis(kf: MotionKeyframes, to: 'x' | 'y'): MotionKeyframes {
  const out: MotionKeyframes = { ...kf }
  if (to === 'x' && kf.scaleY) {
    out.scaleX = kf.scaleY
    delete out.scaleY
  }
  if (to === 'y' && kf.scaleX) {
    out.scaleY = kf.scaleX
    delete out.scaleX
  }
  return out
}

/** The left-to-right wipe a filled part gets in place of a draw-on (equal four-term insets). */
const DRAW_FALLBACK_WIPE = ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)']

/** CMP3: the inline `stroke-dasharray` a stroke had before a draw-on prepared it (`L L`), so a
 *  replay or a settle restores it instead of reading the prepared value as an authored dash. */
const drawPrepared = new WeakMap<Element, string>()
/** The strokes among them whose draw-on grows a dash pattern (a settle restores the pattern). */
const dashedPrepared = new WeakSet<Element>()

/** Restore what a draw-on wrote on a stroke (its own dash pattern, no offset). */
function restoreStroke(g: Element): void {
  const original = drawPrepared.get(g)
  if (original === undefined) return
  const st = (g as HTMLElement).style
  st.strokeDasharray = original
  st.strokeDashoffset = ''
  drawPrepared.delete(g)
  dashedPrepared.delete(g)
}

/** One stroke a draw-on traces: its length and, for a dashed stroke (CMP3), its dash pattern. */
interface Stroked {
  el: SVGElement
  len: number
  /** The authored dash pattern (px), when the stroke is dashed: the draw grows the pattern. */
  dash?: number[]
}

/**
 * The stroked geometry a draw-on can trace inside `el` (the element itself or its SVG
 * descendants), each with its length; `undefined` when there is none, or when any of it is
 * filled (a stroke draw-on would leave the fill popping in). CMP3: a dashed stroke is traced too
 * (its pattern grows along the path, `dashedDraw`); a pattern a previous draw-on wrote is undone
 * first, so a replay measures the stroke as authored.
 */
function strokedGeometry(el: Element): Stroked[] | undefined {
  const all = [el, ...Array.from(el.querySelectorAll('path, line, polyline, polygon, circle, ellipse'))]
  const geom = all.filter(
    (n) => typeof (n as unknown as { getTotalLength?: unknown }).getTotalLength === 'function'
  ) as SVGElement[]
  if (geom.length === 0 || typeof getComputedStyle !== 'function') return undefined
  const out: Stroked[] = []
  for (const g of geom) {
    restoreStroke(g)
    const cs = getComputedStyle(g)
    const stroked = !!cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth || '1') > 0
    const filled = !!cs.fill && cs.fill !== 'none' && parseFloat(cs.fillOpacity || '1') > 0
    if (!stroked || filled) return undefined
    let dash: number[] | undefined
    if (cs.strokeDasharray && cs.strokeDasharray !== 'none') {
      dash = cs.strokeDasharray.split(/[ ,]+/).map((v) => parseFloat(v)).filter((v) => Number.isFinite(v) && v >= 0)
      if (dash.length === 0 || dash.every((v) => v === 0)) return undefined
      if (dash.length % 2 === 1) dash = [...dash, ...dash]
    }
    let len = 0
    try {
      len = (g as unknown as { getTotalLength(): number }).getTotalLength()
    } catch {
      return undefined
    }
    if (!(len > 0)) return undefined
    out.push({ el: g, len, ...(dash ? { dash } : {}) })
  }
  return out
}

/**
 * CMP3 — the dash array that shows the first `progress` of a dashed stroke `len` long: the
 * pattern repeated up to `progress × len`, then one gap over the rest. At 1 → the pattern itself.
 */
export function dashedDraw(dash: number[], len: number, progress: number): string {
  if (progress >= 1) return dash.join(' ')
  const shown = Math.max(0, progress) * len
  const out: number[] = []
  let at = 0
  for (let i = 0; at < shown && out.length < 4000; i++) {
    const seg = dash[i % dash.length]
    // the last dash (or gap) is cut where the drawn length ends
    out.push(Math.min(seg, shown - at))
    at += seg
  }
  // An odd count ends on a dash: close with the gap over the rest (an even count ends on a gap:
  // lengthen it).
  if (out.length % 2 === 1) out.push(len + 1)
  else if (out.length > 0) out[out.length - 1] += len + 1
  else out.push(0, len + 1)
  return out.map((v) => Math.round(v * 100) / 100).join(' ')
}

/**
 * What one part element plays (M1/S14).
 *
 * - A preset with `strokeDashoffset` (draw-path, sweep, the draw step of the chained presets)
 *   used to tween `100%` → `0%` on an element with no dash array, which draws nothing. Now a
 *   stroked part is drawn on for real: each path gets `stroke-dasharray: L L` and its
 *   `stroke-dashoffset` tweens L → 0 (L = its measured length). A filled or non-SVG part is
 *   wiped in left to right with an equal-term clip instead.
 * - Every other preset plays on the element itself, scaling about the part's origin.
 */
function partPlays(
  partEl: HTMLElement,
  pm: ResolvedPartMotion,
  origin: string | undefined,
  centre: { x: number; y: number } | undefined
): PartPlay[] {
  const kf = pm.keyframes
  if (!kf.strokeDashoffset) return [{ target: partEl, keyframes: kf, origin }]
  const rest: MotionKeyframes = { ...kf }
  delete rest.strokeDashoffset
  const strokes = strokedGeometry(partEl)
  if (!strokes) {
    // M1b: a filled `sweep` part (pie slice, donut segment) is revealed by a sector growing
    // clockwise from 12 o'clock about the family's common centre; other fills wipe in.
    const r = partEl.getBoundingClientRect()
    if (pm.presetId === 'sweep' && centre && r.width > 0 && r.height > 0) {
      const rect = { left: r.left, top: r.top, width: r.width, height: r.height }
      return [{ target: partEl, keyframes: rest, origin, sweep: { cx: centre.x, cy: centre.y, rect, start: pm.sweep?.startAngle ?? 0, turn: pm.sweep?.sweepAngle ?? 360 } }]
    }
    return [{ target: partEl, keyframes: { ...rest, clipPath: DRAW_FALLBACK_WIPE }, origin }]
  }
  const plays: PartPlay[] = strokes.map(({ el, len, dash }) => {
    drawPrepared.set(el, el.style.strokeDasharray)
    if (dash) dashedPrepared.add(el)
    if (dash) return { target: el, keyframes: {}, dashed: { dash, len } }
    el.style.strokeDasharray = `${len} ${len}`
    return { target: el, keyframes: { strokeDashoffset: [String(len), '0'] } }
  })
  if (Object.keys(rest).length > 0) plays.push({ target: partEl, keyframes: rest, origin: pm.origin })
  return plays
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cssEscapeAttr(s: string): string {
  return s.replace(/["\\]/g, '\\$&')
}

// --- CMP3: nested motion and the stagger cap -----------------------------------

/** T2 (05-motion §5.4, SURVEY T2): one indexed family's whole stagger lasts at most this long; a
 *  longer list steps faster instead of trailing on. */
export const STAGGER_CAP_MS = 300

/** The per-item step of an indexed family of `count` elements under the cap. */
export function cappedStagger(step: number, count: number): number {
  if (!(step > 0) || count < 2) return Math.max(0, step || 0)
  return Math.min(step, STAGGER_CAP_MS / (count - 1))
}

/** Definitions every `BlockRegistry` registered (nested motion resolves a child's recipe here:
 *  the viewer passes `playBlockReveal` only the container's definition). */
const knownDefinitions = new Map<string, BlockDefinition>()

/** Called by `BlockRegistry.register`. */
export function rememberBlockDefinition(def: BlockDefinition): void {
  knownDefinitions.set(def.type, def)
}

/** The part presets a nested child plays inside its container (its "own" choreography): data and
 *  draw reveals. A child's plain fades are left to the container's stagger. */
export const NESTED_PART_PRESETS: ReadonlySet<string> = new Set([
  'count-up',
  'sweep',
  'draw-path',
  'grow-bars-x',
  'grow-bars-y',
  'grow-segments',
  'sweep-nodes',
  'pop-points',
  'wipe-x',
  'wipe-y',
  'wipe-down',
])

/** Ids of the blocks authored inside `spec` (every `blocks`-kind prop, depth first). */
export function authoredChildIds(spec: BlockSpec, out = new Set<string>(), depth = 0): Set<string> {
  if (depth > 8 || !spec || typeof spec !== 'object') return out
  const props = spec.props
  if (!props || typeof props !== 'object') return out
  for (const v of Object.values(props)) {
    if (!Array.isArray(v)) continue
    for (const c of v) {
      if (!c || typeof c !== 'object' || typeof (c as BlockSpec).type !== 'string') continue
      if (typeof (c as BlockSpec).id === 'string') out.add((c as BlockSpec).id)
      authoredChildIds(c as BlockSpec, out, depth + 1)
    }
  }
  return out
}

/** Does the block play its recipe's showy preset (the condition `partMotion` plays under)? */
function playsShowy(spec: BlockSpec, def: BlockDefinition): boolean {
  const showy = def.motion.expressive ?? def.motion.preset
  const preset = spec.motion?.preset ?? def.motion.preset ?? 'fade'
  return !!showy && showy !== 'none' && preset === showy && spec.motion?.preset !== 'fade'
}

/** One nested child's part motions that play inside the container: the wrapper element, its
 *  definition and the parts (its `NESTED_PART_PRESETS` under its own showy preset). */
interface NestedPlan {
  wrapper: HTMLElement
  parts: ResolvedPartMotion[]
}

/**
 * CMP3 (F11) — the authored children of a container (`props.children`, any depth) whose own recipe
 * has a data or draw reveal: a hero number counting up inside a card, a ring sweeping inside a bento
 * tile. Only while the container plays its showy preset (expressive), never under `fade` (subtle),
 * reduced motion or a static slide. A child's wrapper is the group the engine stamped with its id
 * (`data-nested-id`, CMP1 X2); the child's definition comes from the registered definitions.
 */
function nestedPlans(el: HTMLElement, spec: BlockSpec, def: BlockDefinition): NestedPlan[] {
  if (!playsShowy(spec, def) || typeof el.querySelectorAll !== 'function') return []
  const ids = authoredChildIds(spec)
  if (ids.size === 0) return []
  const out: NestedPlan[] = []
  for (const wrapper of Array.from(el.querySelectorAll<HTMLElement>('[data-nested-id]'))) {
    if (!ids.has(wrapper.getAttribute('data-nested-id') ?? '')) continue
    const child = knownDefinitions.get(wrapper.getAttribute('data-nested-type') ?? '')
    if (!child || child.kind === 'html' || !child.motion) continue
    const showy = child.motion.expressive ?? child.motion.preset
    if (!showy || showy === 'none') continue
    const parts = resolvePartMotion({ preset: showy }, child.motion).filter((pm) => !!pm.presetId && NESTED_PART_PRESETS.has(pm.presetId) && !pm.isAmbient)
    if (parts.length) out.push({ wrapper, parts })
  }
  return out
}

// --- Public API ---------------------------------------------------------------

/**
 * Play a block's reveal animation — both block-level (the container entering) and
 * part-level (per-part stagger, count-up, draw-path, etc.) choreography.
 *
 * @param el  The block's root DOM element (the positioned `<div>` that wraps it).
 * @param spec The block instance's spec (from `shapeToBlock(shape)`).
 * @param def  The block definition (from `registry.get(type)`).
 * @param ctx  Runtime context: driver + reduced-motion flag.
 */
export function playBlockReveal(
  el: HTMLElement,
  spec: BlockSpec,
  def: BlockDefinition,
  ctx: PlayBlockRevealContext
): void {
  const { driver, reducedMotion } = ctx

  // 1. Resolve block-level and part-level motion.
  const blockMotion = resolveBlockMotion(spec.motion, def.motion)
  const partMotions = resolvePartMotion(spec.motion, def.motion)

  // 2. Reduced motion or no effect → set visible state immediately, no animation.
  if (reducedMotion || blockMotion.effect === null) {
    driver.set(el, blockVisibleState(blockMotion.effect ?? undefined))
    settleBlockParts(el, spec, def, driver)
    return
  }
  const token = (revealTokens.get(el) ?? 0) + 1
  revealTokens.set(el, token)

  // 3. Set hidden state on ALL parts synchronously, before the block becomes visible.
  //    Parts are children of `el`, so they're invisible while the block is at opacity: 0.
  //    Measure before anything is hidden (a scale of 0 would change the rects).
  const planned = partMotions.map((pmIn) => {
    const { els, indexed } = partElements(el, pmIn.partName)
    const grow = zeroLineOrigins(els, pmIn, el)
    const origins = grow.origins
    const pm = grow.keyframes ? { ...pmIn, keyframes: grow.keyframes } : pmIn
    const u = pm.presetId === 'sweep' ? paintedUnion(els) : undefined
    // M6: the sweep's centre as a fraction of the painted box (a top half-ring: 50% 100%)
    const [fx, fy] = (pm.sweep?.centre ?? '50% 50%').split(/\s+/).map((v) => (parseFloat(v) || 0) / 100)
    const centre = u ? { x: u.left + (u.right - u.left) * fx, y: u.top + (u.bottom - u.top) * (fy ?? 0.5) } : undefined
    return {
      pm,
      indexed,
      slots: grow.slots,
      els: els.map((partEl, i) => ({
        partEl,
        // count-up keeps its own textContent tween on the part element (step 6)
        plays: pm.presetId === 'count-up' && countTarget(partEl) ? [] : partPlays(partEl, pm, origins[i], centre),
      })),
    }
  })
  // CMP3 (F11): nested children's own data / draw reveals play inside the container's stagger —
  // each starts with the container part that carries the child (its wrapper or the nearest planned
  // ancestor), plus the child's own part delay. Elements the container already plays are left to it.
  const startOf = new Map<Element, number>()
  for (const { pm, els: planEls, indexed, slots } of planned) {
    const step = indexed ? cappedStagger(pm.staggerMs ?? 0, planEls.length) : 0
    planEls.forEach(({ partEl }, i) => startOf.set(partEl, pm.delayMs + (indexed ? (slots?.[i] ?? i) * step : 0)))
  }
  for (const nest of nestedPlans(el, spec, def)) {
    let base = blockMotion.delayMs
    for (let a: Element | null = nest.wrapper; a && a !== el; a = a.parentElement) {
      const t = startOf.get(a)
      if (t !== undefined) {
        base = t
        break
      }
    }
    for (const pmIn of nest.parts) {
      const found = partElements(nest.wrapper, pmIn.partName)
      const els = found.els.filter((e) => !startOf.has(e))
      if (els.length === 0) continue
      const pm: ResolvedPartMotion = { ...pmIn, delayMs: base + pmIn.delayMs }
      const grow = zeroLineOrigins(els, pm, el)
      const pmG = grow.keyframes ? { ...pm, keyframes: grow.keyframes } : pm
      const u = pmG.presetId === 'sweep' ? paintedUnion(els) : undefined
      const [fx, fy] = (pmG.sweep?.centre ?? '50% 50%').split(/\s+/).map((v) => (parseFloat(v) || 0) / 100)
      const centre = u ? { x: u.left + (u.right - u.left) * fx, y: u.top + (u.bottom - u.top) * (fy ?? 0.5) } : undefined
      planned.push({
        pm: pmG,
        indexed: found.indexed,
        slots: grow.slots,
        els: els.map((partEl, i) => ({
          partEl,
          plays: pmG.presetId === 'count-up' && countTarget(partEl) ? [] : partPlays(partEl, pmG, grow.origins[i], centre),
        })),
      })
      els.forEach((e) => startOf.set(e, pm.delayMs))
    }
  }

  for (const { pm, els } of planned) {
    for (const { partEl, plays } of els) {
      if (plays.length === 0) driver.set(partEl, hiddenStateFromKeyframes(pm.keyframes))
      for (const p of plays) {
        const hidden = hiddenStateFromKeyframes(p.keyframes)
        if (p.sweep) {
          sweepHandles.get(p.target)?.cancel()
          hidden.clipPath = sectorClip(p.sweep.cx, p.sweep.cy, p.sweep.rect, 0, p.sweep.start, p.sweep.turn)
        }
        if (p.dashed) {
          sweepHandles.get(p.target)?.cancel()
          ;(p.target as HTMLElement).style.strokeDasharray = dashedDraw(p.dashed.dash, p.dashed.len, 0)
        }
        if (Object.keys(hidden).length > 0) driver.set(p.target, hidden)
      }
    }
  }

  // 4. Set hidden state on the block container.
  driver.set(el, blockHiddenState(blockMotion.effect))

  // 5. Build block-level keyframes and play. Easing now comes from the resolved motion
  //    (spec/definition/preset), so a persisted shape easing reaches the driver.
  const blockKeyframes = blockEntranceKeyframes(blockMotion.effect)

  driver.play(el, blockKeyframes, {
    duration: blockMotion.durationMs,
    delay: blockMotion.delayMs,
    easing: blockMotion.easing,
    fill: 'forwards',
  })

  // 6. Play part-level animations with stagger.
  for (const { pm, els: planEls, indexed, slots } of planned) {
    planEls.forEach(({ partEl, plays }, elementIndex) => {
      // P7: indexed elements of one part stagger by the preset's step (exact matches keep
      // the part's own delay, as before). M3: stacked segments stagger by column.
      // CMP3 (T2): the family's whole stagger is capped (`STAGGER_CAP_MS`).
      const fullDelay = pm.delayMs + (indexed ? (slots?.[elementIndex] ?? elementIndex) * cappedStagger(pm.staggerMs ?? 0, planEls.length) : 0)
      // M6 (E-M5-1): an image part waits (hidden) until its image is decoded, at most
      // IMAGE_WAIT_MS, so a photo never pops in at 0.7–1.0 opacity after its fade; the wait is
      // taken out of its delay. A newer reveal or settle of the block cancels the late start.
      const pending = pendingImages(partEl as HTMLElement)
      if (pending.length > 0) {
        const t0 = Date.now()
        void imagesReady(pending, IMAGE_WAIT_MS).then(() => {
          if (!partEl.isConnected || revealTokens.get(el) !== token) return
          startPart(Math.max(0, fullDelay - (Date.now() - t0)))
        })
        return
      }
      startPart(fullDelay)

      function startPart(delay: number): void {
        // Count-up: intercept onUpdate to tween textContent.
        // P7: count on the single text leaf inside the part (a one-line text part renders as
        // part > line div). A label with no digit ("Adoption" used to become "Adoption0Adoption")
        // and a part with several children (a tile group, a wrapped paragraph) are never rewritten,
        // and the last frame restores the exact original text ("1,250" would otherwise end "1250").
        const countEl = countTarget(partEl as HTMLElement)
        if (pm.presetId === 'count-up' && countEl) {
          const targetText = countEl.textContent ?? '0'
          const format = countFormat(targetText)
          // M3: tabular figures while counting, so the digits do not change width every frame
          // (Inter's "1" is two thirds of an "8"); the last frame restores the authored style. It is
          // set on the part element (it inherits), so no other element is touched.
          const host = partEl as HTMLElement
          const numeric = host.style.fontVariantNumeric
          host.style.fontVariantNumeric = 'tabular-nums'

          // The entrance plays on the part; the count runs on a detached proxy (M1b) so settling
          // the part (an opacity/scale set, which stops the part's tweens) cannot freeze the
          // number half-way: the proxy always reaches its last frame and restores the text.
          driver.play(partEl as HTMLElement, pm.keyframes, {
            duration: pm.durationMs,
            delay,
            easing: pm.easing,
            fill: 'forwards',
          })
          const counter = typeof document !== 'undefined' ? document.createElement('div') : (partEl as HTMLElement)
          driver.play(counter, { opacity: [0, 1] }, {
            duration: pm.durationMs,
            delay,
            easing: pm.easing,
            fill: 'forwards',
            onUpdate: (progress: number) => {
              if (progress >= 1) {
                countEl.textContent = targetText
                host.style.fontVariantNumeric = numeric
                if (!host.getAttribute('style')) host.removeAttribute('style')
                return
              }
              countEl.textContent = format(progress)
            },
          })
        } else {
          for (const p of plays) {
            if (Object.keys(p.keyframes).length > 0) {
              driver.play(p.target, p.keyframes, {
                duration: pm.durationMs,
                delay,
                easing: pm.easing,
                fill: 'forwards',
                ...(p.origin ? { origin: p.origin } : {}),
              })
            }
            if (p.dashed) {
              // CMP3: a dash pattern cannot be tweened as a pair either: a detached proxy carries
              // the eased progress and each frame writes the grown pattern; the last frame (and a
              // settle) puts the authored pattern back.
              const { dash, len } = p.dashed
              const target = p.target as HTMLElement
              const proxy = typeof document !== 'undefined' ? document.createElement('div') : target
              const handle = driver.play(proxy, { opacity: [0, 1] }, {
                duration: pm.durationMs,
                delay,
                easing: pm.easing,
                fill: 'forwards',
                onUpdate: (progress: number) => {
                  if (progress >= 1) restoreStroke(target)
                  else target.style.strokeDasharray = dashedDraw(dash, len, progress)
                },
              })
              sweepHandles.set(target, handle)
            }
            if (p.sweep) {
              // The sector is not a keyframe pair any interpolator can tween, so a detached proxy
              // carries the eased progress and each frame writes the sector. Settling the part
              // (opacity/translate/scale sets) cannot kill it; its last frame removes the clip.
              const { cx, cy, rect, start, turn } = p.sweep
              const target = p.target as HTMLElement
              const proxy = typeof document !== 'undefined' ? document.createElement('div') : target
              const handle = driver.play(proxy, { opacity: [0, 1] }, {
                duration: pm.durationMs,
                delay,
                easing: pm.easing,
                fill: 'forwards',
                onUpdate: (progress: number) => {
                  target.style.clipPath = sectorClip(cx, cy, rect, progress, start, turn)
                },
              })
              sweepHandles.set(target, handle)
            }
          }
        }
      }
    })
  }
}

// --- M6: images and settling --------------------------------------------------------------

/** Longest an image part waits for its image before its entrance starts anyway. */
export const IMAGE_WAIT_MS = 600

/** Reveal generation per block element: a late (image-delayed) start of an older reveal or of a
 *  settled block must not play. */
const revealTokens = new WeakMap<Element, number>()

/** The images under (or at) `el` that have not finished loading. A broken image counts as
 *  finished (`complete`), so it never holds an entrance. */
function pendingImages(el: HTMLElement): HTMLImageElement[] {
  const imgs = el.tagName === 'IMG' ? [el as HTMLImageElement] : Array.from(el.querySelectorAll('img'))
  return imgs.filter((i) => !i.complete)
}

/** Resolves when every image is decoded (or failed), or after `timeoutMs`. */
function imagesReady(imgs: HTMLImageElement[], timeoutMs: number): Promise<void> {
  const each = imgs.map((img) =>
    typeof img.decode === 'function'
      ? img.decode().catch(() => undefined)
      : new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        })
  )
  return Promise.race([Promise.all(each).then(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))])
}

/**
 * Settle every recipe part of a block to its rest state at once (M6): what a skip mid-chain,
 * an already-revealed step and reduced motion show. Opacity, translate and scale (both axes);
 * a part that clips (a wipe, the draw fallback, a running sweep) loses its clip; a drawn path
 * gets offset 0. Running sweep proxies and image-delayed starts are cancelled.
 */
export function settleBlockParts(el: HTMLElement, spec: BlockSpec, def: BlockDefinition, driver: MotionDriver): void {
  revealTokens.set(el, (revealTokens.get(el) ?? 0) + 1)
  // CMP3: the nested children's parts a reveal may have hidden settle too.
  const groups: Array<{ root: HTMLElement; pms: ResolvedPartMotion[] }> = [{ root: el, pms: resolvePartMotion(spec.motion, def.motion) }]
  for (const nest of nestedPlans(el, spec, def)) groups.push({ root: nest.wrapper, pms: nest.parts })
  for (const { root, pms } of groups) for (const pm of pms) {
    const kf = pm.keyframes
    for (const partEl of partElements(root, pm.partName).els) {
      sweepHandles.get(partEl)?.cancel()
      sweepHandles.delete(partEl)
      const state: MotionState = { opacity: 1, translate: '0px 0px', scale: 1 }
      if (kf.scaleX || kf.scaleY) {
        state.scaleX = 1
        state.scaleY = 1
      }
      if (kf.clipPath || kf.strokeDashoffset || partEl.style.clipPath) state.clipPath = 'none'
      driver.set(partEl, state)
      for (const g of [partEl, ...Array.from(partEl.querySelectorAll<SVGElement>('path, line, polyline, polygon, circle, ellipse'))]) {
        sweepHandles.get(g)?.cancel()
        sweepHandles.delete(g)
        if ((g as HTMLElement).style?.strokeDasharray) driver.set(g, { strokeDashoffset: '0' })
        // CMP3: a dashed draw-on cut short gets its authored pattern back
        if (dashedPrepared.has(g)) restoreStroke(g)
      }
    }
  }
}
