// Phase 15 — the PNG half of T15.3, and the one piece of this phase that is **browser-only by
// necessity, not by omission.** `renderPageToSvg` (the sibling module) is a pure function that
// runs anywhere; turning its *output* into a raster image is a different problem with no
// dependency-free answer that works in both environments:
//
// - In a browser, rasterizing SVG is built in: decode it as an `<img>`, draw that image to a
//   `<canvas>`, and read the canvas back out as a PNG data URL. No extra dependency at all — this
//   module is ~20 lines because the browser already does the hard part.
// - In Node, there is no built-in equivalent. Every real option is either a native binary/binding
//   (`sharp`, `resvg-js`, the `canvas` npm package) or a full headless browser (`puppeteer`,
//   `playwright`) — exactly the "heavyweight dependency" this phase's brief says not to add
//   without justifying it. None of the four is obviously the right default for a package that
//   doesn't otherwise care what server framework or deployment target hosts it, so none is added
//   here. See `guides/nextjs-integration.md` for the worked example of wiring one of them up
//   host-side, and `reviews/roadmap-slides.md`'s Phase 15 section for why this was scoped this
//   way rather than picking one.
//
// The function below is therefore async (real image decode is inherently asynchronous — there is
// no synchronous browser API for it) and **explicit about its own boundary in its signature and
// return value**, not just in prose: it resolves to `undefined` in any environment without a
// `document`/`Image`/`canvas`, exactly like `Deck.getThumbnail`'s own established convention for
// "this needs a browser and we're not in one" (return `undefined`, never throw).

/** Options for `renderSvgToPng`. */
export interface RenderSvgToPngOptions {
  /** Multiplies the SVG's own pixel dimensions before rasterizing — `2` (the default) matches
   *  `TldrawApp.exportShapesAs`'s own PNG export, which doubles for a retina-sharp result. */
  scale?: number
}

/**
 * Rasterize an SVG string (e.g. `renderPageToSvg`'s own output) to a `data:image/png;base64,...`
 * URL, via a `<canvas>` — **browser-only**. Resolves to `undefined` in Node (or any environment
 * without `document`), rather than throwing, matching `Deck.getThumbnail`'s convention.
 */
export function renderSvgToPng(
  svg: string,
  width: number,
  height: number,
  opts: RenderSvgToPngOptions = {}
): Promise<string | undefined> {
  if (typeof document === 'undefined') return Promise.resolve(undefined)
  const scale = opts.scale ?? 2

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      resolve(undefined)
      return
    }
    const image = new Image()
    image.onload = () => {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => resolve(undefined)
    const base64 = toBase64Utf8(svg)
    image.src = `data:image/svg+xml;base64,${base64}`
  })
}

/** Unicode-safe base64 encoding that works in both a browser (`btoa`) and Node (`Buffer`) —
 *  needed because `btoa` alone throws on any non-Latin1 character (an em dash in a slide's own
 *  text is enough to trigger it), and plain Node has no `btoa` before v16. Shared with `Deck.
 *  getThumbnail`'s `dataUrl` format for the same reason. */
export function toBase64Utf8(value: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(value, 'utf-8').toString('base64')
  return btoa(unescape(encodeURIComponent(value)))
}
