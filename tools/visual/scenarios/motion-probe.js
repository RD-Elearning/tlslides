/* eslint-disable no-console */
/**
 * Motion probe — frame-by-frame recording of a viewer slide's entrance, plus the J1–J8 verdicts
 * of reviews/blocks/block-review/MOTION.md §1. Used by the `motion` pass of block-review.js.
 *
 * In the page (`installSampler`): a requestAnimationFrame loop records, for every tracked element
 * of the current slide, its effective opacity (own × ancestors up to the slide), translate x/y and
 * scale (from the computed transform plus the individual `translate`/`scale` properties), the
 * visible fraction left by its own and its ancestors' clip-paths, and its stroke-dashoffset progress. Tracked elements are
 * every block wrapper (`[data-shape-id]`), every `[data-part]`, and any other element whose inline
 * style the driver writes (found by a MutationObserver, which also logs the CSS property names
 * that change: J4). WAAPI/CSS animations are logged through `document.getAnimations()`.
 *
 * In node (`verdicts`): the samples become per-criterion verdicts with the worst offender.
 * No video, no per-frame PNG.
 */

/** Installs `window.__mp` (idempotent). Runs in the page. */
function installSampler() {
  if (window.__mp) return
  const VIS = 0.05
  const mp = {
    on: false,
    slideId: null,
    frames: [],
    els: [],
    extra: new Set(),
    props: {},
    attrs: {},
    waapi: {},
    added: 0,
    lastChange: 0,
    prev: null,
  }
  window.__mp = mp

  const slideEl = () => document.querySelector('[data-testid="deck-viewer-slide"]')

  // Elements are keyed by block + part + occurrence, not by node identity, so a block that
  // React remounts mid-run (dev StrictMode, a settle epoch) keeps one series.
  const keyIds = new Map()
  const TRACKED = '[data-part], [data-shape-id]'
  /** Does `el` paint anything itself (background, border, shadow, text, an image, an SVG shape),
   *  not counting tracked descendants (they have their own series)? M1b/E3. */
  function ownPaint(el, depth = 0) {
    if (depth > 6) return false
    const tag = el.tagName.toLowerCase()
    if (['img', 'canvas', 'video', 'path', 'line', 'polyline', 'polygon', 'circle', 'ellipse', 'rect', 'text', 'image', 'use'].includes(tag)) return true
    const cs = getComputedStyle(el)
    const bg = cs.backgroundColor
    if ((bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) || (cs.backgroundImage && cs.backgroundImage !== 'none')) return true
    if (['Top', 'Right', 'Bottom', 'Left'].some((d) => parseFloat(cs['border' + d + 'Width']) > 0 && cs['border' + d + 'Style'] !== 'none')) return true
    if (cs.boxShadow && cs.boxShadow !== 'none') return true
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) return true
      // M6/A3: a child the driver animates is tracked on its own, and one that is invisible now
      // (a from-state) is not what this element paints
      if (n.nodeType === 1 && !n.matches(TRACKED) && !mp.extra.has(n) && Number(getComputedStyle(n).opacity) >= 0.05 && ownPaint(n, depth + 1)) return true
    }
    return false
  }

  function register(el, seen, idOfEl) {
    const wrap = el.closest('[data-shape-id]')
    const block = wrap ? wrap.getAttribute('data-block-id') : null
    const part = el.hasAttribute('data-shape-id') ? '(block)' : el.getAttribute('data-part') || `<${el.tagName.toLowerCase()}>`
    const base = `${block}|${part}`
    const n = seen.get(base) || 0
    seen.set(base, n + 1)
    const key = `${base}|${n}`
    let id = keyIds.get(key)
    if (id === undefined) {
      id = mp.els.length
      keyIds.set(key, id)
      // nearest tracked ancestor (registered earlier this frame: document order)
      let parent = null
      for (let a = el.parentElement; a; a = a.parentElement) {
        if (idOfEl.has(a)) { parent = idOfEl.get(a); break }
      }
      mp.els.push({ block, part, n, svg: el instanceof SVGElement, paint: ownPaint(el), parent })
    }
    idOfEl.set(el, id)
    return id
  }

  function parseStyle(s) {
    const out = {}
    if (!s) return out
    for (const d of s.split(';')) {
      const i = d.indexOf(':')
      if (i > 0) out[d.slice(0, i).trim()] = d.slice(i + 1).trim()
    }
    return out
  }

  const mo = new MutationObserver((list) => {
    if (!mp.on) return
    for (const m of list) {
      const el = m.target
      if (m.type === 'childList') {
        mp.added += m.addedNodes.length
        continue
      }
      if (m.type !== 'attributes' || !(el instanceof Element)) continue
      const sl = el.closest('[data-testid="deck-viewer-slide"]')
      if (!sl || sl.getAttribute('data-slide-id') !== mp.slideId) continue
      if (m.attributeName === 'style') {
        const a = parseStyle(m.oldValue)
        const b = parseStyle(el.getAttribute('style'))
        // M1b/E4: the CSSOM re-serialises numbers (452.333333px -> 452.333px) the first time a
        // tween writes the style; compare with the numbers rounded, not as strings.
        // M6/A5: and `0` vs `0px` (inset:0 is re-serialised as inset: 0px): px units dropped
        const norm = (v) => (v === undefined ? v : v.replace(/(\d)px\b/g, '$1').replace(/-?\d*\.?\d+(e-?\d+)?/g, (x) => String(Math.round(parseFloat(x) * 100) / 100)))
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
          if (norm(a[k]) !== norm(b[k])) mp.props[k] = (mp.props[k] || 0) + 1
        }
        if (!el.hasAttribute('data-part') && !el.hasAttribute('data-shape-id')) mp.extra.add(el)
      } else if (m.attributeName !== 'class' && !m.attributeName.startsWith('data-')) {
        mp.attrs[m.attributeName] = (mp.attrs[m.attributeName] || 0) + 1
      }
    }
  })
  mo.observe(document, { subtree: true, attributes: true, attributeOldValue: true, childList: true })

  function size(el) {
    if (el instanceof SVGGraphicsElement) {
      try {
        const b = el.getBBox()
        return [b.width || 1, b.height || 1]
      } catch (e) {
        return [1, 1]
      }
    }
    return [el.offsetWidth || 1, el.offsetHeight || 1]
  }
  const len = (v, ref) => (String(v).endsWith('%') ? (parseFloat(v) / 100) * ref : parseFloat(v) || 0)

  /** Fraction of the element's box a clip-path leaves visible (1 = no clip). */
  function clipFraction(cp, el) {
    if (!cp || cp === 'none') return 1
    const [w, h] = size(el)
    let m = cp.match(/^inset\(([^)]*)\)/)
    if (m) {
      const t = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/)
      const top = t[0]
      const right = t[1] ?? top
      const bottom = t[2] ?? top
      const left = t[3] ?? right
      const fx = Math.max(0, 1 - (len(left, w) + len(right, w)) / w)
      const fy = Math.max(0, 1 - (len(top, h) + len(bottom, h)) / h)
      return fx * fy
    }
    m = cp.match(/^circle\(\s*([\d.]+(?:px|%)?)/)
    if (m) {
      const r = len(m[1], Math.hypot(w, h) / Math.SQRT2)
      return Math.min(1, (Math.PI * r * r) / (w * h))
    }
    m = cp.match(/^polygon\(([^)]*)\)/)
    if (m) {
      const pts = m[1].split(',').map((p) => {
        const [x, y] = p.trim().split(/\s+/)
        return [len(x, w), len(y, h)]
      })
      // Fraction of the box inside the polygon (a sweep sector reaches far outside the box, so
      // its raw area says nothing): point-in-polygon on a 24 x 24 grid.
      const inside = (x, y) => {
        let c = false
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i]
          const [xj, yj] = pts[j]
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) c = !c
        }
        return c
      }
      const N = 24
      let hit = 0
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (inside(((i + 0.5) / N) * w, ((j + 0.5) / N) * h)) hit++
      return hit / (N * N)
    }
    return 1
  }

  function transformOf(cs) {
    let tx = 0
    let ty = 0
    let sx = 1
    let sy = 1
    const t = cs.transform
    if (t && t !== 'none') {
      const n = t.slice(t.indexOf('(') + 1, -1).split(',').map(Number)
      if (t.startsWith('matrix3d')) {
        tx = n[12]
        ty = n[13]
        sx = Math.hypot(n[0], n[1])
        sy = Math.hypot(n[4], n[5])
      } else {
        tx = n[4]
        ty = n[5]
        sx = Math.hypot(n[0], n[1])
        sy = Math.hypot(n[2], n[3])
      }
    }
    if (cs.translate && cs.translate !== 'none') {
      const p = cs.translate.split(/\s+/)
      tx += parseFloat(p[0]) || 0
      ty += parseFloat(p[1]) || 0
    }
    if (cs.scale && cs.scale !== 'none') {
      const p = cs.scale.split(/\s+/).map(Number)
      sx *= p[0]
      sy *= p[1] ?? p[0]
    }
    return [tx, ty, sx, sy]
  }

  function dashProgress(cs) {
    const da = cs.strokeDasharray
    if (!da || da === 'none') return 1
    const total = parseFloat(da) || 0
    if (!total) return 1
    const off = Math.abs(parseFloat(cs.strokeDashoffset) || 0)
    return Math.max(0, Math.min(1, 1 - off / total))
  }

  function frame(now) {
    if (!mp.on) return
    const sl = slideEl()
    if (sl && sl.getAttribute('data-slide-id') === mp.slideId) {
      const v = document.querySelector('[data-testid="deck-viewer"]')
      // Effective opacity and clip: own value times every ancestor's up to the slide (a part
      // inside a clipped-out or transparent wrapper is not visible, whatever its own values).
      const opCache = new Map()
      const clipCache = new Map()
      const effOpacity = (el) => {
        if (!el || el === sl) return 1
        if (opCache.has(el)) return opCache.get(el)
        const o = Number(getComputedStyle(el).opacity) * effOpacity(el.parentElement)
        opCache.set(el, o)
        return o
      }
      const ancClip = (el) => {
        if (!el || el === sl) return 1
        if (clipCache.has(el)) return clipCache.get(el)
        const c = clipFraction(getComputedStyle(el).clipPath, el) * ancClip(el.parentElement)
        clipCache.set(el, c)
        return c
      }
      const els = [...sl.querySelectorAll('[data-shape-id], [data-part]'), ...[...mp.extra].filter((e) => e.isConnected && sl.contains(e) && e !== sl)]
      const row = {}
      const seen = new Map()
      const idOfEl = new Map()
      let changed = false
      for (const el of els) {
        const id = register(el, seen, idOfEl)
        const cs = getComputedStyle(el)
        const [tx, ty, sx, sy] = transformOf(cs)
        const vals = [
          +effOpacity(el).toFixed(4),
          +tx.toFixed(2),
          +ty.toFixed(2),
          +sx.toFixed(4),
          +sy.toFixed(4),
          +(clipFraction(cs.clipPath, el) * ancClip(el.parentElement)).toFixed(4),
          +dashProgress(cs).toFixed(4),
          // M6/A2: the element's own opacity and clip (without its ancestors'), so its own motion
          // can be told from a wrapper fade around it
          +Number(cs.opacity).toFixed(4),
          +clipFraction(cs.clipPath, el).toFixed(4),
        ]
        row[id] = vals
        const p = mp.prev && mp.prev[id]
        if (!p || p.some((x, i) => Math.abs(x - vals[i]) > 0.002)) {
          changed = true
          if (p && mp.blockStart === null && mp.blockId && mp.els[id].block === mp.blockId) mp.blockStart = now - mp.t0
        }
      }
      if (changed) mp.lastChange = performance.now()
      mp.prev = row
      mp.frames.push({ t: +now.toFixed(1), step: Number(v.getAttribute('data-build-step')), steps: Number(v.getAttribute('data-build-step-count')), row })
      if (document.getAnimations) {
        for (const a of document.getAnimations()) {
          const kf = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : []
          for (const k of kf) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) mp.waapi[p] = (mp.waapi[p] || 0) + 1
        }
      }
    }
    requestAnimationFrame(frame)
  }

  mp.start = (slideId, blockId) => {
    mp.on = true
    mp.slideId = slideId
    mp.blockId = blockId || null
    mp.blockStart = null
    mp.frames = []
    mp.els = []
    keyIds.clear()
    mp.extra = new Set()
    mp.props = {}
    mp.attrs = {}
    mp.waapi = {}
    mp.added = 0
    mp.prev = null
    mp.lastChange = performance.now()
    mp.t0 = performance.now()
    requestAnimationFrame(frame)
  }
  mp.status = () => ({ frames: mp.frames.length, quietMs: performance.now() - mp.lastChange, sinceStart: performance.now() - mp.t0, blockStart: mp.blockStart })
  mp.stop = () => {
    mp.on = false
    return { frames: mp.frames, els: mp.els, props: mp.props, attrs: mp.attrs, waapi: mp.waapi, added: mp.added, t0: mp.t0 }
  }
  void VIS
}

