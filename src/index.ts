import { Hono } from 'hono'
import { cache } from 'hono/cache'
import { cors } from 'hono/cors'

const app = new Hono()

app.use(
  '/rubyboy.wasm',
  cors({
    origin: '*',
    allowHeaders: [],
    allowMethods: ['GET'],
    exposeHeaders: [],
    maxAge: 600,
    credentials: false,
  })
)

app.get('/rubyboy.wasm',
  cache({
    cacheName: 'rubyboy',
    cacheControl: 'public, max-age=14400'
  }),
  async (_c) => {
    const response = await fetch('https://github.com/sacckey/rubyboy/releases/latest/download/rubyboy.wasm')

    // Clone the response to return a response with modifiable headers
    const newResponse = new Response(response.body, {
      headers: {
        'Content-Type': 'application/wasm',
      }
    })

    return newResponse
  }
)

export default app
