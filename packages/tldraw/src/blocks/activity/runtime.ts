/**
 * L03 — the activity runtime contract (types live in `../types`: `ActivityRuntime`, `ActivityState`,
 * `ActivityLabels`, `ActivityEvent`, `SubmitMode`, `DeckSpec.activity`).
 *
 * Who does what:
 * - A block (`library/activity/*`) supplies a pure `template()` (markup; real `<button>`s with
 *   `data-act`), a poster (the static look for the editor, thumbnails, PNG and PDF) and `interact()`.
 * - `render-dom.tsx` (`HostMount`) calls `interact(root, runtime, props)` ONLY when
 *   `HostLayoutContext.activity` is set; it re-wires after a re-template (`update`).
 * - DeckViewer (learning L04) provides `HostLayoutContext.activity`: a factory `(blockKey) =>
 *   ActivityRuntime` whose `getState/setState` keep one state object per block for the viewer's
 *   lifetime, whose `submit` is the block prop → `DeckSpec.activity.submit` → `'instant'`, and
 *   whose `labels` come from `activityLabels(tokens.locale)`.
 *
 * Pointer events: this file's task (L03) did NOT verify how the viewer's slide root treats
 * pointer events for host blocks (the editor's `Deck.tsx` sets `pointerEvents: 'none'` on its
 * overlay and `'all'` on the content). L04 owns that: an activity block root needs
 * `pointer-events: auto` in interactive mode only, and the viewer's click-to-advance must ignore
 * clicks on a slide that holds an activity (decision D7).
 */
export {}
