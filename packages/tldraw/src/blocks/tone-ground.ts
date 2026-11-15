/**
 * S13-H — a toned slide (`SlideSpec.tone` deep / accent) paints the tone's own ground, but a style master carries a page
 * background of its own (a pale vignette on the minimal cover, a navy band on the corporate one) and used to win: on a
 * light master the deep tone's light text sat on a light ground and the check, sampling the master, did not always
 * see it. The master keeps its page only when the tone's text reads (≥ 4.5:1) on **every** colour it paints (each
 * stop of a gradient); otherwise the tone's ground replaces it. Pure.
 */
import { resolveThemeColor } from '~state/shapes/shared'
import type { DeckTheme } from '~types'
import { hexContrast } from './palettes'
import type { Paint } from './types'

export function masterReadsUnderTone(background: Paint | undefined, toneTheme: Pick<DeckTheme, 'colors' | 'id'>): boolean {
  if (!background) return true
  const colors = background.type === 'solid' ? [background.color] : background.stops.map((s) => s.color)
  const text = toneTheme.colors.text
  return colors.every((c) => {
    const hex = resolveThemeColor(c, toneTheme as DeckTheme) ?? c
    return /^#[0-9a-f]{6}$/i.test(hex) && /^#[0-9a-f]{6}$/i.test(text) ? hexContrast(text, hex) >= 4.5 : true
  })
}

/** The page paint of a deep / accent slide that sets no background of its own: the master's page when the tone's text
 *  reads on it, else the tone's ground as a solid (the renderers paint no page rect for an undefined background, so a
 *  masterless style's deep cover used to sit on the deck's light ground). */
export function tonePageBackground(masterBackground: Paint | undefined, toneTheme: Pick<DeckTheme, 'colors' | 'id'>): Paint {
  return masterBackground && masterReadsUnderTone(masterBackground, toneTheme)
    ? masterBackground
    : { type: 'solid', color: toneTheme.colors.background }
}
