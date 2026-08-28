const path = require('path')

/**
 * No `transpilePackages` here — and that's the point of this example. Before Phase 9,
 * `@tlslides/tldraw`'s and `@tlslides/core`'s own `dist` output shipped raw, un-transpiled JSX
 * (esbuild inherited the workspace's `"jsx": "preserve"` tsconfig when building *those*
 * packages), so every Next.js consumer needed `transpilePackages: ['@tlslides/tldraw',
 * '@tlslides/core']` just to get webpack to parse the vendored JSX syntax at all — a real
 * adoption tax, and a footgun: miss it and you get a cryptic `Unexpected token '<'` at runtime,
 * not a build error. Phase 9 fixed it at the source (those two packages' own
 * `tsconfig.build.json`/`tsconfig.dev.json` now set `"jsx": "react"`), so their `dist` is now
 * plain `React.createElement(...)` calls — ordinary JavaScript Next's default webpack config
 * already knows how to bundle from `node_modules`. Verified by literally deleting the
 * `transpilePackages` line from this file and confirming `next build` and `next dev` both still
 * work end to end (`tools/visual/scenarios/nextjs.js`, `blocks.js`, `deckapi.js` all still pass).
 * A host still needs `transpilePackages` if it consumes a *pre-Phase-9* build of these packages,
 * or vendors its own `.tsx` source directly rather than the built `dist`.
 *
 * React 17 is hoisted at the workspace root and also vendored inside
 * `packages/tldraw/node_modules/react` (a peer-dependency-pinned copy). `@tlslides/tldraw` is
 * only ever loaded client-side here (see components/Editor.tsx, imported via `next/dynamic` with
 * `ssr: false`), so only the CLIENT webpack compilation can pull in that vendored React 17 copy
 * — hence the alias below. Without it, the browser bundle would end up with two React copies
 * loaded at once, and hooks break ("Invalid hook call", "Cannot read properties of null (reading
 * 'useContext')").
 *
 * The alias is scoped to `!isServer` deliberately: applying it to the server compilation too
 * breaks Next's internal React Server Components / SSR module layering (which relies on
 * conditional exports to pick different `react` builds per layer) and makes even the
 * framework-generated `/_not-found` page fail to prerender with the same "useContext on null"
 * error this alias is meant to prevent. The server compiler never needs this fix here because it
 * never requires `@tlslides/tldraw`.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // On, as any real Next.js app would have it. This used to have to be off: StrictMode
  // double-invokes the `useState(() => new TldrawApp(...))` initializer in Tldraw.tsx, so two
  // apps get constructed while React retains one, and both reached onMount — leaving a captured
  // ref bound to a detached store whose mutations never showed up on the canvas. Tldraw.tsx now
  // fires onMount from an effect, which only runs for the retained instance.
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
      }
    }
    return config
  },
}

module.exports = nextConfig
