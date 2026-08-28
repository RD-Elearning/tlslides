/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')

// Playwright is intentionally NOT a dependency of this repo: it would drag a browser download
// into a 2021-era dependency tree we are trying not to disturb. Instead we reuse an existing
// installation. Point PLAYWRIGHT_PATH at any playwright package to override.
const CANDIDATES = [
  process.env.PLAYWRIGHT_PATH,
  '/home/bachx/workspace/taumi-fms/frontend/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright',
  'playwright',
].filter(Boolean)

function loadPlaywright() {
  for (const candidate of CANDIDATES) {
    try {
      if (candidate.startsWith('/') && !fs.existsSync(candidate)) continue
      return require(candidate)
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') throw err
    }
  }
  throw new Error(
    `Could not load playwright. Tried:\n  ${CANDIDATES.join('\n  ')}\nSet PLAYWRIGHT_PATH to a playwright installation.`
  )
}

module.exports = { loadPlaywright }
