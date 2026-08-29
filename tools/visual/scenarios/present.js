/* eslint-disable no-console */
/**
 * Phase 16 — the presentation runtime: build-order animation playback (T16.1), the `AnimateMenu`
 * authoring panel (T16.2), speaker notes (T16.3), `skipInPresentation` (T16.4), and the presenter
 * view popup (T16.5), driven through the real UI and the app instance together, the way
 * `background.js`/`deckapi.js` do. This scenario actually *enters* presentation mode and
 * *advances* through build steps rather than only asserting a button/menu exists — the brief's own
 * bar for this phase.
 *
 * Uses the /develop route for `window.app` (see frame.js's comment on why).
 */
const path = require('path')

module.exports = {
  route: '/#/develop',
  async run(page) {
    const firstPageId = await page.evaluate(() => window.app.currentPageId)

    // --- Setup: two animated shapes on slide 1, a skipped slide 2, a plain slide 3 -------------
    await page.evaluate((slideId) => {
      window.app.createShapes(
        { id: 'build-a', type: 'rectangle', point: [200, 200], size: [220, 120] },
        { id: 'build-b', type: 'rectangle', point: [500, 200], size: [220, 120] }
      )
      // T16.1 — onClick then afterPrevious: the second shape must reveal itself with no further
      // click once the first has finished, which is the one observable difference this phase asked
      // for between `afterPrevious` and `withPrevious`.
      window.app.setShapeAnimation(
        { effect: 'fadeIn', trigger: 'onClick', order: 0, durationMs: 150, delayMs: 0 },
        ['build-a']
      )
      window.app.setShapeAnimation(
        { effect: 'slideIn', trigger: 'afterPrevious', order: 1, durationMs: 150, delayMs: 0 },
        ['build-b']
      )
      window.app.setPageNotes(slideId, 'Say hi. Take a breath. Advance on cue.')
      window.app.selectNone()

      // The /develop harness's document already ships a second slide ("slide2") — mark it
      // skipped too, so "Next" from slide1 has to skip *two* consecutive slides in a row to reach
      // final-slide, not just one (a stronger check than skipping a single adjacent slide).
      window.app.setPageSkipInPresentation('slide2', true)
      window.app.createPage('skip-slide')
      window.app.setPageSkipInPresentation('skip-slide', true)
      window.app.createPage('final-slide')
      window.app.changePage(slideId)
    }, firstPageId)
    await page.waitForTimeout(200)

    // --- T16.4 — the skip badge, checked in the editor (the deck panel is hidden while
    // presenting, so this has to happen before entering presentation mode). --------------------
    const skipBadgeVisible = await page.evaluate(() => {
      const rows = document.querySelectorAll('#TD-DeckPanel [data-page-id]')
      return Array.from(rows).some((row) => row.textContent.includes('Skipped'))
    })

    // --- T16.2 — AnimateMenu, driven through the real dropdown, on a third, unanimated shape ---
    await page.evaluate(() => {
      window.app.createShapes({ id: 'authored', type: 'rectangle', point: [850, 500], size: [150, 90] })
      window.app.select('authored')
    })
    await page.waitForTimeout(150)
    await page.click('#TD-Animate')
    await page.waitForSelector('#TD-Animate-Effect-Select', { timeout: 5000 })
    await page.selectOption('#TD-Animate-Effect-Select', 'zoomIn')
    await page.waitForTimeout(100)
    await page.selectOption('#TD-Animate-Trigger-Select', 'withPrevious')
    await page.waitForTimeout(100)
    await page.fill('#TD-Animate-Duration-Input', '250')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)
    const authoredAnimation = await page.evaluate(() => window.app.getShape('authored').animation)
    await page.keyboard.press('Escape')
    // Only 'authored' should be a build step so far, until it's removed below — this shape isn't
    // part of the presentation-flow assertions past this point, so clear it rather than let a
    // third, unrelated step complicate the build-step math below.
    await page.evaluate(() => {
      window.app.setShapeAnimation(undefined, ['authored'])
      window.app.selectNone()
    })
    await page.waitForTimeout(150)

    // --- T16.3 — speaker notes, driven through PageOptionsDialog's real textarea ---------------
    await page.click('#TD-Page')
    await page.waitForTimeout(150)
    await page.click('button[data-shy="true"]')
    await page.waitForSelector('#TD-PageOptions-Notes', { timeout: 5000 })
    const notesBeforeEdit = await page.inputValue('#TD-PageOptions-Notes')
    await page.fill('#TD-PageOptions-Notes', 'Updated notes via the real textarea.')
    // Tab must move focus within the dialog, not leak to the canvas as a shortcut (the same
    // stopKeyPropagationUnlessEscape check `deckapi.js` runs on its own hex field) — checked via
    // the shape count immediately after, which must be unchanged.
    const shapeCountBeforeTab = await page.evaluate(
      () => Object.keys(window.app.document.pages[window.app.currentPageId].shapes).length
    )
    await page.keyboard.press('Tab')
    const shapeCountAfterTab = await page.evaluate(
      () => Object.keys(window.app.document.pages[window.app.currentPageId].shapes).length
    )
    await page.click('text=Cancel')
    await page.waitForTimeout(150)
    const notesAfterEdit = await page.evaluate(() => window.app.page.notes)

    // --- Enter presentation mode and walk the build ---------------------------------------------
    await page.evaluate(() => window.app.togglePresentationMode())
    await page.waitForTimeout(300)

    const opacityOf = (id) =>
      page.evaluate((shapeId) => getComputedStyle(document.getElementById(shapeId)).opacity, id)

    const atEntry = {
      isPresentationMode: await page.evaluate(() => window.app.settings.isPresentationMode),
      buildStep: await page.evaluate(() => window.app.appState.presentationBuildStep),
      aOpacity: await opacityOf('build-a'),
      bOpacity: await opacityOf('build-b'),
    }
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'present-step0.png') })

    // Advance once (the BottomPanel button, not the API — this is the actual UI surface a
    // presenter clicks): reveals build-a (onClick) only, for now.
    await page.click('#TD-NavigationTools-NextPage')
    // Deliberately well before build-a's own 150ms transition finishes (and therefore before the
    // `afterPrevious` chain delay — tied to that same duration — can have fired): build-a should
    // already be underway, build-b must still be untouched, not "also starting."
    await page.waitForTimeout(40)
    const afterFirstAdvance = {
      buildStep: await page.evaluate(() => window.app.appState.presentationBuildStep),
      aOpacityIsAnimatingIn: (await opacityOf('build-a')) !== '0',
      bOpacityUntouched: (await opacityOf('build-b')) === '0',
    }
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'present-step1.png') })

    // No second click: build-b is `afterPrevious`, so it must reveal itself once build-a's own
    // animation (150ms) has finished — the concrete, observable difference from `withPrevious`.
    // Well past both shapes' own 150ms transitions (300ms total from the click).
    await page.waitForTimeout(500)
    const afterAutoChain = {
      buildStep: await page.evaluate(() => window.app.appState.presentationBuildStep),
      aOpacity: await opacityOf('build-a'),
      bOpacity: await opacityOf('build-b'),
    }
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'present-step2.png') })

    const buildIndicatorText = await page.textContent('#TD-BuildStepIndicator')

    // Every step revealed — "Next" now advances the *slide*, skipping skip-slide entirely.
    await page.click('#TD-NavigationTools-NextPage')
    await page.waitForTimeout(200)
    const afterSlideAdvance = {
      currentPageId: await page.evaluate(() => window.app.currentPageId),
      buildStep: await page.evaluate(() => window.app.appState.presentationBuildStep),
    }

    // "Back" from a fresh slide (no steps revealed here) returns to slide 1 **fully built**, not
    // at its own first step — see TldrawApp.previousPresentation's doc comment.
    await page.click('#TD-NavigationTools-PreviousPage')
    await page.waitForTimeout(200)
    const afterBack = {
      currentPageId: await page.evaluate(() => window.app.currentPageId),
      buildStep: await page.evaluate(() => window.app.appState.presentationBuildStep),
      aOpacity: await opacityOf('build-a'),
      bOpacity: await opacityOf('build-b'),
    }

    // --- T16.6 — cycle the slide transition control -------------------------------------------
    const transitionBefore = await page.evaluate(() => window.app.settings.presentationTransition)
    await page.click('#TD-CycleTransition')
    await page.waitForTimeout(100)
    const transitionAfterOneClick = await page.evaluate(() => window.app.settings.presentationTransition)

    // --- T16.5 — presenter view, opened from the real button, mid-presentation -----------------
    const [popup] = await Promise.all([
      page.context().waitForEvent('page'),
      page.click('#TD-OpenPresenterView'),
    ])
    await popup.waitForLoadState()
    await popup.waitForTimeout(400)

    const presenterView = {
      // The real, load-bearing regression check: opening the popup must not itself end the
      // presentation (see TldrawApp.suppressNextFullscreenExit's doc comment for why opening any
      // new window can otherwise trigger the browser's own fullscreen-exit, which this fork's
      // pre-existing `fullscreenchange` listener would then read as "the user left presentation
      // mode").
      mainStillPresenting: await page.evaluate(() => window.app.settings.isPresentationMode),
      hasNotes: await popup.evaluate(() =>
        document.body.textContent.includes('Updated notes via the real textarea.')
      ),
      title: await popup.title(),
    }
    await popup.screenshot({ path: path.join(__dirname, '..', 'shots', 'present-presenter-view.png') })

    // Drive the main window from the popup's own "Next" button.
    await popup.click('text=Next →')
    await page.waitForTimeout(200)
    const afterPopupNext = {
      buildStep: await page.evaluate(() => window.app.appState.presentationBuildStep),
      currentPageId: await page.evaluate(() => window.app.currentPageId),
    }

    await popup.close()
    await page.evaluate(() => window.app.exitPresentationMode())
    await page.waitForTimeout(200)
    const afterExit = {
      isPresentationMode: await page.evaluate(() => window.app.settings.isPresentationMode),
      // Leaving presentation mode must restore full visibility — animation must never leak into
      // ordinary editing (T16.1's hard requirement).
      aOpacity: await opacityOf('build-a'),
      bOpacity: await opacityOf('build-b'),
    }

    return {
      skipBadgeVisible,
      authoredAnimation,
      notes: { notesBeforeEdit, notesAfterEdit, shapeCountUnchangedByTab: shapeCountAfterTab === shapeCountBeforeTab },
      atEntry,
      afterFirstAdvance,
      afterAutoChain,
      buildIndicatorText,
      afterSlideAdvance,
      afterBack,
      transition: { transitionBefore, transitionAfterOneClick },
      presenterView,
      afterPopupNext,
      afterExit,
    }
  },
}
