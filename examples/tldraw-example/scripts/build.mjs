/* eslint-disable */
import fs from 'fs'
import path from 'path'
import esbuild from 'esbuild'
import { createRequire } from 'module'

const pkg = createRequire(import.meta.url)('../package.json')

const { log: jslog } = console

async function main() {
  try {
    esbuild.buildSync({
      entryPoints: ['./src/index.tsx'],
      outfile: 'dist/index.js',
      minify: false,
      bundle: true,
      format: 'cjs',
      target: 'es6',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      // tsconfig.build.json exists only to override tsconfig.base.json's
      // "jsx": "preserve" for THIS example's own src/*.tsx, which esbuild honours over
      // jsxFactory/jsxFragment and which would otherwise leave raw JSX in the bundle.
      tsconfig: './tsconfig.build.json',
      // No `.js`/`.mjs` loader override here any more — see the equivalent comment in
      // scripts/dev.mjs. Since Phase 9, @tlslides/tldraw's and @tlslides/core's own dist
      // output is pre-transpiled (plain React.createElement calls, no raw JSX), so esbuild's
      // default 'js' loader parses it without help.
      define: {
        'process.env.NODE_ENV': '"production"',
        'process.env.LIVEBLOCKS_PUBLIC_API_KEY': `"${process.env.LIVEBLOCKS_PUBLIC_API_KEY}"`,
      },
      metafile: false,
      sourcemap: false,
    })

    fs.readdirSync('./src/public').forEach((file) =>
      fs.copyFile(path.join('./src/public', file), path.join('./dist', file), (err) => {
        if (err) throw err
      })
    )
    jslog(`✔ ${pkg.name}: Build completed.`)
  } catch (e) {
    jslog(`× ${pkg.name}: Build failed due to an error.`)
    jslog(e)
  }
}

main()
