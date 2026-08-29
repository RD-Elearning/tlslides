import { renderPageToSvg, toBase64Utf8 } from '~state/render'
import { adjacentPresentableSlideId, computeBuildSteps } from './presentation'
import type { TldrawApp } from '../internal'

/**
 * Phase 16 (T16.5) — the presenter view. **Decision: a separate `window.open` popup, not an
 * in-app split view.** A host or presenter routinely wants this on a second monitor (the room's
 * projector shows the main window fullscreen, the presenter's own laptop screen shows this) —
 * that's only possible with a real second OS-level window, which an in-app split pane can never
 * be, no matter how it's laid out. The brief's own suggested trade-off (simpler but less useful)
 * is exactly what this trades away.
 *
 * **What this cannot do, stated plainly rather than discovered later:**
 * - It needs a real browser popup, which needs a user gesture and can be silently blocked — this
 *   returns `false` rather than throwing when `window.open` refuses, but there is no way to make
 *   a blocked popup open anyway; the caller has to surface that to the user itself.
 * - It's same-origin-only by construction (it calls straight back into this `TldrawApp` instance
 *   across the window boundary — see below), so it cannot run on a genuinely separate machine
 *   the way a real "presenter mode over the network" would; "a second display" here means a
 *   second monitor on the *same* machine, extended or mirrored, not a remote viewer.
 * - It polls this app's state every 300ms (see `POLL_MS`) rather than subscribing to a dedicated
 *   event, so a build-step/slide change can lag the main window by up to that long. Chosen over
 *   adding a whole new `Deck` event for one popup's own refresh — `Deck.onDeckChange`/
 *   `selectionChanged` already exist for real subscribers; this is simpler and a few hundred
 *   milliseconds of lag is imperceptible for a slide/notes panel a presenter glances at, not
 *   something driving an animation.
 * - If the main tab is closed or navigates away, the popup is orphaned (this module closes it on
 *   `beforeunload`, best-effort, but a crash or a forced-kill of the tab can't run that handler).
 * - Only one presenter view at a time per `TldrawApp`: opening a second call reuses/refocuses the
 *   existing popup rather than opening two, since two windows racing to poll and re-render the
 *   same state would be confusing, not useful.
 *
 * **Why direct function calls, not `postMessage`/`BroadcastChannel`.** The popup is opened with
 * `window.open('', ...)` and its document is written by this module, in the same origin, in the
 * same JavaScript realm family as the opener — `popup.opener === window` holds. That means a
 * function value (not a string to `eval`) can be handed straight to the popup's own button
 * `onclick`, and read back on every poll tick with no serialization, no message-passing
 * boilerplate, and no risk of a stale/queued message arriving after the popup's been closed and
 * reopened. This is *not* available to a host's own remote/cross-origin viewer — that case is
 * exactly what `Deck.getThumbnail`/`Deck.on(...)`/`Deck.getPresentationState()` are for.
 */
const POLL_MS = 300

// Keyed by `TldrawApp` instance, not a bare module-level variable: a page can mount more than one
// `<Tldraw>` (a gallery of decks, a multiplayer demo, ...), and each one's `app.deck.
// openPresenterView()` must open its *own* popup rather than refocusing another editor's. A
// `WeakMap` also means a popup for an editor that's since been unmounted is never kept alive by
// this module.
const openPopups = new WeakMap<TldrawApp, { popup: Window; pollHandle: ReturnType<typeof setInterval> }>()

export function openPresenterView(app: TldrawApp): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  const existing = openPopups.get(app)
  if (existing && !existing.popup.closed) {
    existing.popup.focus()
    return true
  }

  // See `TldrawApp.suppressNextFullscreenExit`'s doc comment: opening this popup can itself cause
  // the browser to silently exit fullscreen, which must not also exit presentation mode.
  app.suppressNextFullscreenExit()
  const popup = window.open('', 'tlslides-presenter', 'width=980,height=640')
  if (!popup) return false

  popup.document.title = 'Presenter view'
  popup.document.body.style.margin = '0'
  popup.document.body.style.background = '#111318'
  popup.document.body.style.color = '#e7e9ee'
  popup.document.body.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

  const root = buildShell(popup)

  root.previousButton.onclick = () => app.previousPresentation()
  root.nextButton.onclick = () => app.advancePresentation()
  root.resetTimerButton.onclick = () => {
    root.timerStartedAt = Date.now()
  }

  const tick = () => {
    if (popup.closed) {
      const entry = openPopups.get(app)
      if (entry) clearInterval(entry.pollHandle)
      openPopups.delete(app)
      return
    }
    renderPresenterView(app, popup, root)
    const elapsedMs = Date.now() - root.timerStartedAt
    root.timer.textContent = formatElapsed(elapsedMs)
  }
  tick()
  const pollHandle = setInterval(tick, POLL_MS)
  openPopups.set(app, { popup, pollHandle })

  const closeOnMainUnload = () => popup.close()
  window.addEventListener('beforeunload', closeOnMainUnload)
  popup.addEventListener('unload', () => {
    window.removeEventListener('beforeunload', closeOnMainUnload)
  })

  return true
}

/* -------------------------------------------------- */
/*                        DOM                          */
/* -------------------------------------------------- */

interface PresenterRoot {
  currentImg: HTMLImageElement
  currentLabel: HTMLDivElement
  nextImg: HTMLImageElement
  nextLabel: HTMLDivElement
  notes: HTMLDivElement
  buildLabel: HTMLDivElement
  timer: HTMLDivElement
  previousButton: HTMLButtonElement
  nextButton: HTMLButtonElement
  resetTimerButton: HTMLButtonElement
  timerStartedAt: number
}