// --- verdicts (node) ----------------------------------------------------------

const VIS = 0.05
const CH = { op: 0, tx: 1, ty: 2, sx: 3, sy: 4, clip: 5, dash: 6, oop: 7, oclip: 8 }
const EPS = [0.004, 0.3, 0.3, 0.003, 0.003, 0.004, 0.004, 0.004, 0.004]
/** Channels the element moves itself (not inherited from a wrapper). */
const OWN = [CH.tx, CH.ty, CH.sx, CH.sy, CH.dash, CH.oop, CH.oclip]
const NON_COMPOSITOR = /^(width|height|top|left|right|bottom|font-size|font|line-height|margin.*|padding.*|inset|border.*width|letter-spacing)$/
const NON_COMPOSITOR_ATTR = /^(x|y|width|height|r|cx|cy|rx|ry|d|points|x1|x2|y1|y2)$/

const visible = (v) => v[CH.op] > VIS && v[CH.clip] > 0.01 && v[CH.sx] > 0.02 && v[CH.sy] > 0.02 && v[CH.dash] > 0.01
const atRest = (v) => v[CH.op] >= 0.99 && Math.abs(v[CH.tx]) < 0.5 && Math.abs(v[CH.ty]) < 0.5 && Math.abs(v[CH.sx] - 1) < 0.005 && Math.abs(v[CH.sy] - 1) < 0.005 && v[CH.clip] >= 0.999 && v[CH.dash] >= 0.999
const differs = (a, b) => a.some((x, i) => b[i] !== undefined && Math.abs(x - b[i]) > EPS[i])
const ownDiffers = (a, b) => OWN.some((i) => a[i] !== undefined && b[i] !== undefined && Math.abs(a[i] - b[i]) > EPS[i])
const fam = (p) => p.replace(/\/\d+/g, '/*').replace(/\[\d+\]/g, '[*]')

