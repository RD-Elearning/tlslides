/* eslint-disable no-console */
/**
 * L1 — variants the demo slide does not show: callout variants x fills, kv-list leaders, tags,
 * Q and A, centred underline statement, roman two-column numbered list, end-aligned footnote.
 * PUTs a 3-slide deck into the sample's in-memory store, steps through it in the viewer.
 *
 * Run:  node tools/visual/shoot.js p1-extra   (needs `next dev -p 5433` and a rebuilt dist)
 */
const path = require('path')
const BASE = 'http://localhost:5433'
const SHOTS = path.join(__dirname, '..', 'shots')

const title = (id, text) => ({ id, type: 'tls.t.title', props: { text, size: 'heading' } })
const callout = (id, variant, fill) => ({
  id, type: 'tls.t.callout',
  props: { title: `${variant} / ${fill}`, text: 'A note with **bold** text, short enough for one box.', variant, fill },
})

const deck = {
  version: 1, id: 'p1-extra', title: 'P1 extra', theme: 'coral-pop', aspect: 'widescreen',
  slides: [
    {
      id: 's1', layout: 'grid-3x2', regions: {
        title: [title('t1', 'Callouts: variants x fills')],
        c1: [callout('c1', 'info', 'tint')], c2: [callout('c2', 'tip', 'outline')], c3: [callout('c3', 'warning', 'solid')],
        c4: [callout('c4', 'danger', 'tint')], c5: [callout('c5', 'success', 'outline')], c6: [callout('c6', 'info', 'solid')],
      },
    },
    {
      id: 's1b', layout: 'grid-3x2', regions: {
        title: [title('t1b', 'kv-list, tags, footnote')],
        c1: [{ id: 'k1', type: 'tls.t.kv-list', props: { items: [{ key: 'Date', value: '12 March 2026' }, { key: 'Venue', value: 'Hall B' }, { key: 'Duration', value: '45 minutes' }], leader: 'dots' } }],
        c2: [{ id: 'k2', type: 'tls.t.kv-list', props: { items: [{ key: 'Plan', value: 'Team' }, { key: 'Seats', value: '25' }, { key: 'Term', value: 'Annual' }], leader: 'rule', valueAlign: 'start', keyTone: 'text' } }],
        c3: [{ id: 'k3', type: 'tls.t.tags', props: { items: ['TypeScript', 'React', 'Design systems', 'Accessibility', 'Motion', 'Data viz', 'Testing'], tone: 'solid', colorBy: 'cycle' } }],
        c4: [{ id: 'k4', type: 'tls.t.tags', props: { items: ['Python', 'SQL', 'Stats', 'Dashboards'], tone: 'outline', shape: 'rect', align: 'center', size: 'lg' } }],
        c5: [{ id: 'k5', type: 'tls.t.tags', props: { items: ['Alpha', 'Beta', 'Gamma', 'Delta'], tone: 'soft', size: 'sm', colorBy: 'cycle' } }],
        c6: [{ id: 'k6', type: 'tls.t.kv-list', props: { items: [{ key: 'Region', value: 'EMEA' }, { key: 'Owner', value: 'A. Rivera' }, { key: 'Status', value: 'On track' }, { key: 'Budget', value: '$1.2M' }], leader: 'none', columns: '2' } }],
      },
    },
    {
      id: 's2', layout: 'grid-2x3', regions: {
        title: [title('t2', 'Q and A, numbered (roman, 2 columns), statement')],
        a: [{ id: 'qa1', type: 'tls.t.qa', props: { items: [{ q: 'Is it free?', a: 'Yes, for **individuals**.' }, { q: 'Can I export?', a: 'To PDF and PPTX.' }], marker: 'qa' } }],
        b: [{ id: 'n1', type: 'tls.t.numbered', props: { items: ['One', 'Two', 'Three', 'Four', 'Five'], markerStyle: 'roman', columns: '2' } }],
        c: [{ id: 'st1', type: 'tls.t.statement', props: { text: 'Ship the **smallest** thing that **teaches** you something.', align: 'center', emphasis: 'underline', size: 'lg', attribution: 'Team rule' } }],
        d: [{ id: 'n2', type: 'tls.t.numbered', props: { items: ['Alpha', 'Beta', 'Gamma'], markerStyle: 'padded', start: 4, markerTone: 'text' } }],
        e: [{ id: 'f1', type: 'tls.t.footnote', props: { items: ['Eurostat, 2025', 'OECD, 2024'], marker: 'number', align: 'end' } }],
        f: [{ id: 'ck', type: 'tls.t.checklist', props: { items: [{ text: 'Dim style done', state: 'done' }, { text: 'Open one' }, { text: 'Blocked one', state: 'blocked' }], doneStyle: 'dim', columns: '1' } }],
      },
    },
  ],
}

module.exports = {
  base: BASE,
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/view/colorful-blocks-demo',
  waitFor: '[data-testid="deck-viewer"]',
  async run(page) {
    const res = await page.request.put(`${BASE}/api/decks/${deck.id}`, { data: deck })
    if (!res.ok()) throw new Error(`PUT failed: ${res.status()}`)
    const p = await page.context().browser().newPage({ viewport: { width: 1920, height: 1200 } })
    await p.emulateMedia({ reducedMotion: 'reduce' })
    await p.setViewportSize({ width: 1920, height: 1200 })
    await p.goto(`${BASE}/view/${deck.id}`, { waitUntil: 'networkidle' })
    await p.waitForSelector('[data-testid="deck-viewer"]')
    const files = []
    for (let i = 0; i < deck.slides.length; i++) {
      await p.waitForTimeout(1200)
      const f = path.join(SHOTS, `p1-extra-${i + 1}.png`)
      await p.screenshot({ path: f })
      files.push(f)
      await p.keyboard.press('ArrowRight')
    }
    await p.close()
    return { files }
  },
}