// Builds the popup's static shell once via real DOM APIs (`createElement`/`textContent`), never
// `innerHTML` — every dynamic value this view shows (a slide's name, its notes) is a document
// author's own content, not attacker-controlled, but there is no reason to open an HTML-injection
// hole in a window this package fully owns for the sake of a shortcut.
function buildShell(popup: Window): PresenterRoot {
  const doc = popup.document
  const container = doc.createElement('div')
  container.style.cssText = 'display:flex;flex-direction:column;height:100vh;box-sizing:border-box;padding:12px;gap:10px;'

  const header = doc.createElement('div')
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;'
  const buildLabel = doc.createElement('div')
  buildLabel.style.cssText = 'font-size:13px;opacity:0.75;'
  const timerRow = doc.createElement('div')
  timerRow.style.cssText = 'display:flex;align-items:center;gap:8px;'
  const timer = doc.createElement('div')
  timer.style.cssText = 'font-variant-numeric:tabular-nums;font-size:20px;'
  const resetTimerButton = doc.createElement('button')
  resetTimerButton.textContent = 'Reset timer'
  styleButton(resetTimerButton)
  timerRow.append(timer, resetTimerButton)
  header.append(buildLabel, timerRow)

  const stage = doc.createElement('div')
  stage.style.cssText = 'display:flex;gap:12px;flex:1;min-height:0;'

  const currentPane = doc.createElement('div')
  currentPane.style.cssText = 'flex:3;display:flex;flex-direction:column;gap:6px;min-width:0;'
  const currentLabel = doc.createElement('div')
  currentLabel.style.cssText = 'font-size:13px;opacity:0.75;'
  const currentImg = doc.createElement('img')
  currentImg.style.cssText = 'width:100%;flex:1;object-fit:contain;background:#fff;border-radius:4px;min-height:0;'
  currentPane.append(currentLabel, currentImg)

  const sidePane = doc.createElement('div')
  sidePane.style.cssText = 'flex:2;display:flex;flex-direction:column;gap:10px;min-width:0;'

  const nextLabel = doc.createElement('div')
  nextLabel.style.cssText = 'font-size:13px;opacity:0.75;'
  const nextImg = doc.createElement('img')
  nextImg.style.cssText = 'width:100%;max-height:35%;object-fit:contain;background:#fff;border-radius:4px;'

  const notesLabel = doc.createElement('div')
  notesLabel.textContent = 'Speaker notes'
  notesLabel.style.cssText = 'font-size:13px;opacity:0.75;'
  const notes = doc.createElement('div')
  notes.style.cssText =
    'flex:1;overflow:auto;white-space:pre-wrap;background:#1b1e26;border-radius:4px;padding:10px;font-size:15px;line-height:1.4;'

  sidePane.append(nextLabel, nextImg, notesLabel, notes)
  stage.append(currentPane, sidePane)

  const controls = doc.createElement('div')
  controls.style.cssText = 'display:flex;gap:8px;justify-content:center;'
  const previousButton = doc.createElement('button')
  previousButton.textContent = '← Back'
  const nextButton = doc.createElement('button')
  nextButton.textContent = 'Next →'
  ;[previousButton, nextButton].forEach(styleButton)
  controls.append(previousButton, nextButton)

  container.append(header, stage, controls)
  doc.body.appendChild(container)

  return {
    currentImg,
    currentLabel,
    nextImg,
    nextLabel,
    notes,
    buildLabel,
    timer,
    previousButton,
    nextButton,
    resetTimerButton,
    timerStartedAt: Date.now(),
  }
}

function styleButton(button: HTMLButtonElement) {
  button.style.cssText =
    'padding:8px 16px;border-radius:6px;border:1px solid #444;background:#22252d;color:#e7e9ee;font-size:14px;cursor:pointer;'
}

function renderPresenterView(app: TldrawApp, popup: Window, root: PresenterRoot): void {
  const page = app.page
  const opts = { assets: app.document.assets, theme: app.document.theme, defaultPageSize: app.document.defaultPageSize }

  root.currentLabel.textContent = `Now — ${page.name ?? 'Untitled slide'}`
  root.currentImg.src = toDataUrl(renderPageToSvg(page, opts))

  const nextId = adjacentPresentableSlideId(app.document.pages, page.id, 1)
  const nextPage = nextId ? app.document.pages[nextId] : undefined
  if (nextPage) {
    root.nextLabel.textContent = `Next — ${nextPage.name ?? 'Untitled slide'}`
    root.nextImg.src = toDataUrl(renderPageToSvg(nextPage, opts))
    root.nextImg.style.visibility = 'visible'
  } else {
    root.nextLabel.textContent = 'Next — (last slide)'
    root.nextImg.style.visibility = 'hidden'
  }

  root.notes.textContent = page.notes || '(no notes for this slide)'

  const steps = computeBuildSteps(page)
  root.buildLabel.textContent = !app.settings.isPresentationMode
    ? 'Not presenting yet'
    : steps.length > 0
      ? `Build ${Math.min(app.appState.presentationBuildStep, steps.length)} / ${steps.length}`
      : 'Presenting'

  // Keep the popup's own tab title current even while the presenter isn't looking at it.
  popup.document.title = `Presenting — ${page.name ?? 'Untitled slide'}`
}

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${toBase64Utf8(svg)}`
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
