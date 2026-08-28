/* eslint-disable no-console */
/**
 * Phase 13 — the template system. Confirms the real gallery (`TemplatePicker`, opened from the
 * "+" button at the end of the slide strip — see that component's doc comment for why it lives
 * there) lists the full starter pack, that clicking a card actually builds a slide through
 * `app.addSlideFromTemplate`, and — the point of this file, since screenshots are the only way
 * to actually judge a layout — takes one full-canvas screenshot *per template*, not just of
 * whatever slide happens to be current when `shoot.js` takes its own final shot.
 *
 * Only the first template is added via a real menu-open-then-click (proving the picker's own
 * wiring, the same way background.js/stylepanel.js drive one real control end-to-end rather than
 * re-deriving it 12 times); the rest go through `window.app.addSlideFromTemplate` directly, since
 * the command each click ultimately runs is the exact same one already proven above and repeating
 * the click 11 more times would only add runtime, not coverage.
 *
 * A theme (`ivory-editorial`) is applied first, via the real `ThemeMenu`, so every screenshot
 * shows a template the way an actual user would see it — with a brand kit applied — rather than
 * the bare, token-unresolved fallback colours a theme-less deck would show.
 *
 * Uses the /develop route for `window.app` (see frame.js).
 */
const TEMPLATE_IDS = [
  'title',
  'title-subtitle',
  'section-break',
  'bullets',
  'two-column',
  'image-left',
  'image-right',
  'quote',
  'stat-row',
  'comparison',
  'timeline',
  'closing',
]

module.exports = {
  route: '/#/develop',
  async run(page) {
    const path = require('path')
    const fs = require('fs')

    // --- 0. A theme, via the real ThemeMenu, so every layout screenshots as designed ----------
    await page.click('#TD-Theme')
    await page.waitForSelector('#TD-Theme-Content', { timeout: 5000 })
    await page.click('#TD-Theme-ivory-editorial')
    await page.waitForTimeout(150)

    // --- 1. The real gallery: open it, confirm it lists the whole pack, click one -------------
    await page.click('#TD-AddSlide')
    await page.waitForSelector('#TD-AddSlide-Content', { timeout: 5000 })
    const cardIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[id^="TD-AddSlide-Template-"]')).map((el) => el.id)
    )
    await page.click(`#TD-AddSlide-Template-${TEMPLATE_IDS[0]}`)
    await page.waitForTimeout(250)

    const results = []
    const shotsDir = path.join(__dirname, '..', 'shots')
    fs.mkdirSync(shotsDir, { recursive: true })

    const captureCurrent = async (templateId) => {
      // Away from any shape, so a stray pointer-hover outline (left over from wherever the last
      // real click landed) never shows up in a design-review screenshot.
      await page.mouse.move(20, 20)
      await page.waitForTimeout(200)
      const info = await page.evaluate((id) => {
        const shapes = Object.values(window.app.page.shapes)
        return {
          pageName: window.app.page.name,
          shapeCount: shapes.length,
          slotCount: shapes.filter((s) => s.slot).length,
          size: window.app.page.size,
        }
      }, templateId)
      const file = path.join(shotsDir, `templates-${templateId}.png`)
      await page.screenshot({ path: file })
      results.push({ templateId, file, ...info })
    }

    await captureCurrent(TEMPLATE_IDS[0])

    // --- 2. The rest of the pack, direct through the command app.addSlideFromTemplate wraps ---
    for (const templateId of TEMPLATE_IDS.slice(1)) {
      await page.evaluate((id) => window.app.addSlideFromTemplate(id), templateId)
      await captureCurrent(templateId)
    }

    await page.screenshot({ path: path.join(shotsDir, 'templates.png') })

    return {
      templateCardCount: cardIds.length,
      templateCardIds: cardIds,
      slidesBuilt: results,
    }
  },
}
