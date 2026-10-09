#!/usr/bin/env node
/**
 * AC3 — per-family advance-width tables for the layout oracle (reviews/blocks/ai-curation/README.md
 * §6 AC3, §4.1).
 *
 *   node tools/layout-report/calibrate/font-widths.js            # measure, write the tables
 *   node tools/layout-report/calibrate/font-widths.js --check    # re-measure, compare (0.001 em)
 *   node tools/layout-report/calibrate/font-widths.js --keys fraunces,archivo
 *
 * Loads every family of `fonts.js` (the sample's fontsource packages, inlined as data @font-face)
 * in ONE headless Chromium page and measures, with `canvas.measureText` at 1000px, the advance of
 * each ASCII glyph, the extra symbols the Inter table carries, and the Vietnamese letters, at
 * weight 400 and 700. Writes `packages/tldraw/src/blocks/layout/font-metrics/<key>.ts` (rounded to
 * 0.001 em). A precomposed Vietnamese letter is stored only when its advance differs from its NFD
 * base letter's by more than 0.001 em (the oracle falls back to the base letter, as for Inter).
 * `--check` exits 1 when any stored entry is more than 0.001 em off the browser.
 */
const fs = require('fs')
const path = require('path')
const { loadPlaywright } = require('../../visual/playwright')
const { FONT_SET, fontFaceCss, fontMeta, interFaceCss } = require('./fonts')

const ROOT = path.resolve(__dirname, '../../..')
const OUT_DIR = path.join(ROOT, 'packages/tldraw/src/blocks/layout/font-metrics')
const args = process.argv.slice(2)
const CHECK = args.includes('--check')
const KEYS = args.includes('--keys') ? args[args.indexOf('--keys') + 1].split(',') : FONT_SET.map((f) => f.key)

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i))
const EXTRA = [...'×÷−–—…•°±€£¥↑↓→←✓✗·“”‘’Đđ©®™∞≈≤≥']
const VI_BASES = [...'aăâeêioôơuưyAĂÂEÊIOÔƠUƯY']
const VI_TONES = ['', '̀', '́', '̉', '̃', '̣']
const VIETNAMESE = [...new Set(VI_BASES.flatMap((b) => VI_TONES.map((t) => (b + t).normalize('NFC'))))].filter((c) => c.length === 1)
const CHARS = [...new Set([...ASCII, ...EXTRA, ...VIETNAMESE])]

const r3 = (v) => Math.round(v * 1000) / 1000

/** Kerning: every ordered pair of visible ASCII glyphs, measured as `w(ab) - w(a) - w(b)` at 400;
 *  pairs of at least KERN_MIN em are stored, rounded to KERN_STEP em and grouped by value. Accented
 *  letters kern as their NFD base letters; bold runs use the same pairs. */
const KERN_CHARS = ASCII.filter((c) => c !== ' ')
const KERN_MIN = 0.005
const KERN_STEP = 0.005

/** `--check`: running text (English and Vietnamese) measured by the oracle vs the browser. */
const SENTENCES = [
  'Revenue grew 42% in a year',
  'Three numbers that moved this year',
  'Optimised for speed at every layer of the stack.',
  'Every session starts from one question the data can answer.',
  'Doanh thu tăng 42% trong một năm',
  'Tỷ lệ hoàn thành của sinh viên năm thứ nhất',
  'Chúng tôi đã chuyển mọi cuộc họp hội đồng sang định dạng này.',
  'Đổi mới, sáng tạo và phát triển bền vững',
]
const constName = (key) => key.toUpperCase().replace(/-/g, '_') + '_METRICS'

function measurePage([fonts, chars, kernChars]) {
  const c = document.createElement('canvas').getContext('2d')
  const out = {}
  for (const f of fonts) {
    out[f.key] = {}
    for (const w of [400, 700]) {
      c.font = `${w} 1000px "${f.family}", ${f.generic}`
      const row = {}
      for (const ch of chars) row[ch] = c.measureText(ch).width / 1000
      out[f.key][w] = row
    }
    c.font = `400 1000px "${f.family}", ${f.generic}`
    const one = {}
    for (const ch of kernChars) one[ch] = c.measureText(ch).width
    const kern = {}
    for (const a of kernChars) for (const b of kernChars) {
      const k = (c.measureText(a + b).width - one[a] - one[b]) / 1000
      if (Math.abs(k) > 1e-6) kern[a + b] = k
    }
    out[f.key].kern = kern
  }
  return out
}