/**
 * M1b/E3 — per frame, does the element show anything: visible itself and either painting itself
 * or holding a visible descendant that does. A wrapper or `root` that turns opaque while every
 * part inside is still hidden shows nothing, so its jump is not a snap.
 */
function contentVisible(rec) {
  const kids = rec.els.map(() => [])
  rec.els.forEach((e, k) => {
    if (e.parent !== null && e.parent !== undefined) kids[e.parent].push(k)
  })
  // children have larger ids than their parents (registered later), so walk ids downwards
  return rec.frames.map((fr) => {
    const cv = {}
    const ids = Object.keys(fr.row).map(Number).sort((a, b) => b - a)
    for (const k of ids) {
      const own = visible(fr.row[k])
      cv[k] = own && (rec.els[k].paint !== false || kids[k].some((c) => cv[c]))
    }
    return cv
  })
}

/** Per-element series: [{f, t, v}] for frames where the element exists. */
function series(rec) {
  const out = rec.els.map(() => [])
  rec.frames.forEach((fr, f) => {
    for (const k of Object.keys(fr.row)) out[k].push({ f, t: fr.t, v: fr.row[k] })
  })
  return out
}

/** Maximal runs of consecutive frames in which the element changed. */
function runs(s) {
  const out = []
  let cur = null
  for (let i = 1; i < s.length; i++) {
    if (differs(s[i].v, s[i - 1].v)) {
      if (cur && cur.end === i - 1) cur.end = i
      else out.push((cur = { start: i, end: i }))
    }
  }
  return out
}

