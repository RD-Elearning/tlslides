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
      // "jsx": "preserve", which esbuild honours over jsxFactory/jsxFragment and
      // which would otherwise leave raw JSX in the bundle.
      tsconfig: './tsconfig.build.json',
      // The @tlslides/tldraw and @tlslides/core dist bundles ship un-transpiled JSX in their
      // .js/.mjs output (see guides/architecture.md); esbuild's default loader for those
      // extensions is plain JS, so it must be told to parse them as JSX too.
      loader: { '.js': 'jsx', '.mjs': 'jsx' },
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
