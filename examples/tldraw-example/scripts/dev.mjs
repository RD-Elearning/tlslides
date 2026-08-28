/* eslint-disable no-undef */
import fs from 'fs'
import path from 'path'
import esbuildServe from 'esbuild-serve'
import dotenv from 'dotenv'

dotenv.config()

const { log: jslog, error } = console

async function main() {
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true }, (e) => {
      if (e) {
        throw e
      }
    })
  }

  fs.mkdirSync('./dist')

  fs.readdirSync('./src/public').forEach((file) =>
    fs.copyFile(path.join('./src/public', file), path.join('./dist', file), (err) => {
      if (err) throw err
    })
  )

  try {
    await esbuildServe(
      {
        entryPoints: ['src/index.tsx'],
        outfile: 'dist/index.js',
        minify: false,
        bundle: true,
        sourcemap: true,
        incremental: true,
        format: 'cjs',
        target: 'es6',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        // tsconfig.build.json exists only to override tsconfig.base.json's
        // "jsx": "preserve" for THIS example's own src/*.tsx, which esbuild honours over
        // jsxFactory/jsxFragment and which would otherwise leave raw JSX in the bundle.
        tsconfig: './tsconfig.build.json',
        // No `.js`/`.mjs` loader override here any more. Before Phase 9, @tlslides/tldraw and
        // @tlslides/core's own dist bundles shipped un-transpiled JSX (see
        // guides/architecture.md), and esbuild's default loader for those extensions is plain
        // JS — so consuming them required forcing `loader: { '.js': 'jsx', '.mjs': 'jsx' }`
        // just to get esbuild to parse the vendored JSX syntax at all. Phase 9 fixed this at
        // the source (packages/tldraw and packages/core's own tsconfig.build.json/
        // tsconfig.dev.json now set "jsx": "react"), so their dist output is plain
        // React.createElement(...) calls and needs no special loader.
        define: {
          'process.env.NODE_ENV': '"development"',
          'process.env.LIVEBLOCKS_PUBLIC_API_KEY': `"${process.env.LIVEBLOCKS_PUBLIC_API_KEY}"`,
        },
        watch: {
          onRebuild(err) {
            err ? error('❌ Failed') : jslog('✅ Updated')
          },
        },
      },
      {
        port: 5420,
        root: './dist',
        live: true,
      }
    )
  } catch (err) {
    process.exit(1)
  }
}

main()
