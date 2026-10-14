/* LO5 calibration: measure every fixture slide's blocks in a real Chromium. One browser, one page. */
const OUT = process.env.CALIB_OUT || require('path').join(require('os').tmpdir(), 'tls-calibration')
const path = require('path')
const fs = require('fs')
const { loadPlaywright } = require('../../visual/playwright')

function measureInPage() {
  const slide = document.querySelector('[data-testid="deck-viewer-slide"]')
  const sr = slide.getBoundingClientRect()
  const rel = (r) => ({ x: r.left - sr.left, y: r.top - sr.top, width: r.width, height: r.height })
  const union = (bs) => {
    if (!bs.length) return null
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (const b of bs) { x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height) }
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
  }
  const transparent = (c) => !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c)
  const lhOf = (el) => {
    const cs = getComputedStyle(el)
    const fs = parseFloat(cs.fontSize)
    const lh = cs.lineHeight === 'normal' ? 1.2 * fs : parseFloat(cs.lineHeight)
    return { fs, lh }
  }
  // Measure how the browser itself would wrap `text` in `width` with the element's font.
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;left:-99999px;top:0;white-space:pre-wrap;word-break:normal;overflow-wrap:break-word'
  document.body.appendChild(probe)
  const browserLines = (el, text, width) => {
    const cs = getComputedStyle(el)
    probe.style.fontFamily = cs.fontFamily
    probe.style.fontSize = cs.fontSize
    probe.style.letterSpacing = cs.letterSpacing
    probe.style.fontWeight = cs.fontWeight
    probe.style.lineHeight = cs.lineHeight
    probe.style.width = width + 'px'
    probe.textContent = text
    const range = document.createRange()
    range.selectNodeContents(probe)
    const tops = new Set()
    for (const r of range.getClientRects()) if (r.width > 0.5) tops.add(Math.round(r.top / 4))
    return Math.max(1, tops.size)
  }

  const out = []
  for (const wrap of slide.querySelectorAll(':scope > [data-shape-id]')) {
    const wr = wrap.getBoundingClientRect()
    const box = rel(wr)
    const leaves = []
    const backdrops = []
    const isBackdrop = (b) => {
      const fit = (v, ref) => v >= ref * 0.98 && v <= ref / 0.98 + 1
      return fit(b.width, box.width) && fit(b.height, box.height)
    }
    const host = !!wrap.querySelector('[data-host-root], .tls-host') // best effort
    // Text: every non-empty text node; each client rect expanded to the line-height.
    const textLeaves = []
    const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT)
    let n
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue
      const el = n.parentElement
      if (!el || el.closest('svg')) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const { lh } = lhOf(el)
      const range = document.createRange()
      range.selectNodeContents(n)
      for (const r of range.getClientRects()) {
        if (r.width < 0.5) continue
        const cy = r.top + r.height / 2
        leaves.push({ k: 'text', ...rel({ left: r.left, top: cy - lh / 2, width: r.width, height: lh }) })
      }
    }
    // Layout-kind text containers: children are `white-space: pre` line divs.
    for (const el of wrap.querySelectorAll('div')) {
      const kids = Array.from(el.children)
      if (kids.length === 0 || !kids.every((k) => k.tagName === 'DIV' && k.style.whiteSpace === 'pre')) continue
      const lineTexts = kids.map((k) => k.textContent)
      const range = document.createRange()
      let maxW = 0
      const lineInfo = []
      for (const k of kids) {
        range.selectNodeContents(k)
        // AC3: a wrapped line keeps its trailing space in the DOM (`white-space: pre`); it paints
        // nothing, so the line's width ends at its last visible character (the table measures the
        // trimmed text, and an invisible trailing space past the box is no overflow).
        const tnodes = []
        const walker = document.createTreeWalker(k, NodeFilter.SHOW_TEXT)
        while (walker.nextNode()) tnodes.push(walker.currentNode)
        for (let ti = tnodes.length - 1; ti >= 0; ti--) {
          const m = /\S\s*$/.exec(tnodes[ti].data)
          if (m) { range.setEnd(tnodes[ti], m.index + 1); break }
        }
        const rr = range.getBoundingClientRect()
        maxW = Math.max(maxW, rr.width)
        const spans = Array.from(k.querySelectorAll('span'))
        lineInfo.push({
          t: k.textContent,
          w: Math.round(rr.width * 100) / 100,
          bold: spans.some((sp) => sp.style.fontWeight === 'bold'),
          sized: spans.some((sp) => sp.style.fontSize),
          runs: spans.map((sp) => [sp.textContent, sp.style.fontWeight === 'bold' ? 1 : 0, sp.style.fontSize ? parseFloat(sp.style.fontSize) : 0]),
        })
      }
      // Reconstruct the source: a line that does not end in whitespace/hyphen was a hard break.
      let text = ''
      lineTexts.forEach((t, i) => {
        text += t
        if (i < lineTexts.length - 1 && !/[\s\-–—]$/.test(t)) text += '\n'
      })
      const width = parseFloat(el.style.width) || el.getBoundingClientRect().width
      const nonEmpty = lineTexts.filter((t) => t.trim()).length
      textLeaves.push({
        kind: 'layout',
        propPath: el.getAttribute('data-prop-path'),
        part: el.getAttribute('data-part'),
        rendered: lineTexts.length,
        nonEmpty,
        browser: nonEmpty ? browserLines(el, text, width) : 0,
        browserTol: nonEmpty ? browserLines(el, text, width * 1.03 + 2) : 0,
        maxRenderedWidth: Math.round(maxW * 10) / 10,
        boxWidth: width,
        chars: text.length,
        fontSize: parseFloat(getComputedStyle(el).fontSize),
        letterSpacingPx: parseFloat(getComputedStyle(el).letterSpacing) || 0,
        family: getComputedStyle(el).fontFamily,
        lineInfo,
        y: rel(el.getBoundingClientRect()).y,
      })
    }
    // HTML-kind text: elements that directly hold text; lines = distinct rect rows.
    const htmlText = []
    for (const el of wrap.querySelectorAll('*')) {
      if (el.closest('svg')) continue
      const direct = Array.from(el.childNodes).filter((c) => c.nodeType === 3 && c.textContent.trim())
      if (!direct.length) continue
      if (el.style.whiteSpace === 'pre') continue // layout line div
      const tops = new Set()
      const range = document.createRange()
      for (const t of direct) {
        range.selectNodeContents(t)
        for (const r of range.getClientRects()) if (r.width > 0.5) tops.add(Math.round(r.top / 4))
      }
      htmlText.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 40), lines: tops.size, text: el.textContent.trim().slice(0, 40) })
    }
    // LO7: html-kind text per `data-part` (the poster's text leaves carry the same part names).
    // A part's lines = distinct line rows per block-level text container among the text nodes whose
    // nearest [data-part] ancestor is that part (inline runs — <strong>, word spans — on one row
    // count once; the old per-element count above counted them as extra lines).
    const htmlParts = []
    for (const pe of wrap.querySelectorAll('[data-render] [data-part]')) {
      if (pe.closest('svg')) continue
      const groups = new Map()
      const tw = document.createTreeWalker(pe, NodeFilter.SHOW_TEXT)
      let tn
      while ((tn = tw.nextNode())) {
        if (!tn.textContent.trim()) continue
        const el = tn.parentElement
        if (!el || el.closest('[data-part]') !== pe) continue
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') continue
        let blk = el
        while (blk !== pe && getComputedStyle(blk).display.startsWith('inline')) blk = blk.parentElement
        const g = groups.get(blk) || { rects: [], lh: lhOf(blk).lh, fs: lhOf(blk).fs }
        const range = document.createRange()
        range.selectNodeContents(tn)
        for (const r of range.getClientRects()) if (r.width > 0.5) g.rects.push(r)
        groups.set(blk, g)
      }
      if (!groups.size) continue
      let lines = 0
      const boxes = []
      let maxW = 0
      for (const [blk, g] of groups) {
        const cys = g.rects.map((r) => r.top + r.height / 2).sort((a, b) => a - b)
        const rows = []
        for (const cy of cys) if (!rows.length || cy - rows[rows.length - 1] > g.fs * 0.5) rows.push(cy)
        lines += rows.length
        for (const cy of rows) boxes.push(rel({ left: Math.min(...g.rects.map((r) => r.left)), top: cy - g.lh / 2, width: 1, height: g.lh }))
        // widest row
        for (const cy of rows) {
          const rr = g.rects.filter((r) => Math.abs(r.top + r.height / 2 - cy) <= g.fs * 0.5)
          maxW = Math.max(maxW, Math.max(...rr.map((r) => r.right)) - Math.min(...rr.map((r) => r.left)))
        }
        const bw = blk.getBoundingClientRect().width
        maxW = Math.max(0, maxW)
        g.bw = bw
      }
      const u = union(boxes)
      htmlParts.push({ part: pe.getAttribute('data-part'), lines, y: u.y, bottom: u.y + u.height, maxW: Math.round(maxW * 10) / 10 })
    }
    // Shapes.
    for (const el of wrap.querySelectorAll('svg path, svg circle, svg ellipse, svg rect, svg line, svg polyline, svg polygon')) {
      const cs = getComputedStyle(el)
      const fill = cs.fill, stroke = cs.stroke
      if ((fill === 'none' || transparent(fill)) && (stroke === 'none' || transparent(stroke))) continue
      const r = el.getBoundingClientRect()
      if (r.width <= 0 && r.height <= 0) continue
      const b = rel(r)
      ;(isBackdrop(b) ? backdrops : leaves).push({ k: 'svg', ...b })
    }
    for (const el of wrap.querySelectorAll('img')) {
      const b = rel(el.getBoundingClientRect())
      if (b.width > 0 && b.height > 0) leaves.push({ k: 'img', ...b })
    }
    for (const el of wrap.querySelectorAll('div, span, li, p, section, figure, blockquote, header, footer, article')) {
      const cs = getComputedStyle(el)
      const bg = !transparent(cs.backgroundColor) || (cs.backgroundImage && cs.backgroundImage !== 'none')
      const border = ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && !transparent(cs['border' + s + 'Color']))
      if (!bg && !border) continue
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) continue
      const b = rel(r)
      ;(isBackdrop(b) ? backdrops : leaves).push({ k: 'box', ...b })
    }
    const painted = union(leaves) || union(backdrops)
    out.push({
      shapeId: wrap.getAttribute('data-shape-id'),
      blockId: wrap.getAttribute('data-block-id'),
      box,
      painted,
      textPainted: union(leaves.filter((l) => l.k === 'text')),
      textLeaves,
      htmlText,
      htmlParts,
      crashed: !!wrap.querySelector('[data-testid="crashed-block"]'),
    })
  }
  probe.remove()
  return out
}

;(async () => {
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
  await page.goto('file://' + path.join(OUT, 'www/index.html'))
  await page.waitForFunction(() => !!window.show)
  const decks = await page.evaluate(() => window.DECKS)
  const result = {}
  for (const [deck, slides] of Object.entries(decks)) {
    result[deck] = {}
    for (let i = 0; i < slides.length; i++) {
      await page.evaluate(([d, s]) => window.show(d, s), [deck, i])
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(350)
      result[deck][slides[i]] = await page.evaluate(measureInPage)
      if (process.env.SHOTS && process.env.SHOTS.split(',').includes(slides[i])) {
        await page.screenshot({ path: path.join(OUT, `shot-${deck}-${slides[i]}.png`) })
      }
    }
  }
  const fontOk = await page.evaluate(() => document.fonts.check('16px Inter') && [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.unicodeRange.slice(0, 12)))
  await browser.close()
  fs.writeFileSync(path.join(OUT, 'dom.json'), JSON.stringify({ result, errors, fontOk }))
  console.log('errors', errors.length, errors.slice(0, 5), 'fonts', fontOk)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
