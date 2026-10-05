import { Hono } from 'hono'
import { cache } from 'hono/cache'
import { cors } from 'hono/cors'

const app = new Hono()

for (const filename of ['rubyboy.wasm', 'rubyboy-spinel.wasm']) {
  const path = `/${filename}`

  app.use(
    path,
    cors({
      origin: '*',
      allowHeaders: [],
      allowMethods: ['GET'],
      exposeHeaders: [],
      maxAge: 600,
      credentials: false,
    })
  )

  app.get(path,
    cache({
      cacheName: 'rubyboy',
      cacheControl: 'public, max-age=14400'
    }),
    async (_c) => {
      const response = await fetch(`https://github.com/sacckey/rubyboy/releases/latest/download/${filename}`)

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': 'application/wasm',
        }
      })
    }
  )
}

export default app
