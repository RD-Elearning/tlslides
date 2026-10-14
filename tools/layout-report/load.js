/**
 * Load the layout oracle (`@tlslides/tldraw` blocks API) in plain Node — no browser, no jest.
 *
 * Default: bundle `packages/tldraw/src/blocks/index.ts` in memory with the repo's own esbuild
 * (the one `lask` builds the package with) and `tsconfig.build.json` (path aliases + `jsx: react`),
 * so the CLI always runs the current source (~0.3 s). `{ dist: true }`: the built package
 * (`packages/tldraw/dist/index.js`, what a Next.js route imports) — run `build:packages` first.
 */
const fs = require('fs')
const path = require('path')
const Module = require('module')

const ROOT = path.resolve(__dirname, '../..')
const PKG = path.join(ROOT, 'packages/tldraw')

function loadOracle(opts = {}) {
  if (opts.dist) {
    const dist = path.join(PKG, 'dist/index.js')
    if (!fs.existsSync(dist)) throw new Error(`${dist} missing: run node_modules/.bin/turbo run build:packages`)
    return require(dist)
  }
  const esbuild = require(require.resolve('esbuild', { paths: [ROOT, PKG] }))
  const result = esbuild.buildSync({
    entryPoints: [path.join(PKG, 'src/blocks/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node16',
    write: false,
    tsconfig: path.join(PKG, 'tsconfig.build.json'),
    external: ['react', 'react-dom'],
    logLevel: 'error',
  })
  // Compile as if it lived in the package, so `react` resolves from its node_modules.
  const filename = path.join(PKG, 'src/blocks/__oracle-bundle.js')
  const m = new Module(filename, module)
  m.filename = filename
  m.paths = Module._nodeModulePaths(path.dirname(filename))
  m._compile(result.outputFiles[0].text, filename)
  return m.exports
}

module.exports = { loadOracle, ROOT, PKG }
