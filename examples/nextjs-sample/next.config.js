const path = require('path')

/**
 * React 17 is hoisted at the workspace root and also vendored inside
 * `packages/tldraw/node_modules/react` (a peer-dependency-pinned copy). `@tlslides/tldraw` is
 * only ever loaded client-side here (see components/Editor.tsx, imported via `next/dynamic` with
 * `ssr: false`), so only the CLIENT webpack compilation can pull in that vendored React 17 copy
 * through `transpilePackages`. Without the alias below, the browser bundle would end up with two
 * React copies loaded at once, and hooks break ("Invalid hook call", "Cannot read properties of
 * null (reading 'useContext')").
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
  transpilePackages: ['@tlslides/tldraw', '@tlslides/core'],
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
