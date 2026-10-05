import assert from 'node:assert/strict'
import test from 'node:test'

const filenames = ['rubyboy.wasm', 'rubyboy-spinel.wasm']
const origin = 'https://rubyboy.example'

async function fixture(t, upstreamStatus = 200) {
  const entries = new Map()
  const fetched = []
  const pending = []
  const previousCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
  const cacheKey = (key) => typeof key === 'string' ? key : key.url
  globalThis.caches = {
    async open() {
      return {
        async match(key) { return entries.get(cacheKey(key))?.clone() },
        async put(key, response) { entries.set(cacheKey(key), response.clone()) },
      }
    },
  }
  t.after(() => {
    if (previousCaches) Object.defineProperty(globalThis, 'caches', previousCaches)
    else delete globalThis.caches
  })
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = String(input)
    fetched.push(url)
    return upstreamStatus === 200
      ? new Response(Uint8Array.of(0, 97, 115, 109, url.endsWith('rubyboy-spinel.wasm') ? 2 : 1))
      : new Response('missing release asset', { status: upstreamStatus, statusText: 'Not Found' })
  })
  const { default: app } = await import('../src/index.ts')
  const context = { waitUntil(promise) { pending.push(promise) }, passThroughOnException() {} }
  async function request(path, options = {}) {
    const response = await app.fetch(new Request(`https://proxy.example${path}`, options), {}, context)
    await Promise.all(pending.splice(0))
    return response
  }
  return { entries, fetched, request }
}

test('both Wasm routes preserve bytes and cache independently for four hours', async (t) => {
  const { entries, fetched, request } = await fixture(t)
  for (const [index, filename] of filenames.entries()) {
    const expected = Uint8Array.of(0, 97, 115, 109, index + 1)
    const response = await request(`/${filename}`, { headers: { Origin: origin } })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Type'), 'application/wasm')
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*')
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=14400')
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), expected)
    assert.equal(fetched.at(-1), `https://github.com/sacckey/rubyboy/releases/latest/download/${filename}`)
    const fetchCount = fetched.length
    const cached = await request(`/${filename}`, { headers: { Origin: origin } })
    assert.equal(cached.headers.get('Access-Control-Allow-Origin'), '*')
    assert.deepEqual(new Uint8Array(await cached.arrayBuffer()), expected)
    assert.equal(fetched.length, fetchCount)
  }
  assert.equal(entries.size, 2)
})

test('both Wasm routes answer browser preflight without fetching GitHub', async (t) => {
  const { fetched, request } = await fixture(t)
  for (const filename of filenames) {
    const response = await request(`/${filename}`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' },
    })
    assert.equal(response.status, 204)
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*')
    assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'GET')
    assert.equal(response.headers.get('Access-Control-Max-Age'), '600')
  }
  assert.equal(fetched.length, 0)
})

test('missing release assets retain their status and are not cached; unknown paths stay local', async (t) => {
  const { entries, fetched, request } = await fixture(t, 404)
  for (const filename of filenames) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await request(`/${filename}`, { headers: { Origin: origin } })
      assert.equal(response.status, 404)
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*')
      assert.equal(await response.text(), 'missing release asset')
    }
  }
  assert.equal(fetched.length, 4)
  assert.equal(entries.size, 0)
  assert.equal((await request('/unrelated.wasm')).status, 404)
  assert.equal(fetched.length, 4)
})