/** Pairs ≥ KERN_MIN em, rounded to KERN_STEP, as `{ "<em>": "<pair><pair>…" }` (sorted). */
function kernGroups(kern) {
  const groups = {}
  for (const [pair, k] of Object.entries(kern)) {
    if (Math.abs(k) < KERN_MIN) continue
    const v = Math.round(k / KERN_STEP) * KERN_STEP
    if (Math.abs(v) < 1e-9) continue
    const key = String(Math.round(v * 1000) / 1000)
    groups[key] = (groups[key] || '') + pair
  }
  return Object.fromEntries(Object.entries(groups).sort((a, b) => Number(a[0]) - Number(b[0])))
}

function tableFor(f, raw) {
  const regular = {}
  const bold = {}
  for (const ch of CHARS) {
    const base = ch.normalize('NFD')[0]
    const isVi = VIETNAMESE.includes(ch) && base !== ch
    for (const [w, dst] of [[400, regular], [700, bold]]) {
      const v = raw[w][ch]
      if (isVi && Math.abs(v - raw[w][base]) <= 0.001) continue
      dst[ch] = r3(v)
    }
  }
  const lower = [...'abcdefghijklmnopqrstuvwxyz']
  const fallback = r3(lower.reduce((s, ch) => s + raw[400][ch], 0) / lower.length)
  return { regular, bold, fallback, kern: kernGroups(raw.kern) }
}

const kernObj = (kern) => `{\n${Object.entries(kern).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}\n  }`
const kernPairs = (kern) => Object.values(kern).reduce((n, s) => n + s.length / 2, 0)

function emit(f, t, meta) {
  const obj = (o) => {
    const parts = Object.entries(o).map(([k, v]) => `${JSON.stringify(k)}: ${v}`)
    const lines = []
    let cur = ' '
    for (const p of parts) {
      if (cur.length + p.length + 2 > 100) {
        lines.push(cur)
        cur = ' '
      }
      cur += ` ${p},`
    }
    lines.push(cur)
    return `{\n${lines.join('\n')}\n  }`
  }
  return `/**
 * ${meta.family} advance widths (em) at 400 and 700, measured in headless Chromium with
 * \`canvas.measureText\` against ${'`'}${f.pkg}@${meta.version}${'`'} (${meta.license}; subsets ${meta.subsets.join(', ')}).
 * GENERATED by \`tools/layout-report/calibrate/font-widths.js\` — do not edit; re-run it instead.
 * A Vietnamese letter missing here is as wide as its NFD base letter.
 */

import type { FaceMetrics } from './types'

export const ${constName(f.key)}: FaceMetrics = {
  key: '${f.key}',
  families: [${JSON.stringify(f.family)}, ${JSON.stringify(meta.variable ? `${f.family} Variable` : f.family)}],
  generic: '${f.generic}',
  fallback: ${t.fallback},
  regular: ${obj(t.regular)},
  bold: ${obj(t.bold)},
  kern: ${kernObj(t.kern)},
}
`
}

/** Inter keeps its LO5 advance table (`layout/inter-metrics.ts`); only its kerning is generated. */
function emitInterKern(kern) {
  return `/**
 * Inter kerning pairs (em, grouped by value), measured in headless Chromium with \`canvas.measureText\`
 * against the Inter the Next.js sample serves (\`next/font\`, OFL-1.1): \`w(ab) - w(a) - w(b)\` at 400 for
 * every pair of visible ASCII glyphs, stored when ≥ ${KERN_MIN} em, rounded to ${KERN_STEP} em.
 * GENERATED by \`tools/layout-report/calibrate/font-widths.js\` — do not edit; re-run it instead.
 */

export const INTER_KERN: Record<string, string> = ${kernObj(kern)}
`
}

