/* eslint-disable no-console */
/**
 * Phase 17 — typography. Drives the real `StyleMenu` UI (see stylepanel.js/present.js for the
 * established pattern: `window.app` seeds/reads shapes, real clicks/keystrokes drive the panel)
 * for the five fields this phase added — line height, letter spacing, bullet/numbered lists,
 * vertical align + auto-fit for a shape label, and an arbitrary `fontFamily` override — and then,
 * per the brief's explicit export-risk callout, asserts the *same* page renders correctly through
 * `renderPageToSvg` too (the way `background.js` proves a gradient survives export), not just in
 * the live DOM. `fontToken` (the theme-pairing field) has no StyleMenu control by design (see the
 * Phase 17 report) — exercised here directly via `window.app.style`, the same way a host or a
 * future template author would use it.
 *
 * The `fontFamily` override uses `Georgia, serif` — a universally-available web-safe stack, not a
 * web font — deliberately: this scenario needs to prove the override *wires through*, not stand up
 * a Google Fonts network dependency inside a headless CI browser, which would be exactly the kind
 * of flaky, environment-dependent test this project has otherwise avoided.
 *
 * Uses the /develop route for `window.app`/`window.renderPageToSvg` (see develop.tsx).
 */
const path = require('path')

module.exports = {
  route: '/#/develop',
  async run(page) {
    const pageId = await page.evaluate(() => window.app.currentPageId)

    // --- Fixture: three shapes, one per feature cluster -----------------------------------
    await page.evaluate((id) => {
      const app = window.app
      // A small box with a long label — big enough to prove auto-fit actually has to shrink
      // something, not just pass a no-op through.
      app.createShapes({
        id: 'fit-rect',
        type: 'rectangle',
        parentId: id,
        point: [80, 80],
        size: [160, 60],
        label: 'Auto Fit Demo Text',
        style: { color: 'black', size: 'small', dash: 'solid', isFilled: true },
      })
      app.createShapes({
        id: 'list-text',
        type: 'text',
        parentId: id,
        point: [80, 220],
        text: 'Alpha\nBeta\nGamma',
      })
      app.createShapes({
        id: 'font-text',
        type: 'text',
        parentId: id,
        point: [80, 420],
        text: 'Custom Font',
      })
      // A second, unfitted rectangle with the identical label/box, kept OFF to one side —
      // the auto-fit-vs-not font-size comparison below needs a same-shape baseline.
      app.createShapes({
        id: 'unfit-rect',
        type: 'rectangle',
        parentId: id,
        point: [80, 320],
        size: [160, 60],
        label: 'Auto Fit Demo Text',
        style: { color: 'black', size: 'small', dash: 'solid', isFilled: true },
      })
      // fontToken — deliberately not driven through the panel (see the module comment): a host
      // or template sets this directly.
      app.createShapes({
        id: 'token-rect',
        type: 'rectangle',
        parentId: id,
        point: [400, 80],
        size: [300, 100],
        label: 'Theme Heading',
        style: { color: 'black', size: 'small', dash: 'solid', isFilled: true, fontToken: 'heading' },
      })
    }, pageId)
    await page.waitForTimeout(300)

    // --- Auto-fit + vertical align, driven through the real panel ------------------------
    // Selection itself uses `app.select` rather than a raw mouse click at guessed screen
    // coordinates: the dev route's camera pan/zoom is not the 1:1 identity a hand-computed click
    // position would assume (confirmed directly — it differs per document), and getting a shape
    // selected is not what this scenario is testing; everything *after* selection (opening the
    // real panel, clicking its real buttons, typing into its real fields) is real UI interaction.
    await page.evaluate(() => window.app.select('fit-rect'))
    await page.waitForTimeout(150)
    await page.click('#TD-Styles')
    await page.waitForSelector('#TD-Styles-AutoFit', { timeout: 5000 })
    await page.click('#TD-Styles-AutoFit')
    await page.waitForTimeout(150)
    await page.click('#TD-Styles-VerticalAlign-start')
    await page.waitForTimeout(150)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)

    const fitStyle = await page.evaluate(() => window.app.getShape('fit-rect').style)

    // Measure the *live* label against its own box. The headless `autoFitShrunk` check below
    // proves `renderPageToSvg` shrinks; it says nothing about the editor, and those are two
    // independent implementations of the same rule — precisely the live/headless split this
    // project keeps getting bitten by. Without this, auto-fit could regress in the editor while
    // every assertion stayed green.
    const fitLive = await page.evaluate(() => {
      const node = document.getElementById('fit-rect')
      // The label is the one descendant rendering at a font size the positioned wrapper doesn't
      // set — walking for that is sturdier than depending on a generated stitches class name.
      let label = null
      const walk = (el, depth = 0) => {
        if (!el || depth > 4) return
        if (!label && parseFloat(getComputedStyle(el).fontSize) !== 16) label = el
        for (const child of el.children) walk(child, depth + 1)
      }
      walk(node)
      return {
        boxWidth: Math.round(node.getBoundingClientRect().width),
        labelWidth: label ? Math.round(label.getBoundingClientRect().width) : null,
        fitsInsideBox: !!label && label.getBoundingClientRect().width <= node.getBoundingClientRect().width,
      }
    })
    if (!fitLive.fitsInsideBox) {
      throw new Error(
        `auto-fit did not shrink the live label: ${fitLive.labelWidth}px inside a ${fitLive.boxWidth}px box`
      )
    }

    // --- List + line-height + letter-spacing, on the bare TextShape -----------------------
    await page.evaluate(() => window.app.select('list-text'))
    await page.waitForTimeout(150)
    await page.click('#TD-Styles')
    await page.waitForSelector('#TD-Styles-List-Bullet', { timeout: 5000 })
    await page.click('#TD-Styles-List-Bullet')
    await page.waitForTimeout(150)
    await page.fill('#TD-Styles-LineHeight-Input', '1.6')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)
    await page.fill('#TD-Styles-LetterSpacing-Input', '0.08')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)

    const listShape = await page.evaluate(() => window.app.getShape('list-text'))
    // The raw text must stay untouched — only the *rendered* form gets markers (see
    // `applyListMarkers`'s own comment on why undo/redo/copy-paste must never see marker syntax).
    const listRenderedText = await page.evaluate(
      () => document.getElementById('list-text')?.textContent || ''
    )

    // --- Arbitrary font family, on a second bare TextShape --------------------------------
    await page.evaluate(() => window.app.select('font-text'))
    await page.waitForTimeout(150)
    await page.click('#TD-Styles')
    await page.waitForSelector('#TD-Styles-FontFamily-Input', { timeout: 5000 })
    await page.fill('#TD-Styles-FontFamily-Input', 'Georgia, serif')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)

    const fontTextStyle = await page.evaluate(() => window.app.getShape('font-text').style)
    const fontTextComputedFont = await page.evaluate(() => {
      const elm = document.querySelector('#font-text div[style*="letter-spacing"]')
      return elm ? getComputedStyle(elm).fontFamily : undefined
    })

    // --- fontToken: switching the deck theme must restyle token-rect's font, unprompted ---
    // `div[style*="letter-spacing"]` picks out the one element carrying that inline style — the
    // label's `InnerWrapper`, not any of the shape's other wrapper/SVGContainer divs — which is
    // also the one carrying `font` (a plain `[style*="font"]` substring match is unreliable: the
    // browser serializes the `font` shorthand back with extra spaces, `"28px / 1 ..."`, not the
    // `"28px/1 ..."` string this fork's own code writes).
    const readTokenRectFace = () =>
      page.evaluate(() => {
        const elm = document.querySelector('#token-rect div[style*="letter-spacing"]')
        return elm ? getComputedStyle(elm).fontFamily : undefined
      })
    const themeBefore = await page.evaluate(() => window.app.document.theme?.id)
    const faceBefore = await readTokenRectFace()
    await page.evaluate(() => {
      const app = window.app
      app.setDeckTheme(app.deck.listThemes().find((t) => t.id === 'ivory-editorial'))
    })
    await page.waitForTimeout(200)
    const tokenRectStyleAfter = await page.evaluate(() => window.app.getShape('token-rect').style)
    const faceAfter = await readTokenRectFace()

    await page.waitForTimeout(200)
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'typography.png') })

    // --- The export-risk check the brief calls out explicitly: same page, renderPageToSvg -
    const headless = await page.evaluate((id) => {
      const app = window.app
      return window.renderPageToSvg(app.document.pages[id], {
        assets: app.document.assets,
        theme: app.document.theme,
        defaultPageSize: app.document.defaultPageSize,
      })
    }, pageId)

    // renderPageToSvg emits no per-shape `id` attribute (see the module's own comment on why —
    // it's a pure function of the document, not a DOM), so shapes are located here by their own
    // `<g transform="translate(x, y) ...">` wrapper instead, keyed on the distinct `point` each
    // was created at above.
    const fontSizeOf = (svg, translateMarker) => {
      const idx = svg.indexOf(translateMarker)
      const slice = svg.slice(idx, idx + 1200)
      return Number(slice.match(/font-size="([\d.]+)"/)?.[1])
    }

    // Not just a string-contains check: render the headless SVG itself to a second screenshot,
    // the same "look at it, don't just assert on it" discipline `export.js` established for the
    // exact same reason — the live `alignItems` bug this scenario's own first draft caught (see
    // TextLabel.tsx's comment) was invisible to every string/attribute assertion and only showed
    // up in a rendered picture. `renderShapeLabel`'s `verticalAlign`/`autoFit` arithmetic is new
    // code with no such screenshot precedent yet.
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.setContent(`<!doctype html><html><body style="margin:0">${headless}</body></html>`)
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'typography-headless.png') })

    return {
      fitStyle,
      fitLive,
      listRawText: listShape.text,
      listRenderedText,
      fontTextStyle,
      fontTextComputedFont,
      themeBefore,
      faceBefore,
      themeAfter: 'ivory-editorial',
      faceAfter,
      // The live-render assertion the fontToken mechanism is actually for: the theme switch above
      // touched nothing on `token-rect` except `document.theme` — no shape was written to — yet
      // its rendered face changed, because `fontToken` resolves lazily every render.
      themeSwitchRestyledFont: faceBefore !== faceAfter,
      tokenRectFontUnbaked: tokenRectStyleAfter.font === undefined,
      headless: {
        length: headless.length,
        hasBulletMarkers: headless.includes('•  Alpha') && headless.includes('•  Beta'),
        hasLetterSpacing: headless.includes('letter-spacing="0.08em"'),
        hasCustomFontFamily: headless.includes('font-family="Georgia, serif"'),
        hasThemeHeadingFace: headless.includes('font-family="Crimson Pro"'), // ivory-editorial's heading
        autoFitShrunk:
          fontSizeOf(headless, 'translate(80, 80)') < fontSizeOf(headless, 'translate(80, 320)'),
      },
    }
  },
}
