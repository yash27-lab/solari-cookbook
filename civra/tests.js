const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")
const { createServer } = require("./server")
const { extractChecks } = require("./solari-service")

const html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8")
const script = fs.readFileSync(path.join(__dirname, "public", "app.js"), "utf8")

test("the product copy explains the flow and safety rules", () => {
  assert.match(html, /Civra never sends or pays without you/)
  assert.match(html, /THE PROBLEM/)
  assert.match(html, /OUR ANSWER/)
  assert.match(html, /MADE WITH SOLARI/)
  assert.match(html, /Step 1 of 6/)
  assert.match(html, /SAFETY FIRST/)
  assert.match(script, /tourSteps/)
  assert.match(script, /No hidden send/)
  assert.match(script, /allowedFileTypes/)
  assert.match(script, /\/api\/permit-check/)
})

test("the city page text is turned into fixed permit checks", () => {
  const checks = extractChecks(`
    Certificate of Authority to Collect Sales Tax
    Food Protection Certificate
    Valid email address
  `)

  assert.deepEqual(checks, {
    salesTax: true,
    foodProtection: true,
    insurance: false,
    email: true
  })
})

async function withServer(run) {
  const server = createServer()
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  try {
    const address = server.address()
    await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

test("the server returns the app with strong browser headers", () => withServer(async base => {
  const response = await fetch(`${base}/`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get("content-security-policy"), /default-src 'self'/)
  assert.equal(response.headers.get("x-content-type-options"), "nosniff")
  assert.equal(response.headers.get("x-frame-options"), "DENY")
  assert.match(await response.text(), /Civra/)
}))

test("the health check is ready and does not cache", () => withServer(async base => {
  const response = await fetch(`${base}/api/health`)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("cache-control"), "no-store")
  assert.deepEqual(await response.json(), { name: "civra", status: "ready" })
}))

test("the live check fails safely when the server key is missing", async () => {
  const savedKey = process.env.SOLARI_API_KEY
  delete process.env.SOLARI_API_KEY
  try {
    await withServer(async base => {
      const response = await fetch(`${base}/api/permit-check`, { method: "POST" })
      assert.equal(response.status, 503)
      assert.equal((await response.json()).code, "SOLARI_KEY_MISSING")
    })
  } finally {
    if (savedKey) process.env.SOLARI_API_KEY = savedKey
  }
})

test("unknown files and unsafe methods are rejected", () => withServer(async base => {
  assert.equal((await fetch(`${base}/missing.txt`)).status, 404)
  assert.equal((await fetch(`${base}/`, { method: "POST" })).status, 405)
}))
