import { renderSvgToPng, toBase64Utf8 } from './renderSvgToPng'

describe('renderSvgToPng', () => {
  it('resolves undefined rather than throwing when no real canvas rasterizer is available', async () => {
    // jsdom (this suite's environment) has `document` but no real `<canvas>` 2D context — see the
    // matching note in `Deck.spec.ts`. A genuine Node environment (no `document` at all) is
    // covered by `renderPageToSvg.node.spec.ts`'s own `@jest-environment node` file; this module
    // has no separate Node-only behaviour worth a second forced-environment file. jsdom logs a
    // "not implemented" console.error for the attempted `getContext('2d')` call — expected, and
    // silenced here so it doesn't read as a real test failure in CI output.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {
      // no-op: deliberately silencing the expected jsdom "not implemented" log (see note above)
    })
    try {
      await expect(renderSvgToPng('<svg></svg>', 100, 100)).resolves.toBeUndefined()
    } finally {
      spy.mockRestore()
    }
  })
})

describe('toBase64Utf8', () => {
  it('round-trips non-Latin1 characters that would make plain btoa throw', () => {
    const value = 'Q3 Report — 品質 — 100% 📈'
    const encoded = toBase64Utf8(value)
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
    expect(decoded).toBe(value)
  })
})
