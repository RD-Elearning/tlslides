import { NextApiRequest, NextApiResponse } from 'next'
import chromium from 'chrome-aws-lambda'
import Cors from 'cors'
import { TDExport, TDExportTypes, TldrawApp } from '@tlslides/tldraw'

const cors = Cors({
  methods: ['POST'],
})

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: (req: NextApiRequest, res: NextApiResponse, fn: (args: any) => any) => any
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result)
      return resolve(result)
    })
  })
}

// This is the URL the headless browser navigates to in order to render a slide for export. It
// must resolve to this app's own frontend, never to tldraw.com. Prefer an explicit
// NEXT_PUBLIC_BASE_URL, then Vercel's auto-provided VERCEL_URL (which comes without a scheme, so
// we prefix it), and finally localhost as a last resort for local development.
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

const FRONTEND_URL = `${BASE_URL}/?exportMode`

declare global {
  interface Window {
    app: TldrawApp
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors)
  const { body } = req
  const {
    size: [width, height],
    type,
  } = body
  // PDF export is not implemented; 501 is the correct status for a feature that does not exist
  // (as opposed to 500, which implies something went wrong while attempting it). The UI never
  // offers PDF (see Menu.tsx), but this guard stays as a safety net for direct API callers.
  if (type === TDExportTypes.PDF) {
    res.status(501).send('Not implemented yet.')
    return
  }
  try {
    const browser = await chromium.puppeteer.launch({
      slowMo: 50,
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      ignoreHTTPSErrors: true,
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36'
    )
    await page.goto(FRONTEND_URL, { timeout: 15 * 1000, waitUntil: 'networkidle0' })
    await page.setViewport({ width: Math.floor(width), height: Math.floor(height) })
    await page.evaluateHandle('document.fonts.ready')
    let err: string
    await page.evaluate(async (body: TDExport) => {
      try {
        let app = window.app
        if (!app) app = await new Promise((resolve) => setTimeout(() => resolve(window.app), 250))
        await app.ready
        const { assets, shapes, currentPageId } = body
        // If the hapes were a direct child of their current page,
        // reparent them to the app's current page.
        shapes.forEach((shape) => {
          if (shape.parentId === currentPageId) {
            shape.parentId = app.currentPageId
          }
        })
        app.patchAssets(assets)
        app.createShapes(...shapes)
        app.selectAll()
        app.zoomToSelection()
        app.selectNone()
        const tlContainer = document.getElementsByClassName('tl-container').item(0) as HTMLElement
        if (tlContainer) {
          tlContainer.style.background = 'transparent'
        }
      } catch (e) {
        err = e.message
      }
    }, body)
    if (err) {
      throw err
    }
    const imageBuffer = await page.screenshot({
      type,
      omitBackground: true,
    })
    await browser.close()
    res.status(200).send(imageBuffer)
  } catch (err) {
    console.error(err.message)
    res.status(500).send(err)
  }
}

// Allow the server to support requests with up to 5mb of data.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
}
