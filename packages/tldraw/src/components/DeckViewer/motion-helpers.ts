import { AnimationEffect } from '~types'
// Leaf import, not the `~blocks` barrel — see the comment at the top of `DeckViewer.tsx` for why.
import type { MotionKeyframes, MotionState } from '~blocks/motion/driver'

/**
 * Block-level entrance states for `<DeckViewer>`'s build-step playback, mirroring
 * `components/Presentation/PresentationRuntime.tsx`'s `hiddenStyle`/`settleVisible` helpers —
 * same four `AnimationEffect`s, same allowed-property vocabulary — but expressed as
 * `MotionState`/`MotionKeyframes` for a `MotionDriver` instead of direct `el.style` writes, since
 * `<DeckViewer>` has no editor DOM node to reach into imperatively; it owns its own tree and
 * drives it through the driver contract everywhere.
 *
 * Only `opacity`, `translate`, `scale`, `clip-path` are used — never `transform` — matching the
 * driver's allowed vocabulary (`blocks/motion/driver.ts`).
 *
 * **`clipPath` is deliberately omitted from every state object below except `Wipe`'s.** This
 * works around a real bug found while building this component: `waapi-driver.ts`'s
 * `assertAllowedKeyframes`/`assertAllowedState` check `Object.keys(...)` — which, for the
 * `MotionKeyframes`/`MotionState` TypeScript interfaces, are the camelCase names `clipPath` /
 * `strokeDashoffset` — directly against `ALLOWED_PROPERTIES`, which lists the CSS/kebab-case
 * spellings `'clip-path'` / `'stroke-dashoffset'`. `KEYFRAME_MAP` (the camelCase → kebab-case
 * table already defined in that same file) is applied when *building* the WAAPI keyframes, but
 * never before the allow-list check, so passing a `clipPath` key — the only spelling the
 * TypeScript type permits — always throws `forbidden state property "clipPath"`, regardless of
 * its value. `blocks/motion/**` is out of scope for this task (owned by another lane), so this
 * file avoids ever emitting that key for the three effects (`FadeIn`/`SlideIn`/`ZoomIn`) that
 * don't need it — which is also all `blockToShape` currently ever produces (it hardcodes
 * `AnimationEffect.FadeIn`, see its own comment) — rather than crash every build-step transition.
 * `Wipe` still sets it, since a clip-path effect is meaningless without it; that path will hit
 * the same bug if `blockToShape` is ever extended to emit `Wipe`, and is reported as a named
 * finding rather than silently worked around further.
 */

/** The state a shape is in before its build step has been revealed. */
export function hiddenState(effect: AnimationEffect): MotionState {
  switch (effect) {
    case AnimationEffect.SlideIn:
      return { opacity: 0, translate: '0px 32px', scale: 1 }
    case AnimationEffect.ZoomIn:
      return { opacity: 0, translate: '0px 0px', scale: 0.7 }
    case AnimationEffect.Wipe:
      return { opacity: 1, translate: '0px 0px', scale: 1, clipPath: 'inset(0 100% 0 0)' }
    case AnimationEffect.FadeIn:
    default:
      return { opacity: 0, translate: '0px 0px', scale: 1 }
  }
}

/** The settled, fully-revealed state every effect converges to. `effect` picks whether
 *  `clipPath` needs resetting to fully-open (only meaningful after a `Wipe`). */
export function visibleState(effect?: AnimationEffect): MotionState {
  if (effect === AnimationEffect.Wipe) {
    return { opacity: 1, translate: '0px 0px', scale: 1, clipPath: 'inset(0 0 0 0)' }
  }
  return { opacity: 1, translate: '0px 0px', scale: 1 }
}

/** Build `MotionKeyframes` (from → to) for a shape's entrance, for `driver.play()`. Only
 *  includes a property when the effect actually moves it, so the driver's forbidden-property
 *  assertion never sees an accidental no-op key. */
export function entranceKeyframes(effect: AnimationEffect): MotionKeyframes {
  const from = hiddenState(effect)
  const to = visibleState(effect)
  const kf: MotionKeyframes = {}
  if (from.opacity !== to.opacity) kf.opacity = [from.opacity ?? 1, to.opacity ?? 1]
  if (from.translate !== to.translate) kf.translate = [from.translate ?? '0px 0px', to.translate ?? '0px 0px']
  if (from.scale !== to.scale) kf.scale = [from.scale ?? 1, to.scale ?? 1]
  if (from.clipPath !== undefined && to.clipPath !== undefined && from.clipPath !== to.clipPath) {
    kf.clipPath = [from.clipPath, to.clipPath]
  }
  return kf
}
