const assert = require("node:assert/strict")
const test = require("node:test")
const { setTimeout: wait } = require("node:timers/promises")
const { createServer } = require("./server")
const { PERMIT_URL, evaluatePermitPage } = require("./solari-service")

const goodPage = {
  finalUrl: PERMIT_URL,
  title: "Food Service Establishment Permit - NYC Business",
  text: `
    Food Service Establishment Permit
    Bring a Certificate of Authority to Collect Sales Tax.
    A Food Protection Certificate is required for the manager.
    Show proof of workers' compensation and disability insurance.
    Give a valid email address for city notices.
  `
}

test("a healthy city page returns found for every need, with evidence", () => {
  const result = evaluatePermitPage(goodPage)

  assert.equal(result.pageVerified, true)
  assert.deepEqual(result.reasons, [])
  for (const [key, check] of Object.entries(result.checks)) {
    assert.equal(check.status, "found", `${key} should be found`)
    assert.equal(typeof check.evidence, "string")
  }
  assert.match(result.checks.salesTax.evidence, /Certificate of Authority/i)
})

test("a single dropped requirement reads as missing, not unknown", () => {
  const text = goodPage.text.replace(/Show proof of workers.+\n/, "")
  const result = evaluatePermitPage({ ...goodPage, text })

  assert.equal(result.pageVerified, true)
  assert.equal(result.checks.insurance.status, "missing")
  assert.equal(result.checks.insurance.evidence, null)
  assert.equal(result.checks.salesTax.status, "found")
})

test("a redirect to another address fails closed to unknown", () => {
  const result = evaluatePermitPage({ ...goodPage, finalUrl: "https://nyc-business.nyc.gov/nycbusiness/somewhere-else" })

  assert.equal(result.pageVerified, false)
  assert.ok(result.reasons.some(reason => /different address/.test(reason)))
  for (const check of Object.values(result.checks)) {
    assert.equal(check.status, "unknown")
    assert.equal(check.evidence, null)
  }
})

test("query strings and trailing slashes on the same page are fine", () => {
  const result = evaluatePermitPage({ ...goodPage, finalUrl: `${PERMIT_URL}/?utm_source=civra#top` })
  assert.equal(result.pageVerified, true)
})

test("an unexpected page title fails closed to unknown", () => {
  const result = evaluatePermitPage({ ...goodPage, title: "Page not found" })

  assert.equal(result.pageVerified, false)
  assert.ok(Object.values(result.checks).every(check => check.status === "unknown"))
})

test("a rewritten page with most phrases gone fails closed to unknown", () => {
  const result = evaluatePermitPage({
    ...goodPage,
    text: "Food Service Establishment Permit. This permit page is being updated. Give a valid email address."
  })

  assert.equal(result.pageVerified, false)
  assert.ok(result.reasons.some(reason => /likely changed/.test(reason)))
  assert.equal(result.checks.email.status, "unknown")
})

async function withServer(run, options) {
  const server = createServer(options)
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  try {
    const address = server.address()
    await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

async function withApiKey(run) {
  const savedKey = process.env.SOLARI_API_KEY
  process.env.SOLARI_API_KEY = "slr_test_key"
  try {
    await run()
  } finally {
    if (savedKey === undefined) delete process.env.SOLARI_API_KEY
    else process.env.SOLARI_API_KEY = savedKey
  }
}

test("the server returns the app with strong browser headers", () => withServer(async base => {
  const response = await fetch(`${base}/`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get("content-security-policy"), /default-src 'self'/)
  assert.equal(response.headers.get("x-content-type-options"), "nosniff")
  assert.equal(response.headers.get("x-frame-options"), "DENY")
  assert.equal(response.headers.get("cache-control"), "no-store")
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

test("a second request is served from cache without a new paid check", () => withApiKey(() => {
  let calls = 0
  const runCheck = async () => {
    calls += 1
    return { pageVerified: true, reasons: [], checks: {} }
  }

  return withServer(async base => {
    const first = await fetch(`${base}/api/permit-check`, { method: "POST" })
    assert.equal(first.status, 200)
    assert.equal((await first.json()).fromCache, false)

    const second = await fetch(`${base}/api/permit-check`, { method: "POST" })
    assert.equal(second.status, 200)
    assert.equal((await second.json()).fromCache, true)

    assert.equal(calls, 1)
  }, { runCheck })
}))

test("concurrent requests share one live check instead of two launches", () => withApiKey(() => {
  let calls = 0
  const runCheck = async () => {
    calls += 1
    await wait(30)
    return { pageVerified: true, reasons: [], checks: {} }
  }

  return withServer(async base => {
    const [first, second] = await Promise.all([
      fetch(`${base}/api/permit-check`, { method: "POST" }),
      fetch(`${base}/api/permit-check`, { method: "POST" })
    ])
    assert.equal(first.status, 200)
    assert.equal(second.status, 200)
    assert.equal(calls, 1)
  }, { runCheck })
}))

test("a failed check answers 502 and then cools down with 429", () => withApiKey(() => {
  let calls = 0
  const runCheck = async () => {
    calls += 1
    throw new Error("solari unreachable")
  }

  return withServer(async base => {
    const failed = await fetch(`${base}/api/permit-check`, { method: "POST" })
    assert.equal(failed.status, 502)
    assert.equal((await failed.json()).code, "PERMIT_CHECK_FAILED")

    const throttled = await fetch(`${base}/api/permit-check`, { method: "POST" })
    assert.equal(throttled.status, 429)
    assert.equal((await throttled.json()).code, "CHECK_COOLDOWN")
    assert.ok(Number(throttled.headers.get("retry-after")) >= 1)

    assert.equal(calls, 1)
  }, { runCheck, cooldownMs: 60000 })
}))

test("after the cooldown passes, the check is allowed to run again", () => withApiKey(() => {
  let calls = 0
  const runCheck = async () => {
    calls += 1
    if (calls === 1) throw new Error("first try fails")
    return { pageVerified: true, reasons: [], checks: {} }
  }

  return withServer(async base => {
    assert.equal((await fetch(`${base}/api/permit-check`, { method: "POST" })).status, 502)
    const retried = await fetch(`${base}/api/permit-check`, { method: "POST" })
    assert.equal(retried.status, 200)
    assert.equal(calls, 2)
  }, { runCheck, cooldownMs: 0 })
}))
