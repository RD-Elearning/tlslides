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
        // "jsx": "preserve", which esbuild honours over jsxFactory/jsxFragment and
        // which would otherwise leave raw JSX in the bundle.
        tsconfig: './tsconfig.build.json',
        // The @tlslides/tldraw and @tlslides/core dist bundles ship un-transpiled JSX in
        // their .js/.mjs output (see guides/architecture.md); esbuild's default loader for
        // those extensions is plain JS, so it must be told to parse them as JSX too.
        loader: { '.js': 'jsx', '.mjs': 'jsx' },
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
