import { LETTER_SPACING, DEFAULT_LINE_HEIGHT } from '~constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let melm: any

function getMeasurementDiv() {
  // A div used for measurement
  document.getElementById('__textLabelMeasure')?.remove()

  const pre = document.createElement('pre')
  pre.id = '__textLabelMeasure'

  Object.assign(pre.style, {
    whiteSpace: 'pre',
    width: 'auto',
    border: '1px solid transparent',
    padding: '4px',
    margin: '0px',
    letterSpacing: LETTER_SPACING,
    opacity: '0',
    position: 'absolute',
    top: '-500px',
    left: '0px',
    zIndex: '9999',
    pointerEvents: 'none',
    userSelect: 'none',
    alignmentBaseline: 'mathematical',
    dominantBaseline: 'mathematical',
  })

  pre.tabIndex = -1

  document.body.appendChild(pre)
  return pre
}

if (typeof window !== 'undefined') {
  melm = getMeasurementDiv()
}

let prevText = ''
let prevFont = ''
// Phase 17 — letter-spacing/line-height now feed into the measurement, not just the module-level
// constant baked into `getMeasurementDiv` above (that Object.assign only ever ran once, at module
// load, so before this phase `melm`'s own letter-spacing/line-height silently never changed no
// matter what a caller passed — harmless while both were fixed constants, a real mismatch the
// moment `ShapeStyles.letterSpacing`/`lineHeight` became overridable: a shape rendered wider/taller
// than its own measured label-centering box would report). Included in the memo cache key for the
// same reason `font` already is.
let prevLetterSpacing = LETTER_SPACING
let prevLineHeight = DEFAULT_LINE_HEIGHT
let prevSize = [0, 0]

export function clearPrevSize() {
  prevText = ''
}

export function getTextLabelSize(
  text: string,
  font: string,
  letterSpacing: string = LETTER_SPACING,
  lineHeight: number = DEFAULT_LINE_HEIGHT
) {
  if (!text) {
    return [16, 32]
  }

  if (!melm) {
    // We're in SSR
    return [10, 10]
  }

  if (!melm.parent) document.body.appendChild(melm)

  if (
    text === prevText &&
    font === prevFont &&
    letterSpacing === prevLetterSpacing &&
    lineHeight === prevLineHeight
  ) {
    return prevSize
  }

  prevText = text
  prevFont = font
  prevLetterSpacing = letterSpacing
  prevLineHeight = lineHeight

  melm.textContent = text
  melm.style.font = font
  melm.style.letterSpacing = letterSpacing
  melm.style.lineHeight = String(lineHeight)

  // In tests, offsetWidth and offsetHeight will be 0
  const width = melm.offsetWidth || 1
  const height = melm.offsetHeight || 1

  prevSize = [width, height]
  return prevSize
}