/**
 * Verdicts for one recorded slide.
 * @param rec   what `__mp.stop()` returned
 * @param opts  { blockId, scope: 'element'|'slide', style: 'static'|'subtle'|'expressive'|'reduced',
 *                ref?: restFrame() of the block's static recording (J3 compares against it) }
 */
function verdicts(rec, opts) {
  const { blockId, scope, style, ref } = opts
  const S = series(rec)
  const CV = contentVisible(rec)
  const shows = (k, f) => !!CV[f][k]
  const label = (k) => `${rec.els[k].part}${rec.els[k].block && rec.els[k].block !== blockId ? '@' + rec.els[k].block : ''}`
  const inBlock = (k) => rec.els[k].block === blockId
  const all = rec.els.map((_, k) => k)
  const mine = all.filter(inBlock)
  const v = {}
  const frameT = (f) => +(rec.frames[f].t - rec.t0).toFixed(0)

  // J1 — no snap
  let w1 = null
  for (const k of all) {
    const s = S[k]
    for (const r of runs(s)) {
      const dur = s[r.end].t - s[r.start - 1].t
      for (let i = r.start; i <= r.end; i++) {
        const a = s[i - 1].v
        const b = s[i].v
        const dt = s[i].t - s[i - 1].t
        // a jump nobody can see (hidden on both frames, e.g. a from-state set under a
        // still-transparent wrapper) is not a snap
        const prevShown = shows(k, s[i - 1].f)
        if (!prevShown && !shows(k, s[i].f)) continue
        // M6/A3: an element that paints nothing itself (a wrapper, a `root`) is judged on its
        // translate/scale only; its opacity and clip reach the painting parts' effective values.
        const paints = rec.els[k].paint !== false
        // M6/A1: a jump towards hidden whose previous frame showed nothing (a from-state set the
        // frame the wrapper starts to show) was never seen at its earlier value.
        const towardsHidden = (ch) =>
          ch === 'translate'
            ? Math.hypot(b[CH.tx], b[CH.ty]) > Math.hypot(a[CH.tx], a[CH.ty])
            : ch === 'scale'
              ? Math.min(b[CH.sx], b[CH.sy]) < Math.min(a[CH.sx], a[CH.sy])
              : b[CH[ch === 'opacity' ? 'op' : ch]] < a[CH[ch === 'opacity' ? 'op' : ch]]
        const jumps = [
          ['opacity', Math.abs(b[CH.op] - a[CH.op]), 0.35],
          ['translate', Math.hypot(b[CH.tx] - a[CH.tx], b[CH.ty] - a[CH.ty]), 40],
          ['clip', Math.abs(b[CH.clip] - a[CH.clip]), 0.35],
          ['dash', Math.abs(b[CH.dash] - a[CH.dash]), 0.35],
          ['scale', Math.max(Math.abs(b[CH.sx] - a[CH.sx]), Math.abs(b[CH.sy] - a[CH.sy])), 0.35],
        ]
        for (const [ch, d, lim] of jumps) {
          if (d <= lim) continue
          if (!paints && (ch === 'opacity' || ch === 'clip' || ch === 'dash')) continue
          if (!prevShown && towardsHidden(ch)) continue
          // A one- or two-frame run is a snap; a longer run is a tween, exempt when it lasts
          // <= 100 ms (deliberate) or when the jump spans a frame gap (J8 noise).
          const snap = r.end - r.start < 2 || (dur > 100 && dt <= 50)
          if (!snap) continue
          const score = d / lim
          if (!w1 || score > w1.score) {
            w1 = { score, el: label(k), ch, frame: s[i].f, t: frameT(s[i].f), from: +(ch === 'translate' ? Math.hypot(a[CH.tx], a[CH.ty]) : a[CH[ch === 'scale' ? 'sx' : ch === 'opacity' ? 'op' : ch]]).toFixed(3), to: +(ch === 'translate' ? Math.hypot(b[CH.tx], b[CH.ty]) : b[CH[ch === 'scale' ? 'sx' : ch === 'opacity' ? 'op' : ch]]).toFixed(3), runFrames: r.end - r.start + 1 }
          }
        }
      }
    }
  }
  v.J1 = w1 ? { ok: false, worst: w1 } : { ok: true }

  // J2 — no flash: visible -> hidden -> visible (or visible on the first frame, then hidden)
  let w2 = null
  for (const k of all) {
    const s = S[k]
    let seenVisible = -1
    let hiddenAfter = -1
    for (let i = 0; i < s.length; i++) {
      const vis = shows(k, s[i].f)
      if (vis && seenVisible < 0) seenVisible = i
      else if (!vis && seenVisible >= 0 && hiddenAfter < 0) hiddenAfter = i
      else if (vis && hiddenAfter >= 0) {
        const shownMs = s[hiddenAfter].t - s[seenVisible].t
        if (!w2 || shownMs > w2.shownMs) w2 = { el: label(k), shownFrom: frameT(s[seenVisible].f), hiddenAt: frameT(s[hiddenAfter].f), reshownAt: frameT(s[i].f), shownMs: +shownMs.toFixed(0) }
        break
      }
    }
  }
  v.J2 = w2 ? { ok: false, worst: w2 } : { ok: true }

  // J3 — ends at rest (elements the run never moved keep their authored state and are skipped)
  const last = rec.frames.length - 1
  const bad3 = []
  for (const k of all) {
    const s = S[k]
    if (!s.length || s[s.length - 1].f !== last) continue
    const moved = runs(s).length > 0 || !atRest(s[0].v)
    if (!moved) continue
    const end = s[s.length - 1].v
    // With a static recording of the same block (`ref`), "at rest" means "as the static render";
    // that keeps authored opacities (a radar area at 0.28, say) from counting as stuck.
    const r0 = ref && ref[refKey(rec.els[k], blockId)]
    if (r0) {
      if (differs(end, r0) && Math.abs(end[CH.op] - r0[CH.op]) + Math.abs(end[CH.clip] - r0[CH.clip]) + Math.abs(end[CH.dash] - r0[CH.dash]) + Math.hypot(end[CH.tx] - r0[CH.tx], end[CH.ty] - r0[CH.ty]) / 100 + Math.abs(end[CH.sx] - r0[CH.sx]) > 0.01) bad3.push({ el: label(k), end, static: r0 })
      continue
    }
    if (!atRest(end)) {
      // an element that is visible and never changed keeps its authored state (opacity < 1, e.g.)
      if (visible(end) && !differs(end, s[0].v) && runs(s).length === 0) continue
      bad3.push({ el: label(k), end })
    }
  }
  v.J3 = bad3.length ? { ok: false, count: bad3.length, worst: bad3[0], more: bad3.slice(1, 4).map((b) => b.el) } : { ok: true }

  // J4 — compositor-only
  const badProps = Object.keys(rec.props).filter((p) => NON_COMPOSITOR.test(p))
  const badAttrs = Object.keys(rec.attrs).filter((a) => NON_COMPOSITOR_ATTR.test(a))
  const badWaapi = Object.keys(rec.waapi).filter((p) => NON_COMPOSITOR.test(p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())))
  v.J4 = {
    ok: !badProps.length && !badAttrs.length && !badWaapi.length,
    props: Object.keys(rec.props),
    ...(Object.keys(rec.attrs).length ? { attrs: Object.keys(rec.attrs) } : {}),
    ...(Object.keys(rec.waapi).length ? { waapi: Object.keys(rec.waapi) } : {}),
    ...(badProps.length + badAttrs.length + badWaapi.length ? { bad: [...badProps, ...badAttrs.map((a) => '@' + a), ...badWaapi] } : {}),
    ...(rec.added ? { remountedNodes: rec.added } : {}),
  }

  // J5 — timing in tokens (block's own elements)
  const tim = []
  let first = Infinity
  let lastT = -Infinity
  const starts = {}
  for (const k of mine) {
    const s = S[k]
    // M6/A3: an element that paints nothing has no visible timing of its own; its fade shows in
    // the painting parts' effective values.
    if (rec.els[k].paint === false) continue
    // Only runs that showed something count (M1b/E3): a wrapper whose parts were all hidden, or a
    // from-state set while the element was still invisible, has no visible timing of its own.
    const rs = runs(s).filter((r) => {
      for (let i = r.start - 1; i <= r.end; i++) if (shows(k, s[i].f)) return true
      return false
    })
    if (!rs.length) continue
    const st = s[rs[0].start - 1].t
    const en = s[rs[rs.length - 1].end].t
    first = Math.min(first, st)
    lastT = Math.max(lastT, en)
    const dur = en - st
    // M6/A4: a family is the part name pattern under the same parent pattern (two delegated
    // blocks' `root` wrappers are not one family). A2: a member starts when it starts moving
    // itself, not when the block fade around it starts.
    const par = rec.els[k].parent
    const f = `${fam(rec.els[k].part)}|${par !== null && par !== undefined ? fam(rec.els[par].part) : ''}`
    // (setting a from-state moves away from rest, so the start is the first own move towards it)
    const away = (x) => Math.abs(x[CH.oop] - 1) + Math.abs(x[CH.oclip] - 1) + Math.abs(x[CH.dash] - 1) + Math.abs(x[CH.sx] - 1) + Math.abs(x[CH.sy] - 1) + Math.hypot(x[CH.tx], x[CH.ty]) / 100
    let own = st
    for (let i = rs[0].start; i <= rs[rs.length - 1].end; i++) {
      const a = s[i - 1].v
      const b = s[i].v
      if (b[CH.oop] !== undefined && ownDiffers(a, b) && away(b) < away(a) - 0.001) { own = s[i - 1].t; break }
    }
    if (own === st) {
      // nothing of its own moved: a clip/scale/draw inherited from a wrapping part (a chevron
      // inside its wiping segment) — the first visible move towards rest, opacity aside
      const awayEff = (x) => Math.abs(x[CH.clip] - 1) + Math.abs(x[CH.dash] - 1) + Math.abs(x[CH.sx] - 1) + Math.abs(x[CH.sy] - 1) + Math.hypot(x[CH.tx], x[CH.ty]) / 100
      for (let i = rs[0].start; i <= rs[rs.length - 1].end; i++) {
        if (shows(k, s[i].f) && awayEff(s[i].v) < awayEff(s[i - 1].v) - 0.001) { own = s[i - 1].t; break }
      }
    }
    ;(starts[f] = starts[f] || []).push(own)
    // total change of the element: ignore micro-movements
    const a = s[rs[0].start - 1].v
    const b = s[rs[rs.length - 1].end].v
    const big = Math.abs(a[CH.op] - b[CH.op]) > 0.2 || Math.hypot(a[CH.tx] - b[CH.tx], a[CH.ty] - b[CH.ty]) > 4 || Math.abs(a[CH.clip] - b[CH.clip]) > 0.2 || Math.abs(a[CH.sx] - b[CH.sx]) > 0.1 || Math.abs(a[CH.dash] - b[CH.dash]) > 0.2
    if (!big) continue
    if (dur < 150 - 34 || dur > 900 + 34) tim.push({ el: label(k), issue: 'duration', ms: +dur.toFixed(0) })
    // ease: progress at mid-time of the main channel (opacity, else clip, else dash, else translate, else scale)
    const ch = Math.abs(a[CH.op] - b[CH.op]) > 0.2 ? 'op' : Math.abs(a[CH.clip] - b[CH.clip]) > 0.2 ? 'clip' : Math.abs(a[CH.dash] - b[CH.dash]) > 0.2 ? 'dash' : Math.abs(a[CH.sx] - b[CH.sx]) > 0.1 ? 'sx' : 'tr'
    const val = (x) => (ch === 'tr' ? Math.hypot(x[CH.tx], x[CH.ty]) : x[CH[ch]])
    if (rs.length === 1 && dur >= 150 && rs[0].end - rs[0].start >= 5) {
      const mid = st + dur / 2
      const at = s.find((p) => p.t >= mid)
      const prog = Math.abs(val(at.v) - val(a)) / (Math.abs(val(b) - val(a)) || 1)
      if (prog < 0.55) tim.push({ el: label(k), issue: 'not out-eased', progressAtMid: +prog.toFixed(2) })
    }
  }
  let maxStagger = 0
  let staggerFam = null
  for (const [f, arr] of Object.entries(starts)) {
    if (arr.length < 3) continue
    arr.sort((x, y) => x - y)
    for (let i = 1; i < arr.length; i++) if (arr[i] - arr[i - 1] > maxStagger) { maxStagger = arr[i] - arr[i - 1]; staggerFam = f }
  }
  if (maxStagger > 120 + 20) tim.push({ el: staggerFam && staggerFam.split('|')[0], issue: 'stagger', ms: +maxStagger.toFixed(0) })
  const chainMs = first === Infinity ? 0 : lastT - first
  const cap = scope === 'slide' ? 3500 : 2500
  if (chainMs > cap) tim.push({ issue: 'chain', ms: +chainMs.toFixed(0), cap })
  v.J5 = { ok: tim.length === 0, chainMs: +chainMs.toFixed(0), maxStaggerMs: +maxStagger.toFixed(0), ...(tim.length ? { worst: tim[0], count: tim.length, issues: tim.slice(0, 5) } : {}) }

  // J7 — styles behave
  const j7 = []
  if (style === 'static' || style === 'reduced') {
    for (const k of all) {
      const s = S[k]
      if (runs(s).length) j7.push({ el: label(k), issue: 'moved under ' + style })
      else if (s.length && !atRest(s[0].v) && visible(s[0].v) === false) j7.push({ el: label(k), issue: 'hidden under ' + style })
    }
  } else if (style === 'subtle') {
    for (const k of all) {
      const s = S[k]
      for (const p of s) {
        const x = p.v
        if (Math.hypot(x[CH.tx], x[CH.ty]) > 12.5) { j7.push({ el: label(k), issue: 'translate > 12px', px: +Math.hypot(x[CH.tx], x[CH.ty]).toFixed(1) }); break }
        if (Math.abs(x[CH.sx] - 1) > 0.005 || Math.abs(x[CH.sy] - 1) > 0.005) { j7.push({ el: label(k), issue: 'scale under subtle', scale: x[CH.sx] }); break }
        if (x[CH.clip] < 0.999 || x[CH.dash] < 0.999) { j7.push({ el: label(k), issue: 'clip/draw under subtle' }); break }
      }
    }
  }
  v.J7 = j7.length ? { ok: false, count: j7.length, worst: j7[0] } : { ok: true }

  // J8 — frame budget while anything moves
  let gaps = 0
  let maxGap = 0
  let aStart = Infinity
  let aEnd = -Infinity
  for (const k of all) {
    const rs = runs(S[k])
    if (!rs.length) continue
    aStart = Math.min(aStart, S[k][rs[0].start - 1].f)
    aEnd = Math.max(aEnd, S[k][rs[rs.length - 1].end].f)
  }
  for (let f = Math.max(1, aStart + 1); f <= aEnd; f++) {
    const g = rec.frames[f].t - rec.frames[f - 1].t
    if (g > 100) gaps++
    maxGap = Math.max(maxGap, g)
  }
  v.J8 = { ok: gaps === 0, gaps, maxGapMs: +maxGap.toFixed(0), frames: rec.frames.length }
  return v
}

