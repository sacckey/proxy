# Rubyboy Wasm proxy

Serve the latest GitHub Release assets at `/rubyboy.wasm` and
`/rubyboy-spinel.wasm`, with browser CORS headers and a four-hour cache.

## Setup

Install [mise](https://mise.jdx.dev/) first. Node 24.21.0 LTS and pnpm 12.9.1
are pinned in `mise.toml` and `package.json`. Use pnpm with the committed
lockfile to reproduce the dependency versions.

```sh
mise install
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm run dev
```

## Verify

```sh
mise exec -- pnpm run typecheck
mise exec -- pnpm test
mise exec -- pnpm run build
```

The build command creates a local bundle under `dist/` using Wrangler's
`--dry-run`; it does not deploy. The tests cover both asset paths, CORS,
cache separation and hits, and upstream error responses.

## Deploy

After verification, sign in to the intended Cloudflare account and deploy:

```sh
mise exec -- pnpm exec wrangler login
mise exec -- pnpm run deploy
```

Deployment remains manual. Updating GitHub Release assets does not require
redeploying the Worker. Runtime compatibility remains pinned separately by
`compatibility_date` in `wrangler.toml`.