;(async () => {
  const fonts = FONT_SET.filter((f) => KEYS.includes(f.key))
  const withInter = !args.includes('--keys') || KEYS.includes('inter')
  const INTER = { key: 'inter', family: 'Inter', generic: 'sans-serif' }
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${fontFaceCss(KEYS)}\n${withInter ? interFaceCss() : ''}</style></head><body></body></html>`)
  // Load every face (each subset of each weight) before measuring.
  const loaded = await page.evaluate(async ({ fonts, sample }) => {
    const ok = {}
    for (const f of fonts) {
      for (const w of [400, 700]) await document.fonts.load(`${w} 100px "${f.family}"`, sample)
      ok[f.key] = document.fonts.check(`400 100px "${f.family}"`, 'Aaă')
    }
    return ok
  }, { fonts: withInter ? [...fonts, INTER] : fonts, sample: CHARS.join('') })
  const raw = await page.evaluate(measurePage, [withInter ? [...fonts, INTER] : fonts, CHARS, KERN_CHARS])
  const sentenceW = CHECK
    ? await page.evaluate(([fonts, sentences]) => {
        const c = document.createElement('canvas').getContext('2d')
        const out = {}
        for (const f of fonts) {
          out[f.key] = {}
          for (const w of [400, 700]) {
            c.font = `${w} 100px "${f.family}", ${f.generic}`
            out[f.key][w] = sentences.map((t) => c.measureText(t).width)
          }
        }
        return out
      }, [withInter ? [...fonts, INTER] : fonts, SENTENCES])
    : null
  await browser.close()
  const oracle = CHECK ? require('../load').loadOracle() : null

  // Running text through the oracle (`tableMetrics`, the family stack a theme writes), 400 + 700.
  const sentenceErr = (f) => {
    const measure = oracle.tableMetrics()
    const errs = []
    for (const [w, bold] of [[400, false], [700, true]]) {
      SENTENCES.forEach((t, i) => {
        const text = bold ? { runs: [{ text: t, bold: true }] } : t
        const m = measure(text, { family: `"${f.family}", ${f.generic}`, size: 100, lineHeight: 1.2, letterSpacing: 0, color: '#000' })
        errs.push(Math.abs(m.width / sentenceW[f.key][w][i] - 1))
      })
    }
    errs.sort((a, b) => a - b)
    return { errs, p95: errs[Math.min(errs.length - 1, Math.floor(errs.length * 0.95))] }
  }

  let bad = 0
  if (withInter) {
    if (!loaded.inter) throw new Error('Inter did not load')
    const kern = kernGroups(raw.inter.kern)
    const file = path.join(OUT_DIR, 'inter-kern.ts')
    if (CHECK) {
      const same = fs.existsSync(file) && fs.readFileSync(file, 'utf8') === emitInterKern(kern)
      if (!same) bad++
      const { errs, p95 } = sentenceErr(INTER)
      console.log(`${'inter'.padEnd(20)} LO5 table, ${kernPairs(kern)} kern pairs ${same ? 'same ok' : 'CHANGED FAIL (re-run without --check)'} | sentences (en+vi, 400+700) |width err| p95 ${(p95 * 100).toFixed(1)}% max ${(errs[errs.length - 1] * 100).toFixed(1)}%`)
    } else {
      fs.writeFileSync(file, emitInterKern(kern))
      console.log(`wrote ${path.relative(ROOT, file)} (${kernPairs(kern)} kerning pairs)`)
    }
  }
  for (const f of fonts) {
    if (!loaded[f.key]) throw new Error(`${f.family} did not load`)
    const t = tableFor(f, raw[f.key])
    const file = path.join(OUT_DIR, `${f.key}.ts`)
    if (CHECK) {
      const src = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
      let worst = 0
      let n = 0
      for (const [w, which] of [[400, 'regular'], [700, 'bold']]) {
        const block = src.split(`${which}: {`)[1]?.split('\n  },')[0] ?? ''
        for (const m of block.matchAll(/("(?:[^"\\]|\\.)*"): ([\d.]+)/g)) {
          const ch = JSON.parse(m[1])
          worst = Math.max(worst, Math.abs(Number(m[2]) - raw[f.key][w][ch]))
          n++
        }
      }
      const kernSrc = src.split('kern: {')[1]?.split('\n  },')[0] ?? ''
      const kernSame = kernSrc.trim() === kernObj(t.kern).slice(1, -4).trim()
      const ok = worst <= 0.001 + 1e-9 && n === Object.keys(t.regular).length + Object.keys(t.bold).length && kernSame
      if (!ok) bad++
      const p95 = sentenceErr(f).p95
      const errs = sentenceErr(f).errs
      console.log(`${f.key.padEnd(20)} ${n} entries, max |table - canvas| ${worst.toFixed(4)} em, ${kernPairs(t.kern)} kern pairs ${kernSame ? 'same' : 'CHANGED'} ${ok ? 'ok' : 'FAIL'} | sentences (en+vi, 400+700) |width err| p95 ${(p95 * 100).toFixed(1)}% max ${(errs[errs.length - 1] * 100).toFixed(1)}%`)
    } else {
      fs.mkdirSync(OUT_DIR, { recursive: true })
      fs.writeFileSync(file, emit(f, t, fontMeta(f)))
      console.log(`wrote ${path.relative(ROOT, file)} (${Object.keys(t.regular).length} + ${Object.keys(t.bold).length} glyphs, ${kernPairs(t.kern)} kerning pairs, avg a-z ${t.fallback} em)`)
    }
  }
  process.exit(bad ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