/** Key of one element independent of the slide it was recorded on: own block vs other block. */
function refKey(e, blockId) {
  return `${e.block === blockId ? 'B' : 'O'}|${e.part}|${e.n}`
}

/** The last frame of a (static) recording, keyed by `refKey`: the reference for J3. */
function restFrame(rec, blockId) {
  const out = {}
  const last = rec.frames[rec.frames.length - 1]
  if (!last) return out
  for (const k of Object.keys(last.row)) out[refKey(rec.els[k], blockId)] = last.row[k]
  return out
}

function summary(type, style, v) {
  const mark = (j) => (v[j] ? (v[j].ok ? '✓' : '✗') : '·')
  const why = []
  if (v.J1 && !v.J1.ok) why.push(`J1 ${v.J1.worst.el} ${v.J1.worst.ch} ${v.J1.worst.from}→${v.J1.worst.to} @${v.J1.worst.t}ms`)
  if (v.J2 && !v.J2.ok) why.push(`J2 ${v.J2.worst.el} shown ${v.J2.worst.shownMs}ms then hidden`)
  if (v.J3 && !v.J3.ok) why.push(`J3 ${v.J3.count}× e.g. ${v.J3.worst.el} [${v.J3.worst.end.join(',')}]`)
  if (v.J4 && !v.J4.ok) why.push(`J4 ${v.J4.bad.join(',')}`)
  if (v.J5 && !v.J5.ok) why.push(`J5 ${v.J5.worst.issue} ${v.J5.worst.el || ''} ${v.J5.worst.ms ?? v.J5.worst.progressAtMid ?? ''}`)
  if (v.J7 && !v.J7.ok) why.push(`J7 ${v.J7.worst.el} ${v.J7.worst.issue}`)
  if (v.J8 && !v.J8.ok) why.push(`J8 ${v.J8.gaps} gaps, max ${v.J8.maxGapMs}ms`)
  return `${type} ${style.padEnd(10)} J1${mark('J1')} J2${mark('J2')} J3${mark('J3')} J4${mark('J4')} J5${mark('J5')} J7${mark('J7')} J8${mark('J8')}  chain ${v.J5 ? v.J5.chainMs : '?'}ms${why.length ? '  | ' + why.join(' | ') : ''}`
}

module.exports = { installSampler, verdicts, summary, restFrame }
