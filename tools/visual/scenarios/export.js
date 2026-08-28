/* eslint-disable no-console */
/**
 * Phase 15 — drift detector between the two SVG-export paths this fork now has: the live editor's
 * `TldrawApp.copySvg` (clones already-rendered DOM nodes) and the new headless `renderPageToSvg`
 * (a pure function of the document, no DOM at all — see that module's own doc comment). They are
 * NOT expected to be byte-identical (text layout is a documented approximation in the headless
 * path — see `renderPageToSvg.ts`), but for a slide with no text-heavy content they should agree
 * on every *structural* thing that matters: gradient `<defs>`, resolved theme colours, the
 * viewBox/frame size, and the number of shapes rendered. This scenario builds one such slide
 * through the real UI/API (a themed template plus a hand-added gradient shape, exactly like
 * `background.js` builds its gradient fixture), asks both paths to render the *same* page, and
 * diffs the two outputs on those axes — so a future change that lets the two paths drift (e.g. a
 * new shape type that only one of them learns to render) shows up here rather than silently.
 *
 * Uses the /develop route for `window.app`/`window.renderPageToSvg` (see develop.tsx).
 */
const path = require('path')

module.exports = {
  route: '/#/develop',
  async run(page) {
    const pageId = await page.evaluate(() => window.app.currentPageId)

    // A real, themed template — same construction path a user's "insert template" click uses —
    // plus one hand-added shape carrying a gradient fill, so both the page-background and
    // shape-fill gradient paths (Phase 11) are exercised, not just the theme-token path (Phase 12).
    await page.evaluate((id) => {
      window.app.setDeckTheme(window.app.deck.listThemes().find((t) => t.id === 'coral-pop'))
      window.app.addSlideFromTemplate('stat-row', undefined, id)
      // The starter-pack templates only ever use solid (theme-token) backgrounds — see Phase 13's
      // notes — so a gradient page background has to be added by hand here to exercise that half
      // of Phase 11 too, the same way `background.js` does for its own fixture.
      window.app.setPageBackground(id, {
        type: 'linearGradient',
        angle: 135,
        stops: [
          { color: 'theme:accent2', at: 0 },
          { color: '#003366', at: 1 },
        ],
      })
      window.app.createShapes({
        id: 'export-gradient-rect',
        type: 'rectangle',
        parentId: id,
        point: [1500, 80],
        size: [300, 150],
        style: {
          color: 'black',
          size: 'small',
          dash: 'solid',
          isFilled: true,
          fillGradient: {
            type: 'linearGradient',
            angle: 90,
            stops: [
              { color: '#ff00aa', at: 0 },
              { color: '#00ffaa', at: 1 },
            ],
          },
        },
      })
    }, pageId)
    await page.waitForTimeout(300)

    const comparison = await page.evaluate((id) => {
      const app = window.app
      const page_ = app.document.pages[id]
      const liveSvg = app.copySvg([], id, true, false)
      const headlessSvg = window.renderPageToSvg(page_, {
        assets: app.document.assets,
        theme: app.document.theme,
        defaultPageSize: app.document.defaultPageSize,
      })

      const has = (svg, needle) => (svg || '').includes(needle)
      const theme = app.document.theme

      return {
        liveLength: liveSvg?.length ?? 0,
        headlessLength: headlessSvg?.length ?? 0,
        bothHaveViewBox1920x1080: [liveSvg, headlessSvg].every((s) =>
          has(s, 'viewBox="0 0 1920 1080"')
        ),
        bothHavePageBackgroundGradientRef: [liveSvg, headlessSvg].every((s) =>
          has(s, `${id}-bg-gradient`)
        ),
        bothHaveShapeGradientRef: [liveSvg, headlessSvg].every((s) =>
          has(s, 'export-gradient-rect-fill-gradient')
        ),
        bothResolveThemeTextColor: [liveSvg, headlessSvg].every((s) => has(s, theme.colors.text)),
        bothResolvePageBackgroundThemeToken: [liveSvg, headlessSvg].every((s) =>
          has(s, theme.colors.accent2)
        ),
        neitherLeaksRawThemeToken: ![liveSvg, headlessSvg].some((s) => /theme:[a-zA-Z0-9]+/.test(s)),
        shapeCount: Object.keys(page_.shapes).length,
      }
    }, pageId)

    await page.waitForTimeout(200)
    // Named `export-live.png`, not `export.png`: shoot.js takes its own screenshot of whatever is
    // on the page at the very end of `run()` and saves it as `<scenario>.png` — which, in this
    // scenario, is the headless SVG (see below), not the live editor. A same-named screenshot
    // here would be silently overwritten by that one.
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'export-live.png') })

    // Not just a programmatic diff: render `renderPageToSvg`'s own output string as an actual
    // image too, in a second, blank page, so it can be looked at directly — the same "screenshot
    // it, don't just assert on it" discipline every phase before this one was held to.
    const headlessSvg = await page.evaluate((id) => {
      const app = window.app
      return window.renderPageToSvg(app.document.pages[id], {
        assets: app.document.assets,
        theme: app.document.theme,
        defaultPageSize: app.document.defaultPageSize,
      })
    }, pageId)
    // Reuse the same page/tab (a second `browser.newPage()` isn't available to a scenario, which
    // only receives one `page` — see shoot.js) now that everything needed from the live editor has
    // already been captured above.
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.setContent(`<!doctype html><html><body style="margin:0">${headlessSvg}</body></html>`)
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'export-headless.png') })

    return comparison
  },
}
